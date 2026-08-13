# 05. API 테스트 fixture의 실패 안전 정리

- 우선순위: P2
- 상태: 완료 (2026-07-16)
- 영향 영역: `check:template-hub:api`, 로컬 복제 DB 청결성

## 문제

`createFixtures()`는 내부 로컬 변수에 생성된 템플릿 ID를 기록하고 모든 fixture가
성공한 뒤에만 그 객체를 반환한다. 호출부는 반환값을 받은 다음 외부 `fixtures`에
할당한다.

fixture 5개 중 2번째 이후 insert가 실패하면 다음 상태가 된다.

```text
DB: 앞에서 생성된 fixture가 존재
createFixtures(): reject
호출부 fixtures: 여전히 빈 객체
finally: 삭제할 ID가 없다고 판단
```

결과적으로 실패한 테스트가 로컬 복제 DB에 `[hub-qa]` 데이터를 남길 수 있다.
이후 목록 count와 다른 테스트 결과도 오염된다.

## 수정 방향

생성된 ID를 성공 즉시 호출부와 공유되는 registry에 기록한다.

권장 형태:

```text
const fixtureRegistry = new Map()
try {
  await createFixtures(fixtureRegistry)
  await runChecks()
} finally {
  await deleteFixtures(fixtureRegistry)
}
```

추가로 다음을 적용한다.

- fixture 이름에 실행별 고유 suffix를 사용해 병렬 실행 충돌 방지
- 정리는 추적된 ID를 기준으로 수행
- 정리 실패 시 ID를 명확히 출력하고 process exit code를 실패로 유지
- 테스트 시작 전 같은 실행 ID의 잔여물이 없는지 확인
- 가능하다면 fixture 생성 자체를 DB 트랜잭션에 넣고 테스트 종료 시 rollback

현재 non-local Supabase URL 실행 거부는 그대로 유지한다.

## 완료 조건

- 어느 insert 단계에서 실패해도 앞서 생성된 fixture가 삭제된다.
- assertion 실패와 route 예외에서도 정리가 실행된다.
- 테스트를 병렬 또는 연속 실행해도 fixture가 충돌하지 않는다.
- 정리 실패는 성공 메시지로 덮이지 않고 테스트 실패로 보고된다.
- 테스트 종료 후 `[hub-qa]` 템플릿 수가 실행 전과 같다.

## 검증

- fixture 생성 2번째, 상품 생성, plan 생성, 작가 연결 단계에 각각 강제 실패를
  주입한다.
- 각 실패 직후 `templates`, `shop_templates`, `template_plans`,
  `template_artists`, 템플릿 전용 `artist_royalty_rules` 잔여물을 확인한다.
- 정상 경로에서도 전체 템플릿 수가 실행 전 값으로 복원되는지 확인한다.

## 완료 근거 (2026-07-16)

- `scripts/check-template-hub-api.ts`를 문서의 권장 형태로 고쳤다.
  - `trackedTemplateIds`(Set) registry를 도입해, `createFixtures()`와
    `createConcurrencyFixture()` 양쪽에서 템플릿 insert가 성공하는 즉시(상품/
    plan/작가 연결 같은 후속 단계보다 먼저) id를 기록한다. 정리는 이 registry
    를 기준으로 수행해, 어느 단계에서 실패해도 이미 만들어진 앞쪽 fixture가
    삭제 대상에서 빠지지 않는다.
  - `FIXTURE_PREFIX`에 실행마다 `crypto.randomUUID()` 기반 고유 접미사
    (`[hub-qa-<8자>]`)를 붙여 병렬/연속 실행이 서로의 fixture와 충돌하지
    않게 했다.
  - 정리 실패는 대상 id를 명시적으로 콘솔에 출력한 뒤 다시 throw해 프로세스
    종료 코드를 실패로 유지한다. 원래 테스트 실패와 정리 실패가 동시에
    발생해도 원래 실패 내용이 정리 실패로 덮이지 않도록
    `try { 테스트 } catch { testError 기록 후 rethrow } finally { 정리 실패
    시 testError가 없을 때만 rethrow }` 구조로 정리했다.
  - 실행 시작 전 이전 실행이 정리하지 못한 `[hub-qa-*]` 잔여물이 있는지
    확인하고, 있으면 경고를 남긴다(`assertNoResidueFromPriorRuns`).
  - non-local Supabase URL 거부(`assertLocalSupabaseUrl`)는 그대로 유지했다.
  - fixture 생성 자체를 DB 트랜잭션으로 묶어 rollback하는 방식은 적용하지
    않았다 — PostgREST(REST API) 기반 클라이언트로는 여러 insert를 하나의
    트랜잭션으로 묶을 수 없고(요청마다 독립 트랜잭션), 이를 위해 별도 raw
    SQL 커넥션 경로를 추가하는 것은 이 항목의 문서가 "가능하다면"으로 표시한
    선택 사항이라 registry 기반 정리만으로 완료 조건을 충족한다고 판단했다.
- 검증을 위해 임시 스크립트(커밋하지 않음)로 `createFixtures()`와 동일한
  registry 패턴을 축소 재현해, "2번째 fixture 생성", "상품 생성", "plan
  생성", "작가 연결" 4개 지점에 각각 강제 실패를 주입했다. 4개 지점 모두
  강제 실패가 실제로 발생했음에도 `templates` 잔여물이 0건임을 확인한 뒤
  스크립트를 삭제했다.
- `check-template-hub-api.ts`를 동시에 두 프로세스로 병렬 실행해 각자 고유한
  `RUN_ID` 접두사로 서로 다른 fixture 집합을 만들고, 둘 다 30건 전체 통과 및
  fixture 완전 정리를 확인했다(병렬 실행 충돌 없음).
- 정상 경로 재실행 결과: `npm run check:template-hub:api` 30건 통과, 실행 전후
  `[hub-qa` 접두사 템플릿 수가 0건으로 동일.
- `npx tsc --noEmit --pretty false --incremental false`, 변경 파일 ESLint
  모두 통과.
- 기존 관리 탭 코드와 원격 Supabase는 변경하지 않았다.
