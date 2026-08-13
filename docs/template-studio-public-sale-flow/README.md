# Template Studio 일반 판매 흐름 점검 및 로드맵

최종 수정: 2026-07-16

> 이 폴더는 조사·의사결정 기록이다. 실제 구현 순서와 단계별 완료 기준은
> [`../template-hub-development/`](../template-hub-development/README.md)을
> 단일 개발 기준으로 사용한다.

## 배경

템플릿 운영에는 다음 세 흐름이 분리되어 있다.

1. **콘텐츠 제작·게시**: `templates.status` (`draft` → `published`)
2. **판매 상품 구성**: `templates.is_public`, `shop_templates`,
   `template_plans`, 작가·로열티 연결
3. **실제 상점 노출**: `shop_templates.is_shop_visible`

`templates.is_public`은 공개 접근 여부가 아니라 **일반 판매 상품인지 개인 맞춤
상품인지 나타내는 상품 분류**다. 실제 이용 권한은 `template_access`와 작가
연결로 판단한다. 관리자 UI에서도 혼동을 피하기 위해 "공개/비공개"보다
"일반 판매/맞춤 제작" 표기를 권장한다.

현재 관리자 화면에는 기존 "템플릿 관리" 탭과 `Template Studio` 탭이 함께
존재한다. 개발 중 `dev` 브랜치를 계속 병합할 예정이므로, 두 기존 탭을 직접
통합하거나 개편하지 않고 **별도의 신규 통합 탭을 병행 구축**한다.

- 작업명: **템플릿 통합 관리 (Beta)**
- 탭 id(가칭): `templateHub`
- URL(가칭): `/admin/template-hub`
- 상세 방향: [`admin-consolidation-direction.md`](./admin-consolidation-direction.md)

## 현재 기능 준비 상태

| 단계 | 상태 | 현재 구현 |
| --- | --- | --- |
| Studio 메타데이터 생성 | 구현됨 | `POST /api/admin/template-studio/templates`. `template_engine="studio"`, `status="draft"`, `is_public=false`로 생성 |
| Studio 내용 편집·게시 | 구현됨 | draft CRUD와 `publish_template_studio_document`. 게시 시 `status`만 `published`로 변경 |
| 일반 판매 상품 분류 | API 있음, Studio UI 없음 | `PATCH /api/admin/templates/[id]`의 `is_public`. Studio 생성값이 `false`이므로 상품 등록 전에 별도 전환 필요 |
| 상점 상품·가격·작가·로열티 구성 | 구현됨, 공용 독립 페이지 | `/admin/template-products/[templateId]`. 실제 저장은 `/api/admin/shop-templates`, `/api/admin/template-plans` 등을 사용 |
| 판매 시작·중지 | 구 관리 탭에만 UI 있음 | `PATCH /api/admin/shop-templates/[shopTemplateId]`의 `is_shop_visible`. 서버가 일반 판매, 게시, 작가, 로열티 조건을 검사 |
| 맞춤 제작 템플릿 권한 부여 | 구현됨 | `/api/admin/template-access`. 엔진과 무관하게 동작 |

`templates.is_shop_visible`과 레거시 `/api/admin/template-products`는 신규 통합
흐름의 기준으로 사용하지 않는다. 상점 노출의 기준은
`shop_templates.is_shop_visible`, 상품 정보의 기준은 `shop_templates`와
`template_plans`다.

## 개발 원칙: 기존 탭 무수정 병행 구축

통합 탭이 안정되기 전까지 다음 기존 화면을 수정·삭제·리네임하지 않는다.

- `src/components/admin/TemplateManagement.tsx`
- `src/app/(root)/admin/template-studio/page.tsx`
- `template-studio-admin-list-client.tsx`
- 기존 `/admin/templates`, `/admin/template-studio` 루트 동작

신규 기능은 가능한 한 아래 독립 영역에 추가한다.

```text
src/app/(root)/admin/template-hub/
src/components/admin/template-hub/
src/hooks/query/useTemplateHub.ts
src/services/admin/templateHubService.ts
src/app/api/admin/template-hub/
```

기존 API는 계약이 충분한 경우 그대로 호출하되, 목록 집계나 판매 준비 상태처럼
기존 응답으로 부족한 기능은 `/api/admin/template-hub/*` 아래에 새로 둔다.
사이드바 노출을 위해 불가피하게 수정하는 `adminTabs.ts`와
`AdminDashboardShell.tsx`는 기능 구현과 분리된 작은 커밋으로 관리한다.

