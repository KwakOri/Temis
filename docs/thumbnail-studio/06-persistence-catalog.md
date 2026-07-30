# Phase 6. 저장, 발행과 카탈로그 통합

상태: 계획 완료, 구현 전  
선행 단계: [Phase 5 — 사용자 런타임과 PNG 내보내기](./05-runtime-export.md)  
후속 단계: 운영 승인 후 단계별 배포

## 1. 목표

Thumbnail Studio를 기존 Studio 문서, 개정, 에셋, 상품과 접근 권한 흐름에
연결한다.

시간표와 썸네일이 저장 인프라를 공유하되 템플릿 종류에 따라 올바른 편집기와
런타임으로 이동하게 한다.

## 2. 저장 전략

별도의 썸네일 전용 문서 테이블 세트를 만들지 않는다.

공유 대상:

- Studio document
- user draft
- revision
- runtime user state 기반
- asset relation
- publish transaction

종류 구분:

```ts
templates.template_engine = "studio";
templates.template_kind = "timetable" | "thumbnail";
```

저장 서비스가 템플릿 kind와 문서 metadata kind를 함께 확인한다.

기존 kind 없는 문서를 읽는 동안에는
`getStudioTemplateKind(document, dbContext)`를 사용한다. 신규 생성과 migration이
끝난 canonical 문서는 `metadata.kind`를 반드시 기록한다.

## 3. DB 변경 계획

### `templates.template_kind`

도입 순서:

1. nullable 또는 안전한 default로 컬럼 추가
2. 기존 `template_engine="studio"` 행을 `timetable`로 backfill
3. 신규 썸네일 행을 `thumbnail`로 생성
4. 유효 값 check constraint
5. kind 없는 Studio row가 없는지 확인
6. API와 운영 화면 전환 후 Studio row의 not-null 정책 적용

Legacy 템플릿은 제품 의미를 확인한 뒤 `legacy` 전용 kind를 둘지 null을 유지할지
결정한다. Studio 기능 구현 때문에 Legacy 행을 임의로 분류하지 않는다.

### 텍스트 프리셋

프로젝트 공용 편집 가능 preset이 필요하면 전용 저장소를 추가한다.

후보:

```text
v2_studio_text_effect_presets
```

필드:

- id
- label
- version
- payload JSON
- is_active
- created_by
- created_at
- updated_at

초기에는 전역 관리자 preset만 지원한다. 팀과 개인 소유권 필드는 실제 요구가
생길 때 확장한다.

코드 기본 preset만으로 운영하기로 결정하면 이 테이블은 만들지 않는다. 이 결정은
원격 migration 전에 확정한다.

문서의 preset 출처는 저장 위치 결정과 무관하게 처음부터 구분한다.

```ts
type StudioTextPresetReference = {
  source: "builtin" | "custom";
  presetId: string;
  presetVersion: number;
};
```

- `builtin`: 코드 registry ID와 registry version
- `custom`: `v2_studio_text_effect_presets.id`와 row version

따라서 코드 preset을 DB로 복사하더라도 기존 문서의 출처 의미가 바뀌지 않는다.

### 원격 변경 제한

이 문서는 migration 계획만 정의한다. 실제 원격 Supabase migration과 적용은
사용자의 명시 요청과 대상 프로젝트 ref 확인 후 별도로 진행한다.

## 4. Persistence Service

현재 중심:

- `src/services/server/templateStudioPersistenceService.ts`

확장:

```ts
type TemplateStudioTemplateRecord = {
  // 기존 필드
  templateKind: StudioTemplateKind;
};
```

주요 함수에 kind를 전달한다.

- list templates
- create template
- get template
- save draft
- publish
- get runtime
- delete/archive

저장 불변식:

- route가 요구한 kind와 DB kind 일치
- DB kind와 document metadata kind 일치
- thumbnail은 `domains.thumbnail` 존재
- thumbnail은 활성 timetable domain 없음
- timetable은 기존 validator 규칙 유지

레거시 문서를 읽을 때:

1. DB kind와 compatibility resolver로 kind 판정
2. document migration
3. canonical metadata kind 기록
4. 저장 시점부터 필수 invariant 적용

kind가 없는 새 문서의 저장은 허용하지 않는다. optional 호환은 기존 문서의
읽기와 migration 경계에만 둔다.

공통 persistence service 안에 썸네일 렌더링 로직을 넣지 않는다.

## 5. 관리자 API

기존 Studio API를 엔진 공통 저장 API로 확장한다.

