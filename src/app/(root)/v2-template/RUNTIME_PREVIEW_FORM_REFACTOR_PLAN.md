# V2 Runtime Preview/Form Refactor Plan

## 1. Goal
- `v2`를 레거시 렌더러 의존 없이 독립 런타임으로 운영한다.
- `/v2-template/[templateId]`는 "작성 화면" 역할에 집중하고, 에디터(`admin/template-editor`)와 책임을 분리한다.
- 입력(Form)과 렌더(Preview)를 분리 가능한 구조로 리팩토링해 유지보수성과 확장성을 높인다.

## Progress (2026-04-16)
- 완료
  - Phase 0: `/v2-template/[templateId]` 라우트 baseline 구성
  - Phase 1: `runtime-shell`/`runtime-toolbar` 도입
  - Phase 2: `runtime-form` 구현 + `fields/*` 분리
  - Phase 3: scene/card/text/asset resolver 분리(`src/utils/v2/runtime-resolver/*`)
  - runtime preview가 editor 전용 `preview-scale` 파일 의존하지 않도록 shared로 분리
  - runtime 경로에서 runtime alias(`template-runtime-*`, `useTemplateRuntime`) 사용 정리
  - runtime 전용 검증 스크립트 추가(`npm run check:v2-runtime`)
  - Phase 4 cleanup 완료(런타임 경로 기준)
  - runtime core 구현본을 runtime 네이밍으로 정리(`template-runtime-*`, `useTemplateRuntime`, `template-runtime-ui`)
  - v2-template component 영역의 context/hook import를 runtime 네이밍(`useTemplateRuntime*`)으로 치환
- 진행 중
  - 선택 과제: editor 전용 타입(`template-editor-ui`)의 물리 파일명도 runtime naming으로 정리할지 검토
- 현재 검증 메모
  - `npm run lint:v2-runtime` 통과(Next `no-img-element` 경고 2건 존재)
  - `npm run typecheck:v2-runtime` 통과
  - 전체 `npx tsc --noEmit`은 `.next/types`의 기존 누락 경로 이슈로 실패(이번 리팩터링과 무관)

## 2. Scope
- 포함
  - Runtime 전용 Shell/Preview/Form 신규 구조 설계 및 구현
  - `formSchema` 기반 동적 입력 엔진 구현
  - Preview 계산(해석) 로직과 렌더 UI 분리
  - Runtime 저장소(v2 local storage) 기반 자동저장 적용
- 제외
  - Admin 편집기(Layers/Properties/Publish) 기능 변경
  - v1(`/time-table/*`) 기능 변경
  - 권한/인증 가드 도입

## 3. Target Architecture

### 3.1 Runtime route responsibilities
- `/v2-template/[templateId]`
  - renderConfig 조회
  - runtime input state hydrate
  - preview + form 동시 렌더
- `/admin/template-editor/[templateId]/edit`
  - 구조 편집/스타일 편집/발행

### 3.2 Component structure (new)
- `src/app/(root)/v2-template/_components/runtime/runtime-shell.tsx`
- `src/app/(root)/v2-template/_components/runtime/runtime-preview.tsx`
- `src/app/(root)/v2-template/_components/runtime/runtime-form.tsx`
- `src/app/(root)/v2-template/_components/runtime/runtime-toolbar.tsx`
- `src/app/(root)/v2-template/_components/runtime/fields/*`

### 3.3 Resolver separation
- `src/utils/v2/runtime-resolver/*`
  - `resolve-runtime-scene-model.ts`
  - `resolve-runtime-card-model.ts`
  - `resolve-runtime-text-value.ts`
  - `resolve-runtime-asset-model.ts`
- 역할
  - `renderConfig + runtimeData` -> `resolved model`
  - 컴포넌트는 resolved model만 렌더

## 4. State Design

### 4.1 Runtime input state
- 소스: `useTemplateData` + `useTemplateState`
- 내용
  - `cards(TDefaultCard[])`
  - `globalData`
  - `profileText`, `memoText`, `imageSrc`, `selectedOptions`

### 4.2 Runtime UI state
- 내용
  - 선택 요일 인덱스
  - 선택 회차 인덱스
  - 모바일 탭 상태(Preview/Form)

### 4.3 Render config state
- read-only 원칙
- API 결과를 normalize 후 제공

## 5. Form strategy
- `formSchema.fields`를 단일 소스로 사용
- `scope`별 섹션 분리
  - `entry`
  - `card`
  - `global`
- 필드 타입 렌더러 레지스트리
  - `text`, `textarea`, `time`, `date`, `select`, `number`
- 기존 `TimeTableInputList` 직접 재사용 대신, runtime 전용 폼으로 구현

## 6. Preview strategy
- 기존 scene 컴포넌트 재사용은 허용하되 입력 의존 계산 코드를 resolver로 이동
- 최종 렌더는 다음 2단계
  1) resolve
  2) render
- 하이라이트/편집 가이드는 runtime에서 비활성(필요 시 옵션화)

## 7. Persistence strategy
- runtime: v2 local autosave only
  - 이미 분리한 `src/utils/v2/localStorage.ts` 사용
- admin editor: draft/publish 유지
- 저장 대상
  - runtime input state only
- 비저장 대상
  - renderConfig

## 8. Milestones

### Phase 0: Baseline
- `/v2-template/[templateId]` 라우트 고정
- renderConfig fetch + empty/404 처리 정리

### Phase 1: Runtime shell
- runtime-shell + runtime-toolbar 추가
- 좌측 preview / 우측 form(모바일 탭) 레이아웃 확정

### Phase 2: Runtime form
- formSchema 기반 입력 필드 엔진 구현
- scope/entry-selector/회차 추가/삭제 UX 반영

### Phase 3: Preview resolver
- 카드/텍스트/asset 값 계산 분리
- scene 렌더러에 resolved model 주입

### Phase 4: Cleanup
- runtime에서 editor 의존 import 제거
- 문서/타입/테스트 정리

## 9. Risks and mitigations
- 리스크: 계산 로직 이관 중 렌더 불일치
  - 대응: 기존 렌더 결과와 golden screenshot 비교
- 리스크: 입력 스키마 확장 시 폼 회귀
  - 대응: 필드 타입별 렌더러 테스트 추가
- 리스크: 저장 키 충돌
  - 대응: v2 page-id 규칙 강제, 경로별 e2e 확인

## 10. Validation checklist
- `npm run check:v2-runtime`
- `npx tsc --noEmit` (legacy `.next/types` 이슈 분리 후)
- `/v2-template/[templateId]` 진입/새로고침 후 값 복원
- 요일/회차 변경 시 preview 즉시 반영
- `offline/online` 표시 모드 반영
- profile/memo 표시 토글 반영
- entry/card/global 스코프 필드 수정 반영

## 11. Definition of done
- Runtime 경로에서 editor 전용 패널 없이 작성 가능
- formSchema 변경이 runtime form에 자동 반영
- preview 렌더 로직이 resolver 계층으로 분리
- v1 경로에 영향 없음
