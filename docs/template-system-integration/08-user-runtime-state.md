# 08. 사용자별 Studio 실행 상태

상태: 완료 (2026-07-15)

## 목적

발행된 Studio 문서는 공유하고, 사용자가 입력한 값만 사용자별로 분리해 저장한다.
관리자 draft 테이블을 사용자 데이터 저장소로 재사용하지 않는다.

## 제안 스키마

```text
template_studio_user_states
- id uuid primary key
- template_id uuid references templates(id)
- user_id bigint references users(id)
- base_revision_no integer
- runtime_values jsonb
- version integer
- created_at / updated_at
- unique(template_id, user_id)
```

## API

- `GET /api/user/templates/{id}/runtime`
- `PUT /api/user/templates/{id}/runtime`

두 API는 서버에서 다음 순서로 검증한다.

1. 로그인 사용자 확인
2. 공통 entitlement 확인
3. `template_engine = 'studio'`, `status = 'published'` 확인
4. 발행 문서 input contract에 맞게 runtime value 검증
5. token의 사용자 id로만 조회·upsert

## 원칙

- 사용자마다 전체 document를 복제하지 않는다.
- 템플릿 revision이 바뀌면 `base_revision_no`로 migration 필요 여부를 판단한다.
- 사용자 이미지 입력을 영구 저장한다면 별도 user asset 테이블과 R2 prefix를 둔다.
- 다른 사용자의 `user_id`를 request body로 받지 않는다.

## 완료 조건

- 저장 후 새로고침해도 사용자 입력이 복원된다.
- 사용자 간 runtime 값이 격리된다.
- 템플릿 개정 후 호환 가능한 값은 유지되고 제거된 input 값은 정리된다.

## 실제 변경 사항

7단계 조사에서 Studio 템플릿을 실행할 수 있는 사용자용 페이지 자체가 없다는
것을 확인해, 이 단계에서 스키마·API와 함께 실행 페이지도 만들었다(7단계
문서 참고).

- **스키마**: `20260715060000_create_template_studio_user_states.sql`로
  `template_studio_user_states(id, template_id, user_id, base_revision_no,
  runtime_values, version, created_at, updated_at)`를 만들고
  `(template_id, user_id)` UNIQUE, `template_studio_documents`와 동일한
  `update_template_studio_updated_at` 트리거를 재사용했다. 원격 미반영 로컬
  전용 테이블이라 `types/supabase.ts`에는 추가하지 않고(기존 Studio 테이블과
  동일한 관례) `templateStudioPersistenceService.ts`에 수동 Row/Record 타입을
  추가했다.
- **공통 entitlement 헬퍼**: `TemplateService.hasAccess()` 하나만 쓰던 것을
  `TemplateService.resolveEntitlement()`로 감싸 관리자 우회 로직까지 한 곳에
  모았다. `GET /api/template-access`도 이 헬퍼를 쓰도록 리팩터링해 route guard와
  신규 runtime API가 완전히 같은 판정 경로를 쓴다.
- **API** `GET/PUT /api/user/templates/{id}/runtime`
  (`src/app/api/user/templates/[id]/runtime/route.ts`): 로그인 → 공통
  entitlement(관리자 우회 포함) → `template_engine==='studio' &&
  status==='published'` 순서로 검사한다. entitlement 실패는 템플릿 존재 여부와
  무관하게 항상 403(enumeration 방지), 관리자처럼 entitlement를 통과했지만
  draft/legacy인 경우에만 404를 반환해 01단계에서 정한 401→403→404 관례를
  유지했다. 토큰의 `userId` 외의 사용자 id는 절대 받지 않는다.
  - `GET`: 저장된 상태가 없으면 `createStudioInitialRuntimeValues(document)`로
    기본값을 계산해 반환하되 아직 저장하지 않는다(빈 방문 기록을 만들지
    않기 위함). 저장된 상태가 있고 `base_revision_no`가 현재 published
    revision과 같으면 그대로 반환한다. 다르면(리비전 변경) 재조정한다.
  - `PUT`: `isStudioRuntimeValuesLike`로 구조를 검증하고,
    `pruneStudioRuntimeValuesForDocument`로 현재 문서에 없는 input/day 값을
    제거한 뒤, `validateStudioRuntimeValuesForDocument`로 남은 값이 문서
    제약(예: multi 슬롯 수)을 지키는지 확인한다. 실패하면 `400`.