```text
/api/admin/template-studio/templates
/api/admin/template-studio/templates/[id]
/api/admin/template-studio/templates/[id]/draft
/api/admin/template-studio/templates/[id]/publish
/api/admin/template-studio/templates/[id]/assets/*
```

목록 query:

```ts
type StudioTemplateListParams = {
  kind?: "timetable" | "thumbnail";
};
```

생성 payload:

```ts
type TemplateStudioCreateTemplatePayload = {
  name: string;
  description?: string;
  templateKind: "timetable" | "thumbnail";
  document: StudioTemplateDocument;
};
```

별도 `/api/admin/thumbnail-studio` 저장 API를 복제하지 않는다. UI route는 분리하고
저장 API는 Studio 엔진 공통으로 사용한다.

## 6. Browser Service와 React Query

기존:

- Template Studio browser service
- `src/hooks/query/useTemplateStudio.ts`
- `src/lib/queryKeys.ts`

query key:

```ts
templateStudioTemplates({ kind: "thumbnail" })
templateStudioTemplate(templateId)
templateStudioDraft(templateId)
```

mutation 후:

- kind별 목록 invalidate
- 단일 template invalidate
- draft invalidate
- preview/runtime invalidate

Thumbnail UI는 기존 hook을 kind-aware wrapper로 사용할 수 있다.

```ts
useThumbnailStudioTemplates()
useCreateThumbnailStudioTemplate()
useThumbnailStudioDraft(templateId)
```

wrapper 안에서 기존 Studio service를 호출하고 HTTP 로직을 중복하지 않는다.

## 7. 관리자 목록과 생성

`/admin/thumbnail-studio`:

- thumbnail kind만 조회
- 이름
- draft/published/archived 상태
- updated time
- 편집
- preview
- 발행본 열기
- 복제
- archive

생성:

1. 이름과 canvas preset 선택
2. `createThumbnailStudioDocument`
3. `templateKind="thumbnail"`로 생성
4. 생성된 ID의 edit route로 이동

삭제보다 archive를 기본 액션으로 둔다. 상품, 접근 권한과 revision이 연결될 수
있기 때문이다.

## 8. Draft 저장

저장 payload:

- document
- runtime 기본값
- base revision
- autosave 여부

저장 순서:

1. 로컬 document validation
2. 미저장 asset 업로드
3. document asset reference 갱신
4. draft API
5. 성공 후 asset sync
6. query cache 갱신

저장 상태:

- clean
- dirty
- saving
- saved
- error

에디터 공통 상단 바가 상태만 표시하고 실제 mutation은 Thumbnail Adapter가
소유한다.

## 9. 발행

발행 조건:

- thumbnail kind 일치
- 문서 validation error 없음
- 모든 required input에 유효한 default
- 모든 사용 asset이 영구 reference
- 모든 사용 font source 유효
- canvas 크기 유효
- thumbnail domain 존재

발행 결과:

- 새 revision
- published document 갱신
- template status 갱신
- runtime query invalidate
- 관리자 preview와 사용자 runtime에서 새 revision 사용

발행이 텍스트 preset 원본을 참조하지 않도록 문서 안에 적용된 appearance snapshot을
포함한다.

## 10. 사용자 Runtime API

기존 사용자 template runtime API를 kind-aware하게 확장한다.

```text
/api/user/templates/[id]/runtime
```

공통 응답에 kind를 포함한다.

사용자 page 선택:

- timetable → 기존 `/template-studio/[id]`
- thumbnail → `/thumbnail/[id]`

직접 잘못된 route로 접근한 경우 올바른 route로 redirect하거나 명확한 오류를
표시한다. 무한 redirect가 생기지 않도록 server에서 canonical route를 계산한다.

사용자 결과 저장은 초기에는 비활성이다. 기존 `StudioTemplateUserStateRow`를
썸네일에 확장하는 작업은 별도 요구가 생겼을 때 진행한다.

## 11. Template Hub 통합

관련:

- `docs/template-hub-development/`
- `src/services/server/templateHubService.ts`
- `src/services/admin/templateHubService.ts`

Hub item에 종류를 추가한다.

```ts
type TemplateHubItem = {
  // 기존 필드
  templateKind: "timetable" | "thumbnail" | null;
};
```

표시:

- Engine: Studio
- Kind: Timetable 또는 Thumbnail
- 편집 경로
- 실행 경로

판매 준비와 접근 권한은 템플릿 종류와 무관하게 기존 공통 규칙을 사용한다.

