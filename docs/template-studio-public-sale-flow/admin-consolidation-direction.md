# 템플릿 관리 신규 통합 탭 구축 방향

최종 수정: 2026-07-16

> 이 문서는 방향 결정 기록이다. 확정된 전체 개발 계획과 단계별 실행 문서는
> [`../template-hub-development/`](../template-hub-development/README.md)을 따른다.

관련 문서: [일반 판매 흐름 점검 및 로드맵](./README.md),
[템플릿 시스템 통합 개발 개요](../template-system-integration/README.md)

## 결정 배경

관리자 사이드바에는 템플릿을 다루는 기존 탭이 두 개 있다.

- **템플릿 관리**: 탭 id `templates` → `TemplateManagement.tsx`
- **Template Studio**: 탭 id `templateStudio` → `/admin/template-studio`

두 화면은 같은 `templates` 루트를 사용하지만 기능 범위와 UI 구조가 다르다.
장기적으로는 하나의 관리 목록으로 수렴해야 하지만, 개발 중 `dev` 브랜치를
계속 병합할 예정이므로 기존 탭을 직접 개편하면 충돌 가능성이 높다.

따라서 다음 원칙을 채택한다.

> 기존 두 탭은 그대로 유지하고, 독립된 신규 통합 탭을 병행 구축한다.
> 기능 동등성과 운영 안정성이 확인된 후에만 별도 후속 작업으로 전환한다.

신규 탭의 작업명은 다음과 같다. 명칭과 URL은 제품 결정에 따라 나중에 변경할
수 있다.

| 항목 | 작업명 |
| --- | --- |
| 표시명 | 템플릿 통합 관리 (Beta) |
| 탭 id | `templateHub` |
| URL | `/admin/template-hub` |

## 현재 화면 비교

| 기능 | 기존 템플릿 관리 | 기존 Template Studio | 신규 통합 탭 목표 |
| --- | --- | --- | --- |
| 목록 대상 | Legacy + Studio | Studio만 | Legacy + Studio |
| 검색·페이지네이션 | 있음 | 없음 | 있음 |
| 엔진·게시 상태 | 있음 | 게시 상태만 | 있음 |
| 판매 유형 | `is_public` 탭 | 없음 | 일반 판매/맞춤 제작 필터 |
| 상품 상태 | 있음 | 없음 | 있음 |
| 판매 시작·중지 | 있음 | 없음 | 있음 + 불가 사유 표시 |
| 작가 연결 | 있음 | 없음 | 있음 |
| Studio 제작 | Studio 에디터로 분기 | 직접 편집 | Studio 에디터로 분기 |
| Legacy 실행 | `/time-table/[id]` | 없음 | `/time-table/[id]` |
| 삭제 | 없음 | Studio 삭제 | 초안·이력 조건 기반 정책 |
| 비주얼 | 구형 | 신형 admin UI | 신형 admin UI |

## 확인된 코드 사실

### 상품 편집은 이미 공용 독립 페이지다

`TemplateManagement.tsx`의 상품 등록·수정 액션은
`/admin/template-products/[templateId]`로 이동한다. 이 페이지는 상품 정보,
PRO 가격, 작가 연결, 로열티 규칙을 다루며 엔진에 의존하지 않는다. 신규 Hub는
이 페이지를 재사용하고 기존 관리 탭의 상품 폼 코드를 이식하지 않는다.

다만 Studio 템플릿은 `is_public=false`로 생성되고 상품 생성 API는
`is_public=true`만 허용하므로 **딥링크만으로 판매 흐름이 완성되지는 않는다.**
신규 Hub에서 일반 판매/맞춤 제작 분류를 명시적으로 관리해야 한다.

### 판매 상태의 기준은 `shop_templates.is_shop_visible`이다

판매 시작·중지는 `PATCH /api/admin/shop-templates/[id]`로 처리한다.
`templates.is_shop_visible`은 대체된 레거시 컬럼이므로 신규 Hub에서 사용하지
않는다. `is_public`도 판매 시작 토글이 아니라 상품 분류다.

