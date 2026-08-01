# Phase 5. 사용자 런타임과 PNG 내보내기

상태: 계획 완료, 구현 전  
선행 단계:
[Phase 0A — PNG 렌더링 선행 스파이크](./00a-rendering-feasibility-spike.md),
[Phase 4 — 입력, 이미지와 에셋](./04-inputs-assets.md)  
후속 단계: [Phase 6 — 저장, 발행과 카탈로그 통합](./06-persistence-catalog.md)

## 1. 목표

발행된 썸네일 템플릿을 사용자가 입력 중심으로 편집하고, 화면과 동일한 결과를
PNG로 내려받게 한다.

사용자 화면은 관리자 Studio의 레이어와 속성 패널을 노출하지 않는다. 입력
폼과 결과 미리보기에 집중한다.

## 2. 라우트

관리자 draft preview:

```text
/admin/thumbnail-studio/[templateId]/preview
```

사용자 runtime:

```text
/thumbnail/[templateId]
```

관리자 preview는 draft 또는 저장된 revision을 명시적으로 선택할 수 있다.
사용자 runtime은 발행 revision만 사용한다.

## 3. 화면 구성

데스크톱:

```text
┌──────────────────────────────────────────────┐
│ 템플릿 이름                    초기화 다운로드 │
├──────────────────┬───────────────────────────┤
│ 입력 폼           │ 결과 미리보기              │
│ - 텍스트          │                           │
│ - 이미지          │                           │
│ - 선택            │                           │
└──────────────────┴───────────────────────────┘
```

모바일:

```text
템플릿 정보
→ 미리보기
→ 입력 폼
→ 고정 다운로드 액션
```

복잡한 layer tree, transform inspector와 자유 drag는 표시하지 않는다.

## 4. 런타임 데이터 흐름

```text
Page
→ React Query hook
→ runtime browser service
→ /api/user/templates/[id]/runtime
→ server service
→ published Studio document
```

API 응답:

```ts
type ThumbnailRuntimePayload = {
  template: {
    id: string;
    name: string;
    kind: "thumbnail";
    revisionNo: number;
  };
  document: StudioTemplateDocument;
  initialValues: StudioRuntimeValues;
};
```

서버 확인:

- template engine이 `studio`
- template kind가 `thumbnail`
- published 상태와 revision 존재
- 사용자 접근 권한
- 문서 metadata와 DB kind 일치

## 5. 초기 입력값

초기 값 생성:

1. text input의 `defaultValue`
2. image input의 default asset 또는 URL
3. select input의 `defaultValue`
4. required 값 누락 상태 표시

Thumbnail Studio는 `StudioRuntimeValues.global`만 사용한다.

시간표 runtime 필드:

- `days`
- `entries`
- `timetable`

사용자 UI에서 읽거나 생성하지 않는다. 공용 타입을 도메인별로 분리하는 작업이
완료되기 전에는 빈 호환 값으로 유지할 수 있다.

## 6. 입력 폼

### 표시 순서

1. input group order
2. input order
3. 안정적인 ID 순서

### Text

- 한 줄 또는 여러 줄
- 최대 글자 수
- 현재 글자 수
- required
- placeholder
- help text

### Image

- 파일 선택
- 현재 이미지 preview
- 제거 또는 기본값 복원
- 허용된 경우 fit
- 허용된 경우 focus
- 허용된 경우 crop
- 권장 비율 안내

### Select

- segmented control 또는 select
- option label
- default option

폼 컴포넌트는 기존 Studio runtime UI primitive를 재사용할 수 있다.

- `studio-runtime-field.tsx`
- `studio-runtime-setting-row.tsx`
- `studio-runtime-segmented-control.tsx`
- `studio-runtime-image-crop-modal.tsx`

시간표의 day/week navigation과 entry form은 사용하지 않는다.

## 7. 실시간 미리보기

```tsx
<StudioRenderer
  document={document}
  runtimeValues={runtimeValues}
  mode="runtime"
/>
```

원칙:

- 관리자와 같은 node graph
- 같은 binding resolver
- 같은 text renderer
- 같은 web font loader
- 선택선과 guide 없음
- 원본 canvas 비율 유지
- 화면에는 반응형 scale만 적용

입력 변경은 React runtime state만 갱신한다. document를 매번 복사하거나 수정하지
않는다.

## 8. 사용자 이미지

브라우저에서 선택한 이미지는 임시 blob URL 또는 기존 runtime image 처리 방식을
사용한다.

재사용 후보:

- `runtime-image-blob.ts`
- `runtime-image-crop.ts`
- `templateStudioRuntimeImageStorage.ts`

초기 정책:

- PNG 다운로드까지 브라우저 임시 상태 유지
- 서버 업로드 필수 아님
- 페이지 이탈 시 임시 URL 정리
- document asset map에 사용자 이미지를 영구 추가하지 않음

사용자 상태 저장을 후속 도입할 경우 기존 runtime image storage 계약을 확장한다.

## 9. 내보내기

저장소에는 `html-to-image`와 `modern-screenshot`이 함께 있으므로 기존
`toPng` 호출을 그대로 표준으로 간주하지 않는다.

[Phase 0A 선행 스파이크](./00a-rendering-feasibility-spike.md)에서 선택한 PNG
라이브러리와 옵션만 공용 export controller 안에서 사용한다.

```text
Thumbnail runtime
Admin preview
Template Studio runtime
        ↓
StudioPngExporter
        ↓
Phase 0A에서 선택한 rasterizer 하나
```

