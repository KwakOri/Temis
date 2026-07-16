# 템플릿 통합 관리 Hub 개발 계획

최종 수정: 2026-07-16  
상태: 계획 확정, 구현 전

## 1. 목표

Legacy 템플릿과 Template Studio 템플릿을 한 곳에서 조회하고 운영할 수 있는
신규 관리자 탭을 만든다.

개발 중에는 기존 "템플릿 관리" 탭과 `Template Studio` 탭을 수정하거나
대체하지 않는다. 신규 Hub를 독립적으로 구축하고 기존 화면과 병행 검증한 뒤,
기능 동등성과 운영 안정성이 확인된 경우에만 별도 후속 PR에서 전환한다.

작업명은 다음과 같다.

| 항목 | 작업명 |
| --- | --- |
| 표시명 | 템플릿 통합 관리 (Beta) |
| 탭 id | `templateHub` |
| URL | `/admin/template-hub` |

명칭과 URL은 가칭이다. 개발 경계를 안정적으로 유지하기 위해 구현 중에는
가칭을 사용하고, 정식 명칭 변경은 전환 단계에서 결정한다.

## 2. 핵심 결정

### 기존 화면은 개발 중 동결한다

다음 화면은 신규 Hub 개발 범위에서 수정하지 않는다.

- `src/components/admin/TemplateManagement.tsx`
- `src/app/(root)/admin/template-studio/page.tsx`
- `src/app/(root)/admin/template-studio/_components/`
- 기존 `/admin/templates`, `/admin/template-studio` 루트 동작

Studio 생성·편집·미리보기와 공용 상품 편집 페이지는 복제하지 않고 링크
대상으로 재사용한다.

### 신규 기능은 독립 경계를 가진다

```text
src/app/(root)/admin/template-hub/
src/components/admin/template-hub/
src/hooks/query/useTemplateHub.ts
src/services/admin/templateHubService.ts
src/app/api/admin/template-hub/
src/services/server/templateHubService.ts
src/types/template-hub.ts
```

불가피한 공용 변경은 Beta 탭 등록 시점의 다음 두 파일로 제한한다.

- `src/lib/adminTabs.ts`
- `src/components/admin/AdminDashboardShell.tsx`

공용 변경은 신규 화면 구현과 별도 커밋으로 관리한다. Beta 등록 전에는 직접
URL로 검증할 수 있어야 한다.

### 기존 API와 데이터는 재사용하되 Hub 계약은 분리한다

Hub는 기존 테이블을 그대로 사용한다. 별도 Hub 테이블이나 원격 migration을
추가하지 않는다.

기존 API 응답은 Hub에 필요한 plan·판매 준비 상태를 완전히 제공하지 않으므로,
목록 집계와 Hub mutation은 `/api/admin/template-hub/*` 아래의 전용 API로 둔다.
전용 API는 기존 테이블을 읽고 쓰되 새로운 정규화 응답 계약을 제공한다.

## 3. 데이터 의미

| 데이터 | 의미 |
| --- | --- |
| `templates.template_engine` | `legacy` 또는 `studio` 제작·렌더 엔진 |
| `templates.status` | `draft`, `published`, `archived` 콘텐츠 발행 상태 |
| `templates.is_public` | 일반 판매 또는 개인 맞춤 상품 분류 |
| `shop_templates.is_shop_visible` | 실제 상점 목록 노출·판매 상태 |
| `template_plans` | 구매 가능한 상품 plan과 가격 |
| `template_artists` | 작가 연결과 작가 본인 이용 관계 |
| `template_access` | 일반 사용자의 실제 이용 권한 |

`is_public=true`는 공개 접근이나 판매 중을 의미하지 않는다. UI에서는
"공개/비공개" 대신 "일반 판매/맞춤 제작"을 사용한다.

`templates.is_shop_visible`과 레거시 `template_products`는 신규 Hub의 기준으로
사용하지 않는다.

## 4. 목표 사용자 흐름

### Studio 일반 판매

```text
Hub에서 Studio 신규 생성
→ 기존 Studio 편집기에서 내용 작성·게시
→ Hub에서 일반 판매로 분류
→ 공용 상품 페이지에서 상품·plan·작가·로열티 저장
→ Hub에서 판매 준비 상태 확인
→ 판매 시작
→ 구매 승인으로 template_access 생성
→ 사용자가 /template-studio/{id} 실행
```

### Studio 맞춤 제작

```text
Hub에서 Studio 신규 생성
→ 기존 Studio 편집기에서 내용 작성·게시
→ 맞춤 제작 분류 유지
→ 접근 권한 관리에서 주문자에게 template_access 부여
→ 사용자가 /template-studio/{id} 실행
```

### Legacy 운영

```text
Hub 목록에서 Legacy 템플릿 조회
→ 기존 /time-table/{id} 실행
→ 공용 상품·판매·권한 구조는 Studio와 동일하게 사용
```

## 5. Hub 화면 책임