### 판매 gate는 서버가 기준이어야 한다

구 관리 화면의 `toggleShopVisibility`는 게시 상태와 작가 연결을 미리 검사하지만,
실제 API는 일반 판매 분류와 로열티까지 검사한다. 신규 Hub는 클라이언트 로직을
그대로 복사하지 않고 서버 판정을 기준으로 사용한다.

판매 준비 상태에는 다음 조건을 포함한다.

- 게시 완료
- 일반 판매 상품
- `shop_templates` 존재
- 구매 가능한 plan 존재
- 작가 연결 존재
- 적용 가능한 로열티 규칙 존재

### 기존 통합 목록 API도 그대로 완전하지는 않다

`GET /api/admin/templates`는 전 엔진, 검색, 페이지네이션,
`shop_templates`, `template_artists`를 제공하지만 `template_plans`까지 조인하지는
않는다. 응답 타입도 실제 조회보다 넓게 선언되어 있다. 신규 Hub는 기존 타입을
그대로 재사용하지 않고 필요한 필드를 정규화한 별도 응답 타입을 사용한다.

### 접근 권한 관리는 이미 엔진 통합 상태다

`AccessManagement.tsx`와 `/api/admin/template-access`는 엔진 구분 없이 동작한다.
신규 Hub 구축 범위에서는 변경하지 않는다.

## 선택한 방향: 독립 Hub 병행 구축

기존 검토의 "신규 통합 목록으로 수렴"이라는 제품 방향은 유지하되, 구현 방식은
기존 Studio 목록을 개조하는 방법에서 **새 기능 영역을 만드는 방법**으로
변경한다.

### 장점

- `dev` 병합 시 기존 대형 컴포넌트와의 충돌을 줄인다.
- 기존 두 탭을 비교 기준과 운영 fallback으로 사용할 수 있다.
- 미완성 기능이 현재 운영 화면에 영향을 주지 않는다.
- 신규 Hub의 타입·컴포넌트·테스트 경계를 명확하게 만들 수 있다.
- 전환과 레거시 삭제를 별도 PR로 분리할 수 있다.

### 비용

- 개발 기간에는 세 개의 템플릿 관련 탭이 공존한다.
- 기존 API를 그대로 쓰기 어려운 집계 응답은 신규 API가 필요하다.
- 기능 동등성 비교와 전환 기준을 명시적으로 관리해야 한다.

이 비용은 의도된 전환 비용이며, 기존 화면을 동시에 수정하다 발생하는 충돌과
회귀 위험보다 작다고 판단한다.

## 충돌 최소화용 코드 경계

신규 구현은 가능한 한 다음 위치에 둔다.

```text
src/app/(root)/admin/template-hub/
  page.tsx
  _components/

src/components/admin/template-hub/
src/hooks/query/useTemplateHub.ts
src/services/admin/templateHubService.ts
src/app/api/admin/template-hub/
src/types/template-hub.ts
```

개발 중 수정하지 않는 기존 영역:

```text
src/components/admin/TemplateManagement.tsx
src/app/(root)/admin/template-studio/page.tsx
src/app/(root)/admin/template-studio/_components/
```

Studio의 생성·편집·미리보기 페이지는 신규 Hub에서 링크 대상으로 재사용하므로
그 자체를 복제하지 않는다. 공용 상품 페이지도 링크 대상으로 재사용한다.

불가피한 공용 변경은 다음 두 파일의 탭 등록 정도로 제한한다.

- `src/lib/adminTabs.ts`
- `src/components/admin/AdminDashboardShell.tsx`

이 변경은 신규 화면 구현 커밋과 분리한다. 충돌이 예상되면 먼저 직접 URL로만
검증하고, 사이드바 등록 커밋은 기능이 준비된 뒤 적용한다.

## 신규 Hub 데이터 계약

목록 행은 기존 두 화면의 타입을 직접 섞지 않고 다음 의미를 가진 정규화 모델을
사용한다.

