# Phase 4. 입력, 이미지와 에셋

상태: 계획 완료, 구현 전  
선행 단계: [Phase 3 — 고급 텍스트 표현](./03-text-effects.md)  
후속 단계: [Phase 5 — 사용자 런타임과 PNG 내보내기](./05-runtime-export.md)

## 1. 목표

관리자가 완성한 썸네일 레이아웃에서 사용자가 바꿀 콘텐츠만 입력 필드로
공개한다.

텍스트와 이미지 바인딩, 이미지 업로드, crop과 웹 폰트를 연결해 재사용 가능한
썸네일 템플릿을 완성한다.

## 2. 좌측 패널

Thumbnail Studio 좌측 탭:

- Layers
- Assets
- Text Presets
- Inputs

Phase 4에서 `Assets`와 `Inputs`를 완성한다. `Text Presets`는 Phase 3의 기능을
그대로 사용한다.

## 3. 입력 모델

초기 Thumbnail Studio는 `global` 입력만 생성한다.

```ts
type ThumbnailStudioInput =
  | StudioTextInputDefinition
  | StudioImageInputDefinition
  | StudioSelectInputDefinition;
```

입력 공통 속성:

- ID
- key 또는 내부 식별자
- label
- description
- required
- order
- group

Text:

- default value
- placeholder
- max length
- multiline
- min rows

Image:

- default asset 또는 URL
- placeholder
- 권장 비율
- fit 변경 허용
- focus 변경 허용

Select:

- option value
- option label
- default option

시간표의 `day`, `entry` scope 선택은 썸네일 UI에 표시하지 않는다.

## 4. 입력 생성 흐름

### 입력 먼저 생성

```text
Inputs 탭
→ Add Input
→ 타입 선택
→ label과 기본값 설정
→ 대상 노드 선택
→ Binding 섹션에서 연결
```

### 노드에서 바로 생성

```text
텍스트 또는 이미지 선택
→ Binding 섹션
→ Create Input
→ 자동 생성된 입력 확인
→ label과 정책 보정
```

자동 생성 기본값:

- 현재 텍스트를 text input default value로 사용
- 현재 이미지를 image input default로 사용
- 노드 label을 input label 후보로 사용
- 중복되지 않는 ID 생성

## 5. 바인딩

### Text

- static text
- input text
- select option value
- select option label

### Image

- static asset
- input image
- select option별 asset

하나의 input을 여러 노드에 연결할 수 있다.

한 노드의 content source는 한 번에 하나만 활성화한다. 정적 값과 input binding을
동시에 source로 사용하지 않는다.

binding을 제거하면 현재 preview 값을 정적 값으로 보존할지 기존 정적 값을
복원할지 선택할 수 있다. 초기 기본 정책은 binding 직전의 정적 값을 보존하는
것이다.

## 6. Inputs 탭

목록:

- group별 구분
- drag 순서 변경
- 타입 아이콘
- label
- 연결된 노드 수
- required 표시

명령:

- 추가
- 복제
- 삭제
- 이름 변경
- group 이동
- 기본값 편집
- 연결 노드로 이동

삭제 정책:

- 연결된 노드가 있으면 영향 개수 표시
- 확인 후 노드 binding 제거
- 노드에는 마지막 해석 값을 정적 값으로 보존
- 다른 input과 무관한 asset은 자동 삭제하지 않음

## 7. 우측 Binding 인스펙터

텍스트와 이미지 노드에서 표시한다.

표시:

- 현재 source 종류
- 연결 input
- input 기본값
- 연결 해제
- 새 input 생성
- Inputs 탭에서 열기

선택 input을 편집 중인 경우 오른쪽 패널은 input 속성으로 전환할 수 있다.
레이어 선택 상태와 input 선택 상태를 동시에 애매하게 표시하지 않는다.

## 8. Runtime preview values

관리자 편집기 내부에 템플릿 기본값과 별개의 preview input 상태를 둔다.

```ts
type ThumbnailPreviewValues = {
  global: Record<StudioInputId, string>;
};
```

기능:

- 입력 기본값으로 초기화
- 임시 텍스트 입력
- 임시 이미지 선택
- default/preview 전환

preview 값 변경은 문서 이력과 초안 저장 대상이 아니다. 입력 definition의
default value를 변경할 때만 문서가 변경된다.

## 9. 에셋 패널

### 목록

- 이미지 thumbnail
- label
- 사용 중 표시
- 저장 상태
- 검색
- 최근 추가 순

### 명령

- 업로드
- 캔버스에 이미지 노드로 추가
- 선택 이미지 교체
- 이름 변경
- 사용 위치 찾기
- 미사용 에셋 제거

에셋 삭제:

- 사용 중이면 삭제 금지 또는 영향 확인
- 문서에서 참조 제거 전 storage 파일을 먼저 지우지 않음
- 원격 에셋 정리는 Phase 6의 asset sync를 통해 수행

## 10. 이미지 업로드

재사용 후보:

- Template Studio asset upload API
- `TemplateStudioService.uploadAssets`
- `useUploadTemplateStudioAssets`
- `src/utils/template-studio/asset-storage.ts`

Phase 4의 편집 기능은 Adapter가 제공하는 asset controller를 사용한다.