UI 컴포넌트가 `html-to-image` 또는 `modern-screenshot`을 직접 import하지 않게
한다. 기존 Legacy TimeTable 경로의 라이브러리 통합은 별도 범위로 둘 수 있지만,
신규 Studio export 경로에서는 두 라이브러리를 혼용하지 않는다.

```ts
type StudioPngExportOptions = {
  width: number;
  height: number;
  pixelRatio: number;
  background: string | null;
  fileName: string;
};
```

초기 기본값:

- canvas 원본 width와 height
- pixel ratio 1
- document background
- PNG

투명 배경:

- thumbnail domain에서 허용된 경우 background null
- export DOM의 부모 배경도 투명

## 10. Export 준비 상태

PNG 생성 전에 다음 resource를 기다린다.

- document web fonts
- 정적 image asset
- 사용자 image blob
- text layout 측정
- effect layer layout

공용 상태:

```ts
type StudioRenderReadiness = {
  fontsReady: boolean;
  imagesReady: boolean;
  layoutReady: boolean;
  blockingErrors: StudioRenderError[];
};
```

준비되지 않은 상태에서는 다운로드를 비활성화하고 진행 상태를 표시한다.

timeout 후 fallback 이미지를 조용히 다운로드하지 않는다. 문제 resource와 다시
시도 액션을 안내한다.

## 11. Export DOM

화면 preview DOM을 그대로 캡처하되 편집 또는 반응형 wrapper는 제외한다.

구조:

```text
responsive preview frame
└── fixed-size export root
    └── StudioRenderer
```

캡처 대상은 `fixed-size export root`다.

제외:

- input form
- zoom transform
- selection overlay
- guide
- loading indicator
- toast

텍스트 effect outset이 캔버스 바깥으로 나가더라도 최종 이미지는 canvas 경계에서
잘리는 것이 정상이다. 캔버스 안의 group overflow 때문에 의도치 않게 잘리는
문제와 구분한다. effect outset을 적용한 `visualBounds`는 이 진단에만 사용하고,
fixed-size export root의 width/height를 자동으로 확장하지 않는다.

## 12. 파일 이름

기본:

```text
{template-name}-{YYYYMMDD-HHmm}.png
```

파일 시스템에 사용할 수 없는 문자를 제거한다. 사용자 입력값을 파일 이름에
자동 포함하지 않는다.

## 13. 관리자 Preview

관리자 preview의 목적:

- 편집 UI 없이 결과 확인
- 기본값과 임시 runtime 값 확인
- PNG 생성
- draft와 published 구분

표시:

- 문서 출처
- revision
- canvas 크기
- resource 준비 상태

관리자 preview도 사용자 runtime과 같은 Thumbnail runtime shell을 사용하고
문서 로드 source만 다르게 한다.

## 14. 오류와 빈 상태

처리:

- 템플릿 없음
- 발행본 없음
- 접근 권한 없음
- 잘못된 template kind
- 문서 validation 실패
- 폰트 로딩 실패
- 이미지 로딩 실패
- PNG 생성 실패

사용자 화면에는 내부 진단 JSON을 그대로 표시하지 않는다. 관리자 preview에서는
문서 진단을 확인할 수 있다.

## 15. 파일 변경 계획

신규:

- `src/app/(root)/thumbnail/[templateId]/page.tsx`
- `src/app/(root)/thumbnail/_components/thumbnail-runtime-shell.tsx`
- `src/app/(root)/thumbnail/_components/thumbnail-runtime-form.tsx`
- `src/app/(root)/admin/thumbnail-studio/[templateId]/preview/page.tsx`
- `src/components/studio/runtime/studio-export-root.tsx`
- `src/utils/template-studio/png-export.ts`
- `src/hooks/query/useThumbnailStudioRuntime.ts`
- Thumbnail runtime browser service

재사용 또는 수정:

- `src/app/(root)/template-studio/_components/studio-renderer.tsx`
- `src/app/(root)/template-studio/_components/runtime/ui/*`
- `src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell.tsx`
- `src/services/browser/templateStudioRuntimeImageStorage.ts`
- `src/utils/template-studio/input-values.ts`
- `src/utils/template-studio/binding-resolver.ts`
- `src/utils/template-studio/web-fonts.ts`

Phase 6에서 실제 API와 권한 경로를 최종 연결한다.

## 16. 구현 순서

1. Thumbnail runtime payload 타입
2. initial global values 생성
3. Thumbnail runtime shell
4. text와 select form
5. 반응형 preview
6. 사용자 image 입력
7. focus와 crop
8. render readiness
9. Phase 0A 결정에 따른 공용 PNG export controller
10. 다운로드 UI
11. 관리자 preview
12. runtime 오류와 빈 상태

## 17. 완료 조건

- 발행 썸네일 문서가 제한형 사용자 화면에서 열린다.
- 입력이 정의된 group과 order대로 표시된다.
- text, image와 select 변경이 미리보기에 즉시 반영된다.
- 사용자가 템플릿 레이어와 위치를 변경할 수 없다.
- preview와 PNG가 같은 renderer를 사용한다.
- 신규 Studio export가 선택된 rasterizer 하나만 사용한다.
- Phase 0A에서 확인한 stroke와 shadow 표현이 PNG에 유지된다.
- web font와 image 준비 전 PNG 생성을 시작하지 않는다.
- 결과 PNG가 원본 canvas 크기를 사용한다.
- 투명 배경 설정이 PNG에 반영된다.
- 시간표 form과 week/day 상태가 Thumbnail runtime에 나타나지 않는다.

## 18. 이 단계에서 하지 않는 일

- 사용자 결과 서버 저장
- JPG와 WebP
- pixel ratio 선택 UI
- batch export
- social platform 직접 업로드
- 상세 테스트 계획