Hub가 문서 JSON을 읽어 kind를 추론하지 않는다. DB의 `template_kind`를 기준으로
한다.

## 12. 상품과 접근 권한

재사용:

- `shop_templates`
- `template_plans`
- `template_artists`
- `template_access`
- 구매 승인과 판매 준비 판정

Thumbnail Studio만을 위한 별도 구매 테이블을 만들지 않는다.

사용자 접근:

1. 상품 또는 직접 권한으로 `template_access` 확인
2. published thumbnail revision 조회
3. Thumbnail runtime payload 반환
4. 사용자 브라우저에서 편집과 PNG

일반 판매와 맞춤 제작 의미는 기존 Template Hub 규칙을 유지한다.

## 13. 레거시 `thumbnails`와 관계

기존:

- `public.thumbnails`
- `/api/admin/thumbnails`
- `src/services/admin/thumbnailService.ts`
- `src/app/(root)/thumbnails/*`

신규 Thumbnail Studio와 자동 병합하지 않는다.

초기 정책:

- 기존 레거시 썸네일 유지
- 신규 생성은 Studio thumbnail kind
- 목록에서 Legacy/Studio 표시
- 사용자 route 충돌 방지

이관이 필요할 경우 별도 조사:

- 기존 데이터 수
- 실제 사용자 접근
- 코드 기반 템플릿의 데이터 표현 가능성
- 이미지와 폰트 이관
- 새 document 생성 규칙

레거시 삭제는 본 계획 범위에 포함하지 않는다.

## 14. 저장 기반 Preview

관리자 preview source:

- current draft
- latest published
- 특정 revision

preview API가 kind를 반환하고 Thumbnail preview page가 kind를 검증한다.

임시 브라우저 draft preview와 저장 기반 preview를 UI에서 구분한다.

## 15. 적용 순서

1. DB migration 작성
2. compatibility kind resolver와 document migration 연결
3. 로컬 DB에 kind와 preset 정책 적용
4. Supabase generated type 갱신
5. persistence record에 kind 추가
6. create/list/get API에 kind 적용
7. draft/save/publish invariant 적용
8. asset upload/sync 연결
9. Thumbnail 관리자 목록과 생성 연결
10. runtime API kind 적용
11. 사용자 canonical route 연결
12. Template Hub 종류 표시와 route 연결
13. 상품과 접근 권한 흐름 연결
14. 기존 timetable row와 route 호환 유지
15. Studio kind backfill 완료 후 필수화
16. 운영 적용 계획 확정

## 16. 파일 변경 계획

DB:

- `supabase/migrations/*`
- `src/types/supabase.ts`

Server:

- `src/services/server/templateStudioPersistenceService.ts`
- `src/utils/template-studio/template-kind.ts`
- Studio admin API routes
- user runtime API
- `src/services/server/templateHubService.ts`

Browser:

- Template Studio browser service
- `src/hooks/query/useTemplateStudio.ts`
- `src/lib/queryKeys.ts`
- Thumbnail kind wrapper hooks

UI:

- `/admin/thumbnail-studio` 목록과 생성
- Thumbnail editor save/publish adapter
- Thumbnail admin preview
- `/thumbnail/[templateId]`
- Template Hub kind와 navigation

## 17. 완료 조건

- Studio 템플릿이 timetable과 thumbnail kind로 구분된다.
- 기존 timetable row가 올바른 kind로 유지된다.
- 기존 kind 없는 문서는 resolver와 migration을 통해 읽힌다.
- 신규 canonical 문서는 kind 없이 저장되지 않는다.
- Thumbnail 관리자 목록에서 thumbnail만 조회된다.
- 썸네일 문서를 초안 저장하고 발행할 수 있다.
- asset과 font reference가 발행 문서에서 유효하다.
- 사용자 runtime이 published thumbnail revision만 제공한다.
- Template Hub가 종류에 맞는 편집 및 실행 route를 연다.
- 판매와 접근 권한이 기존 공통 구조를 사용한다.
- 레거시 thumbnail 데이터가 자동 변경되거나 삭제되지 않는다.
- preset reference가 builtin/custom 출처와 version을 구분한다.
- 원격 DB 적용은 별도 사용자 승인 후 수행된다.

## 18. 이 단계에서 하지 않는 일

- 레거시 thumbnail 자동 이관
- 레거시 API 삭제
- 사용자 결과 서버 저장
- 팀 또는 개인 text preset
- 자유 배치형 사용자 편집
- 원격 DB 무승인 변경
- 상세 테스트 계획
