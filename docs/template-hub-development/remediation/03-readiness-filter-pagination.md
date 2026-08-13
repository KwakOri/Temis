# 03. readiness 필터 1,000건 상한 제거

- 우선순위: P2
- 상태: 완료 (2026-07-16)
- 영향 영역: 판매 준비 완료·판매 불가·상품 미구성 필터와 페이지네이션

## 문제

`saleStatus=ready|blocked|unconfigured`는 로열티를 포함한 readiness 계산이 필요해
현재 서버가 필터 적용 전 최대 1,000건을 읽는다.

```ts
const READINESS_FILTER_SCAN_LIMIT = 1000;
```

그 후 메모리에서 상태를 계산하고 필터링한 배열 길이를 `pagination.total`로
반환한다. 대상 템플릿이 1,000건을 넘으면 1,001번째 이후 행은 검색 대상에서
사라지고, 전체 건수와 마지막 페이지도 실제보다 작게 표시된다. API는 잘림을
알리지 않아 운영자가 누락을 발견하기 어렵다.

현재 로컬 복제 DB는 82건이라 문제가 재현되지 않지만, 데이터 증가에 따라 반드시
발생하는 구조적 한계다.

## 수정 방향

최종 권장안은 readiness를 DB가 계산하고 필터·count·pagination을 SQL에서 처리하는
것이다.

가능한 구현 방식:

1. Hub 목록 전용 SQL 함수에서 `exists` 조건으로 상품·plan·작가·로열티를 판정
2. 판매 상태를 반환하는 view 또는 안정된 SQL expression 구성
3. 계산 결과에 `where`, `count(*) over()`, `order by updated_at, id`, `limit/offset`
   적용

readiness 사유 배열까지 SQL에서 만들지 여부는 별도 선택이 가능하다. 최소한 필터
대상 ID와 전체 건수는 DB에서 정확하게 계산하고, 현재 TypeScript 순수 함수는 반환된
페이지의 상세 사유를 만드는 데 재사용할 수 있다.

단기적으로 chunk scan을 반복하는 방법도 있지만, 매 요청마다 전체 후보를 읽는 비용과
일관성 문제가 남으므로 6단계 정식 전환 전 장기 해법으로 사용하지 않는 것을 권장한다.

## 완료 조건

- 후보 데이터가 1,000건을 넘어도 모든 readiness 상태가 필터 대상에 포함된다.
- `pagination.total`이 직접 DB 집계와 일치한다.
- 정렬 기준 `updated_at DESC, id DESC`가 유지된다.
- 마지막 부분 페이지와 범위 밖 offset이 올바르게 동작한다.
- 검색·엔진·게시·판매 유형·상품 필터를 함께 사용해도 결과가 정확하다.
- 요청당 데이터 전송량이 후보 전체 크기에 비례해 증가하지 않는다.

## 검증

- 최소 1,205건의 synthetic 템플릿을 로컬 DB에 생성해 상태별 결과를 대조한다.
- 첫 페이지, 50번째 페이지, 마지막 페이지, 범위 밖 offset을 확인한다.
- SQL 직접 집계와 API `pagination.total`을 비교한다.
- 테스트 후 synthetic 데이터가 전부 정리됐는지 확인한다.

## 완료 근거 (2026-07-16)

- 신규 migration
  `supabase/migrations/20260716030000_create_template_hub_list_view.sql`에
  두 단계 view를 추가했다.
  - `template_hub_readiness`: `evaluateTemplateSaleReadiness()`와 동일한
    조건(게시·일반판매·상품·plan·작가·로열티)을 SQL로 재구성해 템플릿별
    `is_ready`/`has_product`/`is_shop_visible`을 계산한다.
  - `template_hub_list`: `resolveTemplateSaleStatus()`와 동일한 우선순위로
    `sale_status`(selling/ready/blocked/unconfigured)를 계산한다.
  - 두 view 모두 `anon`/`authenticated`/`PUBLIC` 권한은 회수하고
    `service_role`에만 `SELECT`를 부여했다.
- `src/services/server/templateHubService.ts`를 다시 짰다.
  `READINESS_FILTER_SCAN_LIMIT`(1,000건 상한), `needsReadinessScan`,
  `needsShopTemplateInnerJoin`, 애플리케이션 메모리 필터링을 전부 제거하고,
  `template_hub_list` view에 모든 필터(`search`/`engine`/`publicationStatus`/
  `salesType`/`saleStatus`/`hasProduct`)와 `order`/`range`/`count: "exact"`를
  그대로 위임하는 `fetchListPage()`로 대체했다. 현재 페이지의 id만 다시
  `templates`에서 관계 데이터(shop_templates/template_plans/template_artists)와
  함께 조회해(`fetchRowsByIds()`) 기존 `buildItems()`(로열티 coverage 포함)로
  아이템을 만든다 — 요청당 읽는 행 수는 항상 페이지 크기에 비례하고, 전체
  후보 크기에는 비례하지 않는다.
- 이 작업 중 기존에 잠재해 있던 별도 버그를 발견해 함께 고쳤다: offset이
  전체 결과 건수를 넘으면 PostgREST가 데이터를 비워 반환하는 대신
  `PGRST103`("Requested range not satisfiable")을 던져 API가 500을
  반환했다(신규 SQL 기반 페이지네이션에서만이 아니라 `.range()`를 쓰는 모든
  경로에 해당하는 문제). `fetchListPage()`가 이 코드를 감지하면 빈 페이지로
  처리하고, `total`만 별도 `count`-only 쿼리로 다시 구하도록 했다
  (`countListPage()`).
- 신규 스크립트 `scripts/check-template-hub-readiness-scale.ts`
  (`npm run check:template-hub:readiness-scale`)를 추가했다. `[hub-scale-qa]`
  접두사로 unconfigured 1,205건 + ready/blocked/selling 표본 8건, 총 1,213건을
  생성한 뒤:
  - `saleStatus=unconfigured`의 `pagination.total`이 DB 직접 집계(1,205)와
    일치(옛 1,000건 상한이 남아 있으면 이 값이 작아진다).
  - ready/blocked/selling 총 건수도 정확.
  - 첫 페이지, offset=1020(52번째 페이지, 옛 1,000건 상한을 넘는 지점),
    마지막 페이지(나머지 5건), 범위 밖 offset(빈 배열이지만 total 유지)이
    모두 올바르게 동작.
  - `search` + `saleStatus` 결합 결과도 정확.
  - finally에서 이름 접두사로 전체 fixture를 정리하고, 정리 후 잔여 0건을
    재확인. (대량 삭제를 id 목록 `in(...)` 쿼리로 보내면 URI 길이 제한에
    걸려, 접두사 기준 단일 delete로 처리하도록 만들었다.)
  - 실행 비용이 커서(1,200여 건 insert/delete) 상시 CI에는 넣지 않고 수동/
    주기적 검증 스크립트로 유지한다. `npm run check:template-hub:api`(30건)는
    그대로 CI([remediation 02](./02-ci-and-hub-regression.md))에 남는다.
- 로컬 Supabase에서 실행 결과: `check:template-hub:readiness-scale` 7건 전체
  통과, `check:template-hub:api` 30건 전체 통과(기존 표본 회귀 없음),
  `check:template-hub:sale-readiness` 22건 통과, 매번 fixture 0건 잔여.
- `npx tsc --noEmit --pretty false --incremental false`, 변경 파일 ESLint,
  안전한 CI 값을 주입한 `npm run build` 모두 통과.
- 원격 Supabase에는 적용하지 않았다. 기존 관리 탭 코드는 변경하지 않았다.