```text
TemplateHubItem
  id
  name / description
  templateEngine
  publicationStatus
  salesType                 // general | custom
  shopProductId
  hasProduct
  hasPurchasablePlan
  isShopVisible
  linkedArtists
  saleReadiness
    ready
    reasons[]
  createdAt / updatedAt
```

`saleReadiness`는 서버에서 계산한다. UI는 이를 이용해 판매 버튼 활성화 여부와
"게시 필요", "상품 필요", "가격 필요", "작가 필요", "로열티 필요" 같은 사유를
표시한다.

## 단계별 구현 계획

### 1단계 — 독립 route와 읽기 전용 목록

- 신규 `/admin/template-hub` route 추가
- 전용 타입, service, React Query hook 추가
- 전 엔진 목록·검색·페이지네이션 구현
- 엔진, 게시, 판매 유형, 상품, 판매 상태 배지 표시
- 기존 두 탭에는 변경 없음

### 2단계 — 제작·상품 링크 연결

- Studio → `/admin/template-studio/[id]/edit`
- Legacy → `/time-table/[id]`
- 공통 상품 정보 → `/admin/template-products/[id]`
- 신규 생성 → `/admin/template-studio/create`

신규 제작을 Studio로만 할지는 이 단계 전에 확정한다. 확정 전에는 기존 Legacy
생성 기능을 제거하지 않는다.

### 3단계 — 판매 분류와 준비 상태

- 일반 판매/맞춤 제작 분류 변경
- `saleReadiness`와 불가 사유 표시
- `is_public=true → false` 전환 시 판매 중 상품 처리 정책 적용
- 상품/plan/작가/로열티 상태 재조회 및 mutation 후 query invalidate

### 4단계 — 판매 시작·중지

- 기존 `PATCH /api/admin/shop-templates/[id]` 사용
- 서버 gate 결과를 사용자에게 그대로 표시
- 성공 후 Hub 목록과 상품 상세 query invalidate
- 기존 탭의 판매 토글 로직은 수정하지 않음

### 5단계 — Beta 탭 등록과 병행 검증

- 사이드바에 "템플릿 통합 관리 (Beta)" 추가
- 기존 두 탭도 그대로 노출
- 동일 템플릿의 목록·상태·액션 결과 비교
- 브라우저 기반 관리자·상점·구매·사용자 실행 smoke test

### 6단계 — 전환 (개발 안정화 후 별도 PR)

다음 조건이 모두 충족된 뒤에만 진행한다.

- Legacy와 Studio 목록 건수·검색·필터 일치
- 상품·판매 상태 일치
- 판매 시작·중지 및 실패 사유 검증
- Studio 생성·게시·판매·구매·실행 E2E 통과
- 운영자가 신규 Hub만으로 주요 업무 수행 가능

그 후 별도 PR에서 기존 탭 숨김, URL redirect, 레거시 컴포넌트 제거를 검토한다.
`dev` 병합이 빈번한 개발 단계에서는 이 정리 작업을 선행하지 않는다.

## 결정 사항

| 항목 | 현재 결정 |
| --- | --- |
| 기존 두 탭 수정 | 개발 중 하지 않음 |
| 신규 통합 탭 | 별도 route·컴포넌트로 신설 |
| 신규 탭 URL | `/admin/template-hub` (가칭) |
| 공용 상품 페이지 | 기존 페이지 재사용 |
| Studio 편집기 | 기존 route 재사용 |
| 판매 상태 기준 | `shop_templates.is_shop_visible` |
| 게시와 판매 상태 | 데이터는 분리 유지 |
| 기존 탭 제거 | 안정화 후 별도 PR |
| Legacy 신규 생성 | 제품 결정 전까지 기존 기능 유지 |
| 영구 삭제 | 엔진이 아니라 draft/상품/구매/권한 이력 기준으로 제한 권장 |

## 통합 범위에서 제외하는 것

- 접근 권한 관리 탭 자체의 개편
- 팀 템플릿 관리
- Studio 에디터 내부 기능 개편
- 공용 상품 편집 페이지의 전면 재작성
- 개발 단계에서 기존 탭 삭제·redirect
- 사용자 승인 없는 원격 DB 변경
