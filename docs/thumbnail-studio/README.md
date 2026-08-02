# Thumbnail Studio 개발 문서

최종 수정: 2026-08-02
상태: 전체 계획 수립. Phase 0A 실행 완료, Phase 1·2 구현 완료,
Phase 3 §15 1~13 구현 완료(코드·회귀 검증), Phase 4 구현 완료(패키지 1~12,
자동 검증과 브라우저 실측 가능 범위 통과)

## 1. 목표

현재 Template Studio의 범용 에디터 기반을 사용해 새로운 썸네일 템플릿 제작
시스템을 만든다.

에디터의 외형과 기본 조작은 Template Studio와 동일하게 유지한다.

- 동일한 상단 도구 모음 프레임
- 동일한 좌측 사이드바와 레이어 시스템
- 동일한 중앙 캔버스와 뷰포트
- 동일한 우측 속성 패널 프레임
- 동일한 선택, 이동, 이력, 복사·붙여넣기 방식

시간표에만 필요한 기능은 공통 UI에서 분리해 Template Studio Adapter가
소유한다. Thumbnail Studio는 같은 공통 셸에 썸네일 전용 패널과 명령을
주입한다.

## 2. 제품 구성

### 관리자용 Thumbnail Studio

관리자가 썸네일 템플릿의 구조와 디자인을 제작하는 전체 편집기다.

주요 기능:

- 캔버스와 배경 설정
- 텍스트, 이미지, 그룹, 기본 도형 배치
- 레이어 구조와 공통 속성 편집
- 다중 아웃스트로크와 그림자
- 텍스트 효과 프리셋
- 사용자 입력 필드와 노드 바인딩
- 에셋과 웹 폰트
- 초안 저장과 발행

### 사용자용 Thumbnail Editor

발행된 템플릿에 콘텐츠를 입력하고 PNG로 내려받는 제한형 편집기다.

초기 사용자는 관리자가 공개한 텍스트와 이미지만 변경한다. 레이어 이동과
템플릿 구조 편집은 허용하지 않는다.

## 3. 핵심 구조

```text
Studio Core
├── Editor Shell
├── Top Toolbar
├── Left Sidebar / Layer Panel
├── Canvas Viewport
├── Properties Panel
├── Document / Selection / History
├── Graph Commands
└── Shared Renderer

Timetable Studio Adapter
├── Cards / Timetable workspace
├── Component Set / Status
├── Timetable composition
└── Timetable property sections

Thumbnail Studio Adapter
├── Thumbnail document factory
├── Assets / Text Presets
├── Text effects
├── Thumbnail inputs
└── Thumbnail property sections
```

공통 UI는 시간표 도메인 타입과 상태를 직접 참조하지 않는다. 각 Adapter가
공통 UI에 표시 값, 섹션, 이벤트 핸들러를 전달한다.

## 4. 현재 코드 기준

재사용 기반:

- `src/types/template-studio.ts`
- `src/app/(root)/template-studio/_components/studio-renderer.tsx`
- `src/app/(root)/template-studio/_components/studio-canvas-viewport.tsx`
- `src/utils/template-studio/graph-editor.ts`
- `src/utils/template-studio/layer-order.ts`
- `src/utils/template-studio/object-layout.ts`
- `src/utils/template-studio/binding-resolver.ts`
- `src/utils/template-studio/input-values.ts`
- `src/utils/template-studio/web-fonts.ts`
- `src/hooks/query/useTemplateStudio.ts`
- `src/services/server/templateStudioPersistenceService.ts`

먼저 분리할 대상:

- `src/app/(root)/template-studio/_components/template-studio-client.tsx`
  - 상단 바, 좌측 패널, 우측 패널이 인라인으로 구성돼 있다.
  - 범용 선택·이력·클립보드와 시간표 상태가 같은 컴포넌트에 있다.
- `src/app/(root)/template-studio/_components/studio-settings-modal.tsx`
  - 카드와 시간표 설정 계약을 동시에 받는다.
- `src/components/AutoResizeTextCard/AutoResizeText.tsx`
  - 자동 계산한 글자 크기와 줄 배치를 외부 효과 레이어가 공유할 수 없다.

신규 기반으로 사용하지 않을 대상:

- `src/hooks/useThumbnailEditor.ts`
  - 기존 카드와 시간표 편집 상태에 연결된 레거시 훅이다.

## 5. 단계별 문서

1. [Phase 0 — 제품 계약과 문서 모델](./00-product-contract.md)
2. [Phase 0A — 텍스트 효과와 PNG 렌더링 선행 스파이크](./00a-rendering-feasibility-spike.md)
3. [Phase 1 — Studio Core와 Adapter 분리](./01-studio-core-extraction.md)
4. [Phase 2 — 썸네일 기본 편집기](./02-basic-thumbnail-editor.md)
5. [Phase 3 — 고급 텍스트 표현](./03-text-effects.md)
6. [Phase 4 — 입력, 이미지와 에셋](./04-inputs-assets.md)
7. [Phase 5 — 사용자 런타임과 PNG 내보내기](./05-runtime-export.md)
8. [Phase 6 — 저장, 발행과 카탈로그 통합](./06-persistence-catalog.md)

전체 기능 범위와 배경 설명은
[전체 기능 계획](./overview.md)에 정리한다.

## 6. 개발 순서

