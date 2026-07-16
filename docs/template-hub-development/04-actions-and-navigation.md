# 04. 운영 액션과 화면 연결

상태: 완료 (2026-07-16)  
선행 단계: 03. 판매 준비 상태와 서버 규칙

## 1. 목표

읽기 전용 Hub에 엔진별 이동, 상품 편집, 판매 유형 변경, 판매 시작·중지 액션을
추가한다.

기존 두 탭의 handler를 복사하거나 수정하지 않는다. Hub 전용 API와 03단계의
서버 readiness 판정을 사용한다.

## 2. 행 액션

### Studio

- 편집: `/admin/template-studio/[templateId]/edit`
- 관리자 미리보기: `/admin/template-studio/[templateId]/preview`
- 상품 정보: `/admin/template-products/[templateId]`
- ID 복사

### Legacy

- 실행: `/time-table/[templateId]`
- 상품 정보: `/admin/template-products/[templateId]`
- ID 복사

### 공통 운영 액션

- 일반 판매로 변경
- 맞춤 제작으로 변경
- 판매 시작
- 판매 중지

Beta 범위에서는 영구 삭제를 제공하지 않는다.

## 3. 신규 생성

Hub의 "새 템플릿"은 `/admin/template-studio/create`로 이동한다.

신규 제작을 Studio로만 단일화한다는 제품 결정이 확정되기 전까지 기존
`TemplateManagement.tsx`의 Legacy 생성 기능은 제거하거나 숨기지 않는다.

## 4. Hub mutation API

### 판매 유형 변경

```text
PATCH /api/admin/template-hub/templates/{templateId}/sales-type
```

요청:

```json
{ "salesType": "general" }
```

또는:

```json
{ "salesType": "custom" }
```

서버 동작:

- 관리자 인증
- 템플릿 존재 확인
- `general` → `templates.is_public=true`
- `custom` → `templates.is_public=false`
- 판매 중 `custom` 전환은 `409 SALE_MUST_STOP_FIRST`
- 성공 후 갱신된 Hub item 반환

### 판매 시작·중지

```text
PATCH /api/admin/template-hub/templates/{templateId}/sale
```

요청:

```json
{ "visible": true }
```

서버 동작:

- `visible=true`: readiness를 다시 계산하고 `ready=true`일 때만
  `shop_templates.is_shop_visible=true`
- `visible=false`: readiness와 무관하게 판매 중지
- 성공 후 갱신된 Hub item 반환

Hub route는 기존 route handler를 HTTP로 다시 호출하지 않는다. 03단계의 server
service를 재사용하고 동일한 canonical 테이블을 업데이트한다.

## 5. UI 동작

### 일반 판매로 변경

- 현재 맞춤 제작인 경우에만 표시
- 변경 후 상품 편집 CTA 표시
- 상품이 없으면 판매 시작 버튼은 비활성

### 맞춤 제작으로 변경

- 판매 중이면 비활성 처리하고 "판매를 먼저 중지해 주세요" 표시
- 상품·plan을 자동 삭제하지 않음
- 기존 상품 데이터는 향후 다시 일반 판매로 전환할 때 재사용 가능

### 판매 시작

- `saleReadiness.ready=true`일 때만 활성
- 비활성 상태에는 첫 번째 사유뿐 아니라 전체 해결 항목을 표시
- 성공 후 판매 중 배지로 변경

### 판매 중지

- 판매 중이면 항상 활성
- 확인 dialog 후 실행
- 다른 readiness 조건이 깨져 있어도 중지 가능

## 6. 상품 편집 연결

`/admin/template-products/[templateId]`는 기존 공용 페이지를 그대로 사용한다.

- 맞춤 제작 템플릿이면 Hub에서 일반 판매로 먼저 전환하도록 안내
- 상품 편집 후 Hub로 돌아왔을 때 목록 query를 refetch
- 상품 저장 페이지 내부를 이번 단계에서 개편하지 않음

공용 페이지가 항상 `/admin/templates`로 돌아가는 기존 동작은 Beta 단계의 알려진
제약으로 기록한다. 충돌 위험이 낮아진 뒤 return URL 지원을 별도 개선할 수 있다.

### 구현 시 확인한 사실: "맞춤 제작 안내"는 배너가 아니라 링크 차단으로 구현

`POST /api/admin/shop-templates`(상품 생성)는 `templates.is_public=false`인
템플릿을 400으로 거부한다(`src/app/api/admin/shop-templates/route.ts:50`).
따라서 상품이 아직 없는 맞춤 제작 템플릿을 상품 페이지로 보내면 생성 시도가
곧바로 실패한다. Hub는 이 경우 링크 자체를 비활성 텍스트로 바꾸고
"먼저 일반 판매로 전환해 주세요" 안내를 `title`에 담아, 실패가 예정된 페이지로
보내지 않는다.

