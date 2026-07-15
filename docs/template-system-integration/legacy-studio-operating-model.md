# Legacy·Studio 템플릿 운영 모델

최종 수정: 2026-07-15

상태: 현재 구현 기준 운영 참고 문서

## 목적과 용어

현재 운영 대상 템플릿은 두 종류다.

- **Legacy**: 기존 개별 템플릿 시스템
- **Studio**: Template Studio로 제작한 새 템플릿. 기획상 새 v2 템플릿을 의미한다.

프로젝트에 남아 있는 `/v2-template`, `/api/v2/*`, `/api/admin/v2/*` 및
`v2_templates` 계열은 Studio로 오기 위한 과도기 시스템이다. 앞으로 운영하지
않으며, 이 문서에서 말하는 새 v2 템플릿에 포함하지 않는다.

새 템플릿을 코드와 DB에서 `v2`가 아니라 `studio`라고 부르는 이유는 과도기
`v2_templates` 시스템과 구분하고 숫자 version을 document/revision 버전과
혼동하지 않기 위해서다.

## 핵심 운영 모델

Legacy와 Studio는 공통 `templates` 행을 비즈니스 루트로 사용하고 제작·렌더
엔진만 분리한다.

```text
templates
├── template_access
├── template_purchase_requests
├── template_artists
├── shop_templates / template_plans
├── Legacy 코드·설정·asset
└── Studio documents / revisions / drafts / assets / user states
```

| 구분 | Legacy | Studio(새 v2) |
| --- | --- | --- |
| `templates.template_engine` | `legacy` | `studio` |
| 생성 경로 | 기존 템플릿 관리 API | Template Studio API |
| 생성 시 상태 | `published` 기본값 | `draft` |
| 관리자 편집·확인 | `/time-table/{id}` | `/admin/template-studio/{id}/edit` |
| 사용자 실행 | `/time-table/{id}` | `/template-studio/{id}` |
| 템플릿 본문 | 기존 개별 코드·설정 | Studio document JSON과 revision |
| 사용자 runtime 값 | 기존 템플릿별 구조 | `template_studio_user_states` |
| 사용자 runtime 이미지 | 기존 템플릿별 구조 | 브라우저 IndexedDB |
| 판매·구매·권한 | 공통 기존 시스템 | 공통 기존 시스템 |

## 엔진 구분값

두 시스템을 구분하는 기준은 숫자 `version`이 아니라
`templates.template_engine`이다.

```text
legacy: 기존 제작·렌더 엔진
studio: Template Studio 제작·렌더 엔진
```

DB 제약은 `legacy`와 `studio` 외 값을 허용하지 않는다. 기존 `templates` 데이터는
통합 migration에서 모두 `legacy`, `published`로 backfill한다.

관련 migration:

- [`20260715010000_add_template_engine_and_status.sql`](../../supabase/migrations/20260715010000_add_template_engine_and_status.sql)

`template_engine`은 생성 시 결정하고 이후 바꾸지 않는 것이 운영 원칙이다. 정상
애플리케이션 API에는 엔진을 변경하는 기능이 없지만, DB trigger로 불변성이 강제된
것은 아니므로 수동 SQL로 변경하지 않는다. 엔진 전환이 필요하면 기존 행의 값을
바꾸지 말고 별도 migration·데이터 변환 계획을 세운다.

## 공통 루트에 저장하는 정보

두 엔진은 다음 정보를 같은 `templates` 행에서 사용한다.

- `id`, `name`, `description`, `thumbnail_url`
- `template_engine`
- `status`
- `is_public`
- `created_by`, timestamp
- 상점, 가격 plan, 구매 요청, 사용 권한, 작가 연결의 기준 ID

다음 세 필드는 서로 다른 의미다.

| 필드 | 의미 |
| --- | --- |
| `template_engine` | 어떤 제작·렌더 시스템을 사용할지 |
| `status` | `draft`, `published`, `archived` 발행 생명주기 |
| `is_public` | 일반 판매 상품인지 개인 맞춤 상품인지 |

`is_public = true`는 무료 이용이나 무권한 접근을 뜻하지 않는다.

## 생성 흐름

### Legacy 생성

기존 관리자 API `POST /api/admin/templates`로 생성한다. API가 엔진과 상태를 직접
지정하지 않으므로 DB 기본값이 적용된다.

```text
template_engine = legacy
status = published
```

관련 API:

- [`src/app/api/admin/templates/route.ts`](../../src/app/api/admin/templates/route.ts)

### Studio 생성

Template Studio API `POST /api/admin/template-studio/templates`로 생성한다. persistence
계층이 값을 명시적으로 지정한다.