## 신규 통합 탭의 책임

신규 탭은 Legacy와 Studio를 모두 다루는 운영 허브다.

- 전 엔진 목록, 검색, 페이지네이션
- 엔진·게시 상태·판매 유형·상품 구성·판매 상태 표시
- 판매 불가 사유 표시
- 엔진별 제작 화면 연결
  - Studio → `/admin/template-studio/[id]/edit`
  - Legacy → `/time-table/[id]`
- 공용 상품 페이지 연결 → `/admin/template-products/[id]`
- 일반 판매/맞춤 제작 분류 변경
- 판매 시작·중지
- ID 복사

콘텐츠 게시와 판매 개시는 데이터 의미를 합치지 않는다. 나중에 필요하면
`게시 → 상품 확인 → 판매 시작`을 하나의 UI 마법사로 제공하되, `status`,
`is_public`, `is_shop_visible`, `template_access`는 계속 독립 상태로 유지한다.

## 권장 로드맵

### 1. 신규 탭 골격 추가

- `/admin/template-hub`와 독립 컴포넌트 디렉터리를 만든다.
- 초기에는 직접 URL 또는 Beta 탭으로만 접근한다.
- 기존 두 탭의 코드는 건드리지 않는다.

### 2. 읽기 전용 통합 목록 완성

- 기존 `/api/admin/templates`의 검색·페이지네이션을 참고하되 신규 Hub 응답
  타입을 별도로 정의한다.
- `template_engine`, `status`, `is_public`, `shop_templates`, 작가 연결,
  plan 존재 여부를 한 응답으로 정규화한다.
- 신형 admin 비주얼을 사용하되 기존 Studio 목록 컴포넌트를 직접 개조하지
  않는다.

### 3. 서버 기준 판매 준비 상태 추가

판매 시작 가능 여부를 클라이언트에서 임의로 조합하지 않고 서버가 다음 조건을
판정해 `ready`, `reasons` 형태로 반환하도록 한다.

- `status === "published"`
- `is_public === true`
- `shop_templates` 존재
- 구매 가능한 `template_plans` 존재
- 작가 연결 존재
- 연결 작가의 적용 가능한 로열티 규칙 존재

판매 시작 mutation은 기존 `PATCH /api/admin/shop-templates/[id]`를 사용하고,
신규 Hub UI는 서버 오류를 그대로 사용자에게 설명한다.

### 4. 통합 탭에서 운영 액션 연결

- Studio/Legacy 엔진별 제작 화면 이동
- 상품 정보 페이지 이동
- 일반 판매/맞춤 제작 분류 변경
- 판매 시작·중지

`is_public=true → false` 변경 시 판매 중인 상품이 상점에 남지 않도록, 판매를
먼저 중지하게 하거나 서버에서 원자적으로 중지하는 정책을 적용한다.

### 5. 병행 검증

- 같은 템플릿을 기존 "템플릿 관리" 탭과 신규 Hub에서 비교한다.
- 목록 건수, 분류, 상품 상태, 판매 상태가 일치하는지 확인한다.
- Studio 생성 → 게시 → 일반 판매 전환 → 상품/plan/작가/로열티 저장 → 판매
  시작 → 구매 승인 → 사용자 실행 흐름을 검증한다.
- 검증 기간에는 기존 탭을 운영 fallback으로 유지한다.

### 6. 전환·정리 (별도 후속 작업)

통합 탭의 기능 동등성과 운영 안정성이 확인된 뒤 별도 PR에서만 진행한다.

- 신규 탭의 Beta 표기 제거
- 기존 탭을 사이드바에서 숨김
- 기존 URL redirect 여부 결정
- `TemplateManagement.tsx` 및 레거시 API·컬럼 제거 여부 재검토

개발 중에는 기존 탭 삭제나 redirect를 선행하지 않는다.

## 검증 범위

Studio 생성부터 판매, 구매 승인, `template_access` 생성, 사용자 실행과 상태
재조회까지는 로컬 API E2E가 존재한다
(`docs/template-system-integration/10-pilot-e2e-rollout.md`). 신규 통합 탭에서는
추가로 실제 브라우저 UI 조작, 반응형 표시, 상점 노출, 이미지 내보내기 smoke
test를 수행한다. 원격 DB 변경은 별도 명시 요청이 있을 때만 진행한다.