다만 과거 일반 판매였다가 맞춤 제작으로 전환되어 **상품 데이터가 이미 존재하는**
템플릿(5절 "기존 상품 데이터는 재사용 가능"에 해당)은 이 판단에서 제외한다 —
`hasProduct=true`이면 맞춤 제작이어도 링크를 그대로 열어 기존 데이터를
계속 편집할 수 있게 한다. 차단 조건은 `salesType === "custom" && !hasProduct`.

## 7. React Query 무효화

mutation 성공 후 최소한 다음 cache를 갱신한다.

- Hub 목록 전체 prefix
- 해당 Hub 단건 item
- 기존 admin template 단건
- 관련 상품·plan query

현재 페이지의 filter 결과에서 행이 빠질 수 있으므로 응답 객체만 부분 교체하지
않고 서버 목록을 다시 조회한다.

## 8. 오류 처리

- `400`: 잘못된 입력
- `404`: 템플릿 또는 상품 없음
- `409`: 현재 상태와 요청 충돌
- `500`: 예상하지 못한 서버 오류

오류 응답은 `code`와 관리자용 `message`를 제공한다. UI는 `code`로 동작을
분기하고 `message`를 안내에 사용한다.

## 9. 검증

- 엔진별 링크 정확성
- 맞춤 제작 → 일반 판매
- 판매 중이 아닌 일반 판매 → 맞춤 제작
- 판매 중 맞춤 제작 전환 거부
- readiness 충족 시 판매 시작
- 각 readiness 조건 누락 시 판매 시작 거부
- 조건 불일치 데이터도 판매 중지 성공
- mutation 후 filter/count/list 갱신
- 중복 클릭 방지와 pending 상태
- 모바일에서 액션 menu 접근 가능

### 검증 결과 (2026-07-16)

로컬 복제 DB(82건)에서 실제 관리자 로그인 후 브라우저로 확인했다. 판매 중인
실 데이터(티켓 위클리 스케줄, legacy)를 대상으로 상태를 바꿨다가 정확히
원래 상태(판매 중·일반 판매)로 복구했다 — 서버 함수 호출과 실제 UI 클릭
양쪽 경로 모두 확인.

- **인증/오류 코드**: 401(미인증), 403(일반 사용자), 400(잘못된
  `salesType`/`visible`), 404(존재하지 않는 템플릿), 409 `SALE_MUST_STOP_FIRST`
  (판매 중 맞춤 제작 전환 시도), 409 `SALE_NOT_READY` + 전체 사유 배열
  (미구성 템플릿 판매 시작 시도, `NOT_GENERAL_SALE`/`PRODUCT_MISSING`/
  `ARTIST_MISSING` 전부 포함 확인)
- **불변식 재검증**: 판매 중 → 맞춤 제작 전환 거부 → 판매 중지 → 맞춤 제작
  전환 허용 → (맞춤 제작 상태에서 판매 시작 재시도 시 `SALE_NOT_READY`
  확인) → 일반 판매 복구 → 판매 재시작, 6단계 전부 서버 함수로 확인 후 UI
  클릭으로도 동일 흐름 재현
- **중복 클릭 방지**: 클릭 20ms 후 버튼이 이미 `disabled`, 두 번째 클릭은
  네트워크 요청을 만들지 않음(요청 수 1회 확인)
- **엔진별 링크**: Studio 행(draft 상태)에서 수정 링크 존재, 미리보기는
  `aria-disabled` — 기존 Studio 목록과 동일한 게시 전 미리보기 차단 규칙을
  Hub에도 그대로 적용
- **상품 링크 차단**: Studio draft·맞춤 제작·상품 없음 템플릿에서 상품 링크가
  `<a>`가 아니라 비활성 `<span title=...>`로 렌더링됨을 확인
- **모바일**: 390px 뷰포트에서 액션 6개(수정/미리보기/ID 복사/판매 유형
  변경/판매 시작·중지, 상품 링크는 위 경우 비활성) 전부 탭 가능한 위치에
  렌더링, 가로 스크롤 없음

`tsc --noEmit`, 변경 파일 ESLint 통과. 기존 두 탭 파일 diff 0.

## 10. 완료 조건

- [x] Hub에서 주요 운영 흐름 수행 가능
- [x] 기존 두 탭 handler 수정 없음
- [x] 모든 mutation이 Hub service 계층을 통과함 (`updateTemplateSalesType`,
      `updateTemplateSaleVisibility`가 03단계의 순수 판정 함수를 재사용)
- [x] 판매 시작 전 서버 readiness 재검증 (mutation이 목록 조회 시점의 readiness를
      신뢰하지 않고 `getTemplateHubItem`으로 항상 다시 계산)
- [x] 판매 중지는 항상 가능
- [x] 삭제 기능은 노출되지 않음