- **리비전 호환성** (`src/utils/template-studio/runtime-state.ts`):
  `reconcileStudioUserRuntimeValues()`가 저장된 값과 현재 published revision을
  비교해 (1) 동일하면 그대로, (2) 다르지만 pruning 후에도 유효하면 pruning된
  값 + 새 revision 번호로, (3) pruning 후에도 유효하지 않으면 새 기본값으로
  재설정한다. `pruneStudioRuntimeValuesForDocument()`는 현재 문서의
  `inputs`/`domains.timetable.dayIds`에 없는 `global`/`days`/`entries`/
  `timetable.entriesByDay`/`offlineMemoByDay` 키를 제거한다. 리비전이 바뀌어
  값이 변경된 경우 GET이 즉시 재저장해 다음 조회부터 일관된 상태를 보장한다.
- **Studio 런타임 UI 재사용**: 기존 관리자 preview가 쓰던
  `TemplateStudioRuntimeShell`/`TemplateStudioRuntimeForm`(문서 렌더링,
  동적 입력 폼, PNG 저장 등 전체 런타임 UI)을 그대로 재사용했다. 새로 만든
  것은 `onSaveValues`/`isSavingValues` prop과 `backHref` prop뿐이다:
  prop이 없으면 기존 관리자 preview 동작(이미지 저장만)이 그대로 유지되고,
  prop이 있으면 "저장" 버튼이 추가로 나타나 서버에 runtime values를 저장한다.
  i18n 카피(`runtime-i18n.ts`)에 `save`/`saving`/`saveFailed`/`saved` 키를
  ko/en/ja 3개 로케일에 추가했다.
- **사용자용 실행 페이지**: `/template-studio/{templateId}`
  (`src/app/(root)/template-studio/[templateId]/page.tsx` +
  `_components/template-studio-run-client.tsx`)를 새로 만들었다. 기존
  `TemplateProtectedRoute`(`useTemplateAccess` → `GET /api/template-access`)로
  감싸 route 레벨에서도 동일 entitlement를 한 번 더 확인하고, 통과 후
  `GET/PUT .../runtime`으로 문서와 값을 불러오고 저장한다. `backHref`는
  `/my-page`로 고정했다.
- **클라이언트 서비스/훅**: `src/services/templateStudioRuntimeService.ts`,
  `useTemplateStudioRuntime`/`useSaveTemplateStudioRuntime`
  (`useTemplateStudio.ts`)를 추가하고 `queryKeys.template.templateStudioRuntime`
  키를 새로 등록했다.

## 로컬 검증

- 신규 스크립트 `scripts/check-template-studio-runtime.ts`
  (`npm run check:template-studio:runtime`)로 route 핸들러를 직접 호출해
  검증했다:
  - entitlement 없는 사용자 403(템플릿 존재 여부 무관), draft 템플릿에 대해
    일반 사용자는 403·관리자는 404
  - 최초 GET은 기본값을 반환하되 DB에 행을 만들지 않음
  - PUT 저장 후 GET이 저장된 값을 반환
  - 잘못된 `runtimeValues` payload는 400
  - 두 사용자 간 값이 섞이지 않음(격리)
  - 문서를 바꾸지 않고 재발행(revision 2)해도 호환되는 저장값이 유지되고
    `baseRevisionNo`만 갱신됨
  - `reconcileStudioUserRuntimeValues`/`pruneStudioRuntimeValuesForDocument`가
    삭제된 day의 값을 실제로 제거함
- `npm run check:template-entitlement`, `check:template-studio:persistence`
  재실행으로 회귀가 없음을 확인했다.
- `tsc --noEmit`, 변경/신규 파일 ESLint 통과.
- `/template-studio/{id}` 페이지는 브라우저에서 직접 클릭 테스트는 하지
  않았고, API·컴포넌트 조합을 코드 검토와 위 스크립트로만 검증했다.
- 원격 DB는 변경하지 않았다.