- Legacy와 Studio 통합 목록
- 서버 검색과 페이지네이션
- 엔진, 게시 상태, 판매 유형 필터
- 상품·plan·작가·로열티 준비 상태 표시
- 판매 중/판매 대기/판매 불가 상태 표시
- 판매 불가 사유 표시
- 엔진별 제작·실행 경로 이동
- 공용 상품 편집 페이지 이동
- 일반 판매/맞춤 제작 분류 변경
- 판매 시작·중지
- ID 복사

Beta 범위에서는 영구 삭제를 제공하지 않는다. 삭제는 상품·구매·권한 이력과
연결되므로 7단계에서 별도 정책으로 검토한다.

## 6. 애플리케이션 계층

Next.js 데이터 흐름은 프로젝트 규칙을 따른다.

```text
Page/UI
→ React Query hook
→ browser service
→ /api/admin/template-hub/*
→ server service
→ Supabase
```

- UI에서 `fetch`나 Supabase를 직접 호출하지 않는다.
- HTTP 호출은 `templateHubService.ts`에 둔다.
- 서버의 판매 준비 판정을 UI에서 별도로 재구현하지 않는다.
- mutation 성공 후 Hub 목록과 관련 상품 query를 명시적으로 invalidate한다.
- 기본 스타일은 Tailwind CSS, 재사용 variant는 `cva`를 사용한다.

## 7. 단계별 문서

1. [독립 경계와 데이터 계약](./01-foundation-and-contract.md)
2. [읽기 전용 통합 목록](./02-read-only-catalog.md)
3. [판매 준비 상태와 서버 규칙](./03-sale-readiness.md)
4. [운영 액션과 화면 연결](./04-actions-and-navigation.md)
5. [Beta 등록과 병행 검증](./05-beta-registration-and-validation.md)
6. [정식 전환](./06-cutover.md)
7. [레거시 정리](./07-legacy-cleanup.md)

의존 순서는 다음과 같다.

```text
01 → 02 → 03 → 04 → 05 → 06 → 07
```

1~5단계는 기존 탭을 유지하는 병행 개발 구간이다. 6~7단계는 개발 안정화 후
별도 승인·별도 PR로 진행한다.

## 8. 단계별 상태

| 단계 | 상태 | 결과물 |
| --- | --- | --- |
| 01. 경계·계약 | 완료(2026-07-16) | 신규 route, 타입, service, API contract |
| 02. 읽기 목록 | 완료(2026-07-16) | 통합 검색·필터·페이지네이션 |
| 03. 판매 준비 | 완료(2026-07-16) | 서버 `saleReadiness` 판정 |
| 04. 운영 액션 | 완료(2026-07-16) | 분류 변경, 판매 시작·중지, 링크 |
| 05. Beta 검증 | 대기 | 사이드바 Beta 탭, 병행 검증 결과 |
| 06. 정식 전환 | 보류 | 기존 탭 숨김·redirect 결정 |
| 07. 레거시 정리 | 보류 | 사용하지 않는 코드·API·컬럼 정리 |

단계를 시작하거나 완료할 때 이 표와 해당 단계 문서의 상태·검증 결과를 함께
갱신한다.

01단계 목록 응답 계약에 `saleReadiness`가 포함돼 있어, 서버의
`evaluateTemplateSaleReadiness()`(로열티 판정 포함)는 01단계 구현 시점에 이미
완전히 작성되어 있었다. 03단계에서는 여기에 조건별 단위 테스트(22건, 순수
함수만 호출하므로 DB 불필요)를 추가하고, "판매 중지는 항상 가능", "판매 중
맞춤 제작 전환 거부" 두 불변식을 `evaluateTemplateSaleVisibilityChange` /
`evaluateTemplateSalesTypeTransition` 순수 함수로 뽑아 두었다. 04단계의 Hub
mutation API는 이 두 함수를 그대로 재사용하고 새 판정 로직을 만들지 않는다.

## 9. 공통 완료 기준

- 기존 두 탭의 동작과 파일이 1~5단계에서 변경되지 않는다.
- Legacy와 Studio가 동일한 목록 계약으로 조회된다.
- 목록 건수와 상태가 기존 관리 화면 및 DB 기준과 일치한다.
- 판매 시작 가능 여부는 서버가 판정한다.
- 판매 시작에는 게시, 일반 판매, 상품, plan, 작가, 로열티가 모두 필요하다.
- 판매 중지는 준비 상태와 관계없이 항상 가능하다.
- 맞춤 제작으로 변경하기 전 판매가 먼저 중지된다.
- mutation 후 관련 React Query cache가 갱신된다.
- 데스크톱과 모바일 관리자 UI에서 주요 액션을 수행할 수 있다.
- Studio 생성 → 게시 → 상품 구성 → 판매 → 구매 승인 → 사용자 실행 흐름이
  회귀하지 않는다.
- 원격 DB는 사용자 명시 요청 없이 변경하지 않는다.

## 10. 관련 문서

- 조사·의사결정 기록:
  [`../template-studio-public-sale-flow/`](../template-studio-public-sale-flow/README.md)
- 통합 데이터·권한 모델:
  [`../template-system-integration/`](../template-system-integration/README.md)
- Legacy·Studio 운영 모델:
  [`../template-system-integration/legacy-studio-operating-model.md`](../template-system-integration/legacy-studio-operating-model.md)