```text
Phase 0: 제품 계약
    ↓
Phase 0A: PNG와 텍스트 효과 렌더링 스파이크
    ↓
Phase 1: Studio Core 분리
    ↓
Phase 2: 기본 Thumbnail Studio
    ↓
Phase 3: 텍스트 효과
    ↓
Phase 4: 입력과 에셋
    ↓
Phase 5: 사용자 런타임과 PNG
    ↓
Phase 6: 저장·발행·카탈로그
```

Phase 0A에서 PNG 표준 라이브러리와 텍스트 효과 렌더링 방식을 확정한다. 같은
DOM renderer를 사용한다는 이유만으로 화면과 PNG가 동일하다고 가정하지 않는다.
실행 결과 `modern-screenshot`과 DOM effect layer로 정했고, 자동 크기 텍스트가
줄바꿈 경계에서 취약하다는 제한을 함께 기록했다. Phase 3과 Phase 5는
[§11 결정 기록](./00a-rendering-feasibility-spike.md#11-결정-기록)을 기준으로 구현한다.

Phase 1을 건너뛰고 Thumbnail Studio 화면을 먼저 복제하지 않는다. 그렇게 하면
상단의 `Cards / Timetable` 전환, 좌측의 `Component Set`, 우측의 시간표 속성과
같은 전용 기능이 새 편집기에 유입되거나 공통 UI가 두 벌로 갈라진다.

Phase 2~4는 로컬 문서 상태를 이용한 관리자 편집 수직 기능을 먼저 완성한다.
Phase 5에서 발행 문서 사용 흐름을 만들고, Phase 6에서 기존 Studio 저장·상품
운영 구조에 연결한다.

## 7. 단계 상태

| 단계 | 상태 | 핵심 결과 |
| --- | --- | --- |
| 00. 제품 계약 | 계획 완료 | 템플릿 종류, 권한, 노드와 문서 계약 |
| 0A. 렌더링 스파이크 | 실행 완료 | `modern-screenshot`과 DOM effect layer 결정 |
| 01. Studio Core | 구현 진행 중 | 공통 셸과 Timetable/Thumbnail Adapter |
| 02. 기본 편집기 | 구현 완료 | 썸네일 문서와 기본 오브젝트 편집 |
| 03. 텍스트 효과 | 구현 완료 (§15 1~13) | `StudioText`, 다중 아웃스트로크와 공용 측정 |
| 04. 입력·에셋 | 구현 완료 (패키지 1~12, 실측 가능 범위 통과) | 사용자 입력 바인딩과 이미지 워크플로 |
| 05. 런타임·PNG | 계획 완료 | 제한형 사용자 편집과 이미지 다운로드 |
| 06. 운영 통합 | 계획 완료 | 저장, 발행, 템플릿 분류와 카탈로그 연결 |

구현을 시작하거나 완료할 때 이 표와 해당 단계 문서의 상태를 함께 갱신한다.

## 8. 공통 결정

### 기본값

- 관리자 라우트: `/admin/thumbnail-studio`
- 관리자 편집 라우트: `/admin/thumbnail-studio/[templateId]/edit`
- 사용자 라우트: `/thumbnail/[templateId]`
- 기본 캔버스: 1280 × 720
- 사용자 편집 권한: 공개된 입력 필드만
- 초기 결과 저장: 별도 저장 없이 PNG 다운로드
- 텍스트 프리셋: 프로젝트 공용, 적용 시 노드에 복사
- 프리셋 출처: `builtin`과 `custom`을 명시
- stroke 두께: glyph 바깥쪽 실효 두께
- 초기 도형: 사각형과 둥근 사각형
- 초기 내보내기: PNG

### 변경 불변식

- 기존 시간표 문서의 저장 형식과 렌더 결과를 깨지 않는다.
- 공통 UI를 파일 복사로 나누지 않는다.
- 공통 컴포넌트에 시간표 도메인 상태를 넣지 않는다.
- graph 기반 작성 화면, 사용자 미리보기와 PNG가 `StudioRenderer` → `StudioText`
  경로를 공유하고, graph 밖 composition도 같은 `StudioText` 표현을 사용한다.
- PNG rasterizer가 해당 렌더러의 핵심 효과를 보존하는지 먼저 확인한다.
- 텍스트 효과를 여러 실제 그래프 노드로 만들지 않는다.
- 썸네일 화면에서 직접 HTTP 요청을 만들지 않는다.
- 원격 DB 변경은 사용자 명시 요청 없이 실행하지 않는다.

## 9. 초기 범위에서 제외

- 브러시와 자유 그리기
- 자유 벡터 패스
- 레이어 마스크
- 텍스트 휘기
- 3D 텍스트
- PSD 가져오기와 내보내기
- 실시간 공동 편집
- 다중 페이지와 애니메이션
- 사용자의 자유 레이어 배치
- 상세 테스트 케이스 문서

기능별 완료 상태와 구현 경계는 각 단계 문서에 기록한다. 테스트 설계가 필요해질
때는 구현 계획과 분리된 별도 검증 문서로 작성한다.

## 10. 관련 문서

- [전체 Thumbnail Studio 기능 계획](./overview.md)
- [Template Studio 개발 계획](../template-studio-development-plan.md)
- [Template System 통합 계획](../template-system-integration/README.md)
- [Template Hub 개발 계획](../template-hub-development/README.md)