```ts
type StudioAssetController = {
  upload(files: File[]): Promise<StudioAsset[]>;
  remove(assetId: StudioAssetId): Promise<void>;
  sync(document: StudioTemplateDocument): Promise<void>;
};
```

공통 UI가 API 경로나 Supabase storage를 직접 알지 않는다.

초기 허용:

- PNG
- JPEG
- WebP

파일 크기와 이미지 크기 제한은 기존 Studio API의 정책을 재사용한다. 브라우저에서
확인하더라도 서버 검증을 대체하지 않는다.

## 11. 이미지 노드 편집

속성:

- asset
- fit: cover/contain/fill
- object position X/Y
- crop
- border radius
- opacity

이미지 교체:

- frame 위치와 크기 유지
- 기존 fit 유지
- 새 이미지 비율에 맞춘 focus 초기값 제안

crop:

- 기존 `studio-image-crop-modal.tsx`의 범용 부분 재사용
- 원본 asset을 파괴하지 않음
- 문서에는 crop 또는 object position 정보 저장
- 같은 asset을 쓰는 다른 노드에 자동 전파하지 않음

## 12. 사용자 이미지 정책

관리자는 image input별로 다음을 정한다.

- 사용자 교체 허용
- fit 변경 허용
- focus 변경 허용
- crop 허용
- 권장 비율
- 안내 문구

사용자 runtime은 허용된 control만 렌더링한다.

예시:

```ts
type StudioImageInputPolicy = {
  allowReplace: true;
  allowFitChange: false;
  allowFocusChange: true;
  allowCrop: true;
  recommendedAspectRatio: 16 / 9;
};
```

## 13. 웹 폰트

재사용:

- `StudioWebFontSource`
- `StudioWebFontLoader`
- `web-fonts.ts`
- 설정 모달의 공통 font section

Thumbnail Studio 기능:

- document font 추가
- 활성화와 비활성화
- font family 선택
- 텍스트 preset에서 font 참조
- 사용 중인 font 표시

font source 삭제 시 사용 중인 노드와 preset을 표시하고 fallback 결과를 안내한다.

## 14. 에셋과 문서 저장의 관계

문서의 `assets` map이 렌더링에 필요한 논리 에셋을 보유한다.

원격 저장 시:

1. 로컬 blob 또는 임시 URL 식별
2. storage 업로드
3. public/storage reference 반영
4. document asset map 갱신
5. 초안 저장
6. 미사용 원격 asset sync

문서 저장 성공 전에 로컬 참조를 제거하지 않는다.

Phase 4에서는 이 순서를 controller 계약으로 정의하고, 실제 원격 transaction은
Phase 6에서 기존 Studio 저장 흐름에 연결한다.

## 15. 파일 변경 계획

신규:

- Thumbnail Assets tab components
- Thumbnail Inputs tab components
- Thumbnail Binding inspector
- `src/utils/thumbnail-studio/input-factory.ts`
- `src/utils/thumbnail-studio/input-groups.ts`
- `src/utils/thumbnail-studio/image-input-policy.ts`

재사용 또는 수정:

- `src/types/template-studio.ts`
- `src/utils/template-studio/binding-resolver.ts`
- `src/utils/template-studio/input-values.ts`
- `src/utils/template-studio/asset-storage.ts`
- `src/app/(root)/template-studio/_components/studio-image-crop-modal.tsx`
- `src/app/(root)/template-studio/_components/studio-web-font-loader.tsx`
- Phase 2 Thumbnail inspector

데이터 계층 연결:

- `src/hooks/query/useTemplateStudio.ts`
- Template Studio browser service
- asset upload/sync API

Phase 6에서 템플릿 종류 파라미터를 적용한다.

## 16. 구현 순서

1. input presentation과 image policy 타입
2. Inputs 탭 목록과 기본 편집
3. text input 생성과 text binding
4. 관리자 preview input state
5. image input 생성과 image binding
6. Assets 탭
7. 이미지 업로드 controller
8. image fit과 focus
9. crop modal 연결
10. select input과 option별 결과
11. input 순서와 group
12. web font 설정 연결
13. 미사용 에셋 정리 계약

## 17. 완료 조건

- 관리자가 global text, image와 select input을 만들 수 있다.
- 노드에서 input을 바로 만들고 연결할 수 있다.
- 하나의 input을 여러 노드가 공유할 수 있다.
- Inputs 탭의 순서와 group이 사용자 UI 순서를 결정한다.
- 관리자 preview 값은 문서 default와 분리된다.
- 이미지를 업로드하고 노드에 추가하거나 교체할 수 있다.
- image fit, focus와 crop을 설정할 수 있다.
- 사용자 이미지 권한을 input별로 설정할 수 있다.
- 웹 폰트를 문서와 텍스트 preset에서 사용할 수 있다.
- 시간표의 day/entry/builtin input이 썸네일 UI에 나타나지 않는다.

## 18. 이 단계에서 하지 않는 일

- 사용자 runtime 페이지
- PNG 다운로드
- 사용자 결과 서버 저장
- AI 이미지 생성
- 배경 제거
- 원격 preset 소유권
- 상세 테스트 계획