```text
template_engine = studio
status = draft
is_public = false
created_by = 현재 관리자
```

관련 코드:

- [`src/app/api/admin/template-studio/templates/route.ts`](../../src/app/api/admin/template-studio/templates/route.ts)
- [`src/services/server/templateStudioPersistenceService.ts`](../../src/services/server/templateStudioPersistenceService.ts)

Legacy API로 만든 행에 Studio document를 붙이거나 Studio API로 Legacy 행을 여는
방식은 지원하지 않는다.

## 제작 데이터 분리

공통 ID를 사용하더라도 실제 본문과 렌더 구현은 분리된다.

### Legacy

기존 `/time-table/{templateId}` 아래의 템플릿별 page, component, setting, image를
사용한다. 현재 다수의 Legacy 템플릿은 ID별 정적 route와 코드로 존재한다.

### Studio

다음 Studio 전용 테이블을 사용하며 모든 `template_id`는 `templates.id`를
참조한다.

```text
template_studio_documents
template_studio_document_revisions
template_studio_document_drafts
template_studio_assets
template_studio_user_states
```

중복 부모였던 `template_studio_templates`는 제거됐다. Studio child 데이터는
Legacy 행에 연결하지 않으며, Studio persistence의 create/get/list/delete는 항상
`template_engine = 'studio'` 조건을 적용한다.

관련 문서와 migration:

- [`03-studio-schema-relink.md`](./03-studio-schema-relink.md)
- [`20260715020000_relink_template_studio_to_templates.sql`](../../supabase/migrations/20260715020000_relink_template_studio_to_templates.sql)

## 발행 상태

일반 사용자 실행과 상점 노출은 `status = 'published'`인 템플릿만 대상으로 한다.

Studio의 기본 흐름은 다음과 같다.

```text
Studio 생성
  → studio + draft
  → document/draft 작성
  → publish
  → published
  → 판매 및 사용자 실행 가능
```

Studio publish 함수는 다음 조건을 DB에서 확인한다.

```sql
template_engine = 'studio'
status <> 'archived'
```

발행 성공 시 공통 `templates.status`를 `published`로 변경하고 Studio document와
revision을 원자적으로 저장한다. Legacy ID로 Studio 발행을 시도하면 실패한다.

## 관리자 운영

공통 템플릿 관리 목록에서는 두 엔진을 함께 보여 주고 `Legacy`/`Studio` badge와
발행 상태 badge를 표시한다.

템플릿 열기 동작은 엔진에 따라 분기한다.

```text
legacy → /time-table/{id}
studio → /admin/template-studio/{id}/edit
```

관련 코드:

- [`src/components/admin/TemplateManagement.tsx`](../../src/components/admin/TemplateManagement.tsx)

Studio 전용 목록과 편집 API에는 `template_engine = 'studio'` 필터가 있으므로 Legacy
ID를 넘기면 Studio 템플릿으로 조회되지 않는다.

## 상점·구매 운영

판매 시스템은 엔진별로 분리하지 않는다. 두 엔진 모두 기존 구조를 사용한다.

```text
templates
  → shop_templates
  → template_plans
  → template_purchase_requests
  → template_access
```

일반 판매의 주요 조건은 다음과 같다.

- `is_public = true`: 일반 판매 상품
- `shop_templates.is_shop_visible = true`: 상점 목록 노출
- `status = published`: 발행 완료
- 작가·상품·plan 연결 등 기존 판매 조건 충족

상점 조회는 engine을 제한하지 않으므로 조건을 만족하는 Legacy와 Studio가 같은
목록에 나타난다. 구매 승인으로 생성된 `template_access`도 엔진과 무관하게 공통
`templates.id`에 연결된다.

## 이용 권한

Legacy와 Studio 모두 같은 권한 공식을 사용한다.

```text
canUse(template, user) =
  user is admin
  OR template_access(template_id, user_id) exists
  OR template_artists → artists.user_id가 현재 사용자와 일치
```

일반 사용자에게는 추가로 `status = published`가 필요하다. `is_public`은 권한을
부여하지 않는다.

공통 판정은 `TemplateService.resolveEntitlement()`와 `hasAccess()`가 담당한다.

- [`src/lib/templates.ts`](../../src/lib/templates.ts)
- [`05-entitlement-semantics.md`](./05-entitlement-semantics.md)

## 마이페이지와 실행 경로

마이페이지 API는 권한이 있는 Legacy와 Studio 템플릿을 한 목록으로 반환한다.
각 응답에는 `template_engine`, `status`, `use_href`가 포함된다.

```text
legacy → /time-table/{templateId}
studio → /template-studio/{templateId}
```

경로 분기:

- [`src/utils/template-links.ts`](../../src/utils/template-links.ts)
- [`src/app/api/user/templates/route.ts`](../../src/app/api/user/templates/route.ts)

Legacy 실행 route는 ID별 page가 실제로 존재해야 한다. Studio 실행 route는 동적
route지만, 실행 API에서 로그인·공통 권한·`template_engine = 'studio'`·
`status = 'published'`·발행 document 존재를 다시 확인한다. 따라서 Legacy ID를
`/template-studio/{id}`에 넣어도 Studio runtime으로 실행되지 않는다.

Studio 실행 관련 코드:

- [`src/app/(root)/template-studio/[templateId]/page.tsx`](<../../src/app/(root)/template-studio/[templateId]/page.tsx>)
- [`src/app/api/user/templates/[id]/runtime/route.ts`](../../src/app/api/user/templates/[id]/runtime/route.ts)

## Studio 사용자 상태와 이미지

Studio document는 템플릿 단위로 공유하고 사용자 입력은
`template_studio_user_states`에 `(template_id, user_id)` 단위로 저장한다.

text/select/timetable 같은 runtime 값은 서버에 저장하지만, 사용자가 선택하고 crop한
이미지는 서버·Supabase DB·R2에 저장하지 않는다. 최종 PNG Blob만 동일 브라우저의
IndexedDB에 다음 namespace로 저장한다.

```text
사용자 + 템플릿 + input + global/day/stable entry context
```

따라서 같은 브라우저에서는 새로고침 후 복원되지만 다른 기기·브라우저에서는
공유되지 않고 사이트 데이터를 지우면 사라진다.

- [`08-user-runtime-state.md`](./08-user-runtime-state.md)
- [`12-user-runtime-browser-image-storage.md`](./12-user-runtime-browser-image-storage.md)

## 과도기 `/v2-template` 시스템의 취급

다음 시스템은 Studio 도입 전 과도기 구현이며 운영에 사용하지 않는다.

```text
/v2-template/*
/api/v2/*
/api/admin/v2/*
v2_templates
v2_template_render_configs
v2_template_render_config_revisions
v2_template_render_config_drafts
```

이 시스템은 `templates.template_engine = 'studio'` 체계와 연결되지 않으며 상점,
구매, `template_access`, Studio document 체계의 운영 기준으로 사용하면 안 된다.

현재 저장소에는 route, API, schema가 남아 있으므로 **운영하지 않는 것과 기술적으로
접근할 수 없는 것은 다르다**. 완전한 비활성화를 위해서는 별도 작업으로 다음을
진행한다.

1. 사용자 `/v2-template/*` route 비활성화 또는 제거
2. `/api/v2/*`와 `/api/admin/v2/*` 비활성화
3. 관리자·내부 navigation 링크 제거 여부 확인
4. `v2_*` 데이터 사용 여부 read-only 점검
5. 필요한 데이터가 없으면 관련 table·migration 이후 코드 제거

원격 DB table 삭제는 로컬 검증이 끝난 뒤 사용자가 직접 수행한다.

## 운영 시나리오 요약

### Legacy 판매·사용

```text
기존 관리자 API로 template 생성 또는 기존 행 사용
→ legacy + published
→ 일반 상품이면 is_public=true
→ shop/product/plan/artist 연결
→ 구매 승인 또는 수동 template_access 부여
→ 마이페이지 /time-table/{id} 실행
```

### Studio 판매·사용

```text
Template Studio에서 생성
→ studio + draft
→ document 작성·asset sync·publish
→ studio + published
→ 상품 분류와 shop/product/plan/artist 연결
→ 구매 승인 또는 수동 template_access 부여
→ 마이페이지 /template-studio/{id} 실행
→ 사용자별 runtime 값 저장, crop PNG는 IndexedDB 저장
```

## 운영 원칙 요약

```text
공통 비즈니스 루트: templates
  ├── legacy → 기존 /time-table
  └── studio → 새 Template Studio

운영 제외 과도기 시스템:
  └── v2_templates / /v2-template
```

- 엔진은 `template_engine`으로만 판정한다.
- `status`와 `is_public`을 엔진 구분에 사용하지 않는다.
- 판매·구매·권한·작가 연결은 두 엔진이 공유한다.
- 제작 본문, 편집기, 사용자 실행 renderer만 엔진별로 분리한다.
- 과도기 `v2-template` ID와 Studio ID를 서로 변환하거나 재사용하지 않는다.
