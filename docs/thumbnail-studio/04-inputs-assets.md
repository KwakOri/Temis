# Phase 4. 입력, 이미지와 에셋

상태: 패키지 1~12 구현 및 자동 검증 완료, 브라우저 실측 가능 범위 통과

브라우저에서 실측 가능한 텍스트·이미지 preview, clipping/group 진단, 잠금, stroke
표시, 회전 visual bounds와 draft preview는 정상 동작을 확인했다. legacy scalar 주입,
실제 custom font fallback fixture, crop·PNG parity처럼 현재 브라우저 흐름에서 직접
재현할 수 없는 항목은 자동 회귀 검증으로 대체한다.

선행 단계: [Phase 3 — 고급 텍스트 표현](./03-text-effects.md)

후속 단계: [Phase 5 — 사용자 런타임과 PNG 내보내기](./05-runtime-export.md)

## 1. 목표

관리자가 완성한 썸네일 레이아웃에서 사용자가 바꿀 콘텐츠만 입력으로 공개한다.
Thumbnail Studio에서 입력 정의, 노드 바인딩, 관리자 미리보기, 로컬 이미지 에셋과
이미지 편집 정책까지 authoring 계약을 완성한다.

Phase 4의 결과는 Phase 5 사용자 런타임이 별도 변환 없이 읽을 수 있어야 하며,
authoring 화면도 기존 `StudioRenderer`와 binding resolver를 그대로 사용한다.

## 2. 착수 판단과 선행 게이트

Phase 3 §15 9~13의 코드, 타입, 린트와 회귀 검사 결과는 Phase 4 착수를 막지 않는다.
다음 작은 진단 오탐만 Phase 4 기능 변경 전에 먼저 닫는다.

- `hidden`인 group 또는 hidden ancestor 아래 group을 group overflow 진단에서 제외한다.
- hidden group의 visible child가 overflow하더라도 경고가 0개임을 순수 함수 테스트로
  고정한다.
- 저장 노드, renderer와 export 결과는 변경하지 않고 진단 필터만 수정한다.

이 게이트를 제외한 Phase 3 기능의 재설계나 범위 확장은 Phase 4에 포함하지 않는다.

## 3. 범위와 기존 계약 재사용

좌측 탭 중 `Assets`와 `Inputs`를 완성한다. `Layers`는 Phase 2, `Text Presets`는
Phase 3 구현을 유지한다.

새 `ThumbnailStudioInput` 모델은 만들지 않는다. 다음 기존 계약을 단일 기준으로
사용한다.

- `StudioInputDefinition`
- `StudioInputPresentation`
- `StudioImageInputPolicy`
- `StudioBinding`
- `StudioRuntimeValues`
- `StudioAsset`
- `createStudioInputDefinition()`
- `createStudioBindingForInput()`
- binding resolver와 `StudioRenderer`

Thumbnail Studio에서 새로 생성할 수 있는 scope는 `global`뿐이다. 문서에 외부
JSON으로 들어온 `day`, `entry` 입력은 validator에서 거부하고 UI에도 표시하지 않는다.
내부 식별자는 기존 input의 `id` 하나만 사용하며 별도 `key`를 추가하지 않는다.

## 4. 입력 모델과 표시 순서

지원 타입:

- text: default value, placeholder, max length, multiline, min rows
- image: default URL, placeholder, 권장 비율과 편집 권한
- select: option value/label, default option, text 또는 asset 결과

공통 편집 속성:

- label
- description
- required
- `presentation.order`
- `presentation.groupId`
- `presentation.helpText`

정렬과 group 규칙:

1. input은 유효한 `presentation.order` 오름차순, 그다음 ID로 안정 정렬한다.
2. group 순서는 첫 member의 정렬 위치로 정한다.
3. `groupId`가 없거나 빈 문자열이면 ungrouped로 취급한다.
4. input 또는 group drag가 끝나면 전체 input의 order를 0부터 연속된 값으로
   한 번만 다시 쓴다.
5. group 이름 변경은 해당 group member의 `groupId`를 한 history transaction에서
   변경한다.

별도 group registry는 만들지 않는다. 빈 group의 독립 저장은 지원하지 않는다.

## 5. 입력 생성과 편집 명령

두 흐름을 제공한다.

```text
Inputs 탭 → Add Input → 타입 선택 → 속성 편집 → 노드에서 연결
```

```text
텍스트/이미지 노드 선택 → Binding → Create Input → 생성과 연결 → Inputs 탭에서 보정
```

노드에서 바로 만들 때 기본값:

- text input은 현재 해석된 텍스트를 default value로 사용한다.
- image input은 현재 해석된 asset 또는 URL을 default로 사용한다.
- input label은 노드 label을 우선하고, 없으면 타입별 기본 label을 사용한다.
- ID는 기존 문서와 충돌하지 않게 생성한다.

추가, 복제, 이름 변경, 속성 변경, 순서 변경, group 이동과 삭제는 UI에서 document를
직접 mutate하지 않고 thumbnail command 계층을 통한다. 모든 명령은 locked node를
변경하지 않으며 한 사용자 동작은 한 undo step이어야 한다.

복제 시 새 input ID를 발급하고 select option value의 유일성을 유지한다. 기존 노드
binding은 복제된 input으로 자동 이동하지 않는다.

## 6. 바인딩 계약

지원 source:

| 노드  | source                                                    |
| ----- | --------------------------------------------------------- |
| text  | `staticText`, `inputText`, `selectText(value/label)`      |
| image | `staticAsset`, `inputImage`, `selectAsset(assetByOption)` |

- 하나의 input은 여러 노드에 연결할 수 있다.
- 한 노드의 content source는 한 번에 하나만 활성화한다.
- 연결 가능한 input은 node 타입과 resolver 호환성 검사를 통과해야 한다.
- select option value 변경은 default와 `assetByOption` key까지 같은 transaction에서
  갱신한다. input ID는 UI에서 편집하지 않는다.
- 알 수 없는 binding은 조용히 삭제하지 않고 validator/Inspector 진단으로 노출한다.

### 6.1 연결 전 정적 값

첫 static → input 전환 시 노드 metadata에 연결 직전 값을 한 번 저장한다.

```ts
type StudioBindingFallback =
  | { type: "staticText"; value: string }
  | { type: "staticAsset"; assetId?: StudioAssetId; src?: string };
```

이미 input에 연결된 노드를 다른 input으로 바꿀 때 fallback을 덮어쓰지 않는다.
metadata의 정확한 field 이름은 구현 시 기존 node meta 구조에 맞추되 공용 타입으로
정의하고 validator에 포함한다.

### 6.2 연결 해제

두 동작을 명시적으로 제공한다.

- **현재 미리보기 유지**: 현재 resolver 결과를 `staticText` 또는 `staticAsset`으로
  materialize한다. 기본 동작이다.
- **연결 전 값 복원**: 저장된 fallback을 복원한다. fallback이 없으면 비활성화하고
  이유를 안내한다.

해제 후 fallback metadata는 제거한다. 이미지 결과가 URL이고 기존 asset이 아니면
문서에 논리 `StudioAsset`을 먼저 만든 뒤 `staticAsset`으로 연결한다.

### 6.3 input 삭제

삭제 전 다음 consumer를 모두 수집한다.

- node binding
- select asset mapping
- `assetSlots`의 input 참조
- 향후 같은 공용 collector가 반환하는 참조

consumer가 있으면 노드 수와 위치를 보여 준다. 확인 시 현재 미리보기 유지 방식으로
모든 binding을 해제하고, preview 값을 제거한 뒤 input을 삭제한다. 전체 변경은 한
history transaction이다. locked consumer가 하나라도 있으면 삭제를 막고 잠금 해제를
안내한다. 연결과 무관한 asset은 자동 삭제하지 않는다.

## 7. Inputs 탭과 Binding Inspector

Inputs 탭 목록:

- group 구분과 ungrouped 영역
- drag 순서 변경
- 타입, label, required
- 연결된 노드 수
- 검색 또는 label 기반 필터

명령:

- 추가, 복제, 삭제, 이름 변경
- group 생성 효과를 내는 group 지정/이름 변경/이동
- 타입별 default와 policy 편집
- 연결된 첫 노드로 이동
- 관리자 preview 값 편집과 reset

텍스트와 이미지 노드의 우측 Binding 섹션:

- 현재 source와 연결 input
- 호환되는 input 목록
- 새 input 생성과 즉시 연결
- 연결 해제 두 방식
- Inputs 탭에서 input 열기

input 속성을 편집할 때 input 선택과 layer 선택 중 주 편집 대상을 하나만 명확히
표시한다. 캔버스 layer 선택은 유지할 수 있지만 두 Inspector를 동시에 활성 상태로
보이지 않는다.

## 8. 관리자 runtime preview

새 축약 타입을 만들지 않고 `StudioRuntimeValues`를 사용한다. Thumbnail Studio는
`global` map만 편집하며 day/entry/timetable 값은 만들지 않는다.

preview state는 `ThumbnailStudioView` 세션에 두고 document와 history, draft 저장에서
제외한다.

```ts
type ThumbnailPreviewMode = "defaults" | "session";
```

상태 규칙:

1. document를 처음 열거나 교체하면 input defaults로 초기화한다.
2. input 생성 시 해당 default를 session map에 추가한다.
3. input 삭제 시 해당 session 값을 제거한다.
4. input default 변경은 이미 사용자가 바꾼 session 값을 덮어쓰지 않는다.
5. reset은 현재 input 또는 전체 global map을 최신 defaults로 되돌린다.
6. defaults/session 전환은 session 값을 지우지 않는다.
7. preview 변경은 dirty 상태와 undo/redo를 만들지 않는다.

캔버스와 Binding Inspector는 같은 runtime values와 resolver를 사용한다.

## 9. Assets 탭

표시:

- thumbnail, label, MIME과 크기
- 사용 위치 수
- local/pending 또는 remote 상태
- 검색과 최근 추가 순

명령:

- 로컬 이미지 가져오기
- 캔버스에 image node로 추가
- 선택 image node의 asset 교체
- 이름 변경
- 사용 위치 찾기
- 선택 삭제
- 미사용 논리 asset 정리

asset consumer는 최소한 다음을 포함한다.

- image node `staticAsset`
- select input의 `assetByOption`
- node `assetSlots`
- guide/background 등 문서 내 asset ID 참조

사용 중인 asset은 즉시 삭제하지 않는다. 영향 위치를 보여 준 뒤 명시적으로 참조를
교체하거나 제거해야 한다. Phase 4의 미사용 정리는 document `assets` map만 변경하며
원격 storage 파일은 삭제하지 않는다.

## 10. 이미지 가져오기와 저장 경계

Phase 4는 원격 upload API, R2 또는 Supabase를 호출하지 않는다. 브라우저에서 파일을
검증하고 data URL 기반 `StudioAsset`을 document에 추가하는 로컬 authoring controller를
구현한다.

초기 정책:

- MIME: PNG, JPEG, WebP
- 파일당 최대 10 MiB
- 브라우저 decode 실패 시 거부
- intrinsic width/height를 읽어 asset metadata에 기록
- SVG, GIF와 외부 HTML은 허용하지 않음

저장 상태는 기존 data-image 판별과 storage metadata에서 파생하며 별도 중복 source of
truth를 저장하지 않는다.

원격 저장은 Phase 6에서 기존 asset sync와 template persistence 흐름에 연결한다.
그때의 순서는 local 참조 식별 → upload → document reference 교체 → draft 저장 →
미사용 원격 asset sync이다. Phase 4 UI가 API 경로나 storage 공급자를 알면 안 된다.

## 11. 이미지 노드 편집

속성:

- asset
- `fit`: cover/contain/fill
- focus X/Y
- crop
- border radius
- opacity

이미지 교체는 frame의 x/y/width/height, rotation, fit과 focus를 유지한다. 새 이미지에
focus 정보가 없을 때만 `50% 50%`를 기본값으로 사용한다.

focus는 공용 parser/clamp를 거쳐 0~100 범위의 `object-position`으로 저장한다.
`StudioRenderer`는 이 값을 wrapper가 아닌 실제 `<img>`에 적용해야 한다. authoring,
runtime과 export는 같은 renderer 경로를 사용한다.

crop은 기존 `studio-image-crop-modal.tsx`의 범용 UI를 재사용한다.

1. 원본 asset은 변경하지 않는다.
2. crop 결과를 새 파생 `StudioAsset`으로 만든다.
3. 선택 노드만 새 asset으로 교체한다.
4. 같은 원본을 사용하는 다른 노드와 select mapping은 유지한다.
5. crop 적용과 node 교체는 한 undo step으로 기록한다.

border radius는 실제 이미지 픽셀을 clip해야 하며 opacity는 renderer의 기존 node style
계약을 따른다.

## 12. 사용자 이미지 정책

관리자는 image input별로 다음을 설정한다.

- `allowReplace`
- `allowFitChange`
- `allowFocusChange`
- `allowCrop`
- `recommendedAspectRatio`
- `presentation.helpText` 안내 문구

수치와 boolean은 기존 `StudioImageInputPolicy`를 확장 또는 정규화해서 사용한다.
권장 비율은 유한한 양수만 저장한다.

정책은 Phase 5 사용자 runtime이 노출할 control의 권한이다. Phase 4 관리자 캔버스의
node 편집 기능을 막는 값으로 사용하지 않고, runtime용 fit/focus/crop override를
document default에 미리 저장하지 않는다.

## 13. 웹 폰트 연결 범위

웹 폰트 등록, 활성화, 로더와 font family 선택은 이미 공용 Studio 설정과
`StudioRenderer`에 연결돼 있다. Phase 4에서 이를 다시 구현하지 않는다.

추가할 범위:

- document node와 custom text preset의 font 사용 위치 수집
- 사용 중 표시
- 삭제/비활성화 전 영향 확인
- fallback family 결과 안내
- 삭제 후 dangling font reference 진단
- Assets 탭에서 노드, select mapping, asset slot과 guide의 사용 위치 표시

세션 custom preset은 document에 저장되지 않으므로 document font 삭제 확인에서 별도
세션 consumer로 표시한다.

## 14. 구현 파일 계획

정확한 component 분리는 기존 Thumbnail Studio 폴더 관례를 따른다.

신규 후보:

- `src/utils/thumbnail-studio/input-commands.ts`
- `src/utils/thumbnail-studio/input-order.ts`
- `src/utils/thumbnail-studio/input-consumers.ts`
- `src/utils/thumbnail-studio/asset-commands.ts`
- `src/utils/thumbnail-studio/asset-consumers.ts`
- `src/utils/thumbnail-studio/image-object-position.ts`
- Thumbnail Inputs tab components
- Thumbnail Assets tab components
- Thumbnail Binding inspector components

재사용 또는 수정:

- `src/types/template-studio.ts`
- `src/utils/template-studio/input-commands.ts`
- `src/utils/template-studio/input-values.ts`
- `src/utils/template-studio/binding-resolver.ts`
- `src/utils/template-studio/asset-sync.ts`
- `src/components/studio/canvas/studio-renderer.tsx`
- `src/app/(root)/template-studio/_components/studio-image-crop-modal.tsx`
- Thumbnail Studio view, layer tabs, Inspector와 command hook
- Studio validator와 document normalization

Phase 4에서 추가하지 않는 연결:

- React Query mutation
- upload/sync HTTP service
- Supabase/R2 호출
- remote asset 삭제

## 15. 작업 패키지와 권장 순서

각 패키지는 관련 순수 함수 테스트와 UI 명령 테스트를 함께 완료한다.

1. **Phase 3 진단 게이트**
   - hidden group/ancestor overflow 오탐 수정과 테스트
2. **입력 계약과 정규화**
   - global scope 제한, factory, order/group normalization, validator
3. **입력 command와 preview state**
   - CRUD, 복제 ID, 순서/group, `StudioRuntimeValues.global`, undo 경계
4. **Inputs 탭**
   - 목록, drag, 속성 편집, consumer count와 이동
5. **text binding**
   - 생성/연결, fallback snapshot, 두 해제 방식, input 삭제 영향
6. **select와 image binding**
   - option 편집, output mode, asset mapping, 호환성 진단
7. **로컬 asset controller와 Assets 탭**
   - 파일 검증, data asset, 검색/추가/교체/삭제 영향
8. **image renderer와 Inspector**
   - fit, focus/object-position, radius, opacity와 locked guard
9. **비파괴 crop**
   - crop modal 재사용, 파생 asset, 단일 node 교체, undo
10. **image input policy**
    - 권한, 권장 비율과 help text 편집/검증
11. **font와 asset 사용 위치**
    - consumer collector, 삭제 확인, 미사용 논리 asset 정리
12. **통합 회귀와 문서 마감**
    - 브라우저 흐름, renderer parity, Phase 5 handoff 계약

한 패키지에서 다른 패키지의 UI까지 미리 확장하지 않는다. 공용 타입 변경은 사용처와
validator, fixture를 같은 패키지에서 함께 갱신한다.

## 16. 검증 계획

### 순수 함수와 command 회귀

- global input 생성, 복제와 ID 충돌 방지
- order/group 안정 정렬, drag 후 연속 order와 단일 undo
- text/image/select binding 호환성
- 최초 fallback 보존과 input 전환 시 비덮어쓰기
- 두 연결 해제 방식과 input 삭제 materialize
- 하나의 input을 공유하는 여러 node consumer 수집
- preview/default 분리와 document/history 불변
- local asset MIME, 크기, decode 검증
- 사용 중 asset/font 삭제 영향 수집
- `check:thumbnail-studio:font-consumers`의 font consumer와 fallback 진단
- object-position parse/clamp와 실제 `<img>` style
- crop 파생 asset과 원본/다른 consumer 불변
- hidden group과 hidden ancestor의 overflow 진단 제외
- locked node 명령의 document/history 불변
- Thumbnail input → binding resolver → `StudioRenderer`와 preview/history handoff 통합

### 공통 정적 검증

- `npx tsc --noEmit`
- `npm run lint`
- 관련 `check:*` 스크립트
- Phase 3 text appearance/outset/transform/rasterizer 회귀
- `git diff --check`
- 변경 파일 Prettier 검사

sandbox에서 `tsx` IPC가 `EPERM`이면 `node --import tsx scripts/<check-file>` 방식으로
같은 검사를 실행한다. 저장소 정책에 따라 production build는 기본 검증에서 제외한다.

Package 11의 font consumer 회귀는 `check:thumbnail-studio:font-consumers`로,
Package 12의 자동 handoff 회귀는 `check:thumbnail-studio:integration`으로 실행한다.
이 검사는 브라우저의 실제 클릭, 폰트 로딩과 PNG 픽셀 parity를 대신하지 않는다.

### 브라우저 실측

최소 시나리오:

1. text input 생성 → 두 text node 공유 → preview 변경 → undo/redo
2. binding 교체 → 현재 값 유지 해제 → 연결 전 값 복원 해제
3. consumer가 있는 input 삭제와 영향 확인
4. image 가져오기 → 캔버스 추가 → 교체 → fit/focus 변경
5. crop 후 원본과 다른 consumer 불변 확인 → undo/redo
6. 사용 중 asset과 font 삭제 경고, 미사용 asset 정리
7. defaults/session 전환 후 dirty/history 불변 확인
8. hidden group overflow 경고 0개
9. authoring 캔버스와 `StudioRenderer` image 위치/clip 일치
10. console error와 hydration warning 없음

최근 in-app browser 실측에서 다음을 확인했다.

- text input preview 변경과 document undo/redo 경계
- image input URL preview와 draft preview 렌더링
- logical bounds가 캔버스 안에 있어도 visual effect clipping 경고가 표시됨
- `overflow: hidden` group의 child overflow 경고와 hidden child 제외
- locked text의 fill, stroke, shadow 명령 UI 비활성화
- disabled stroke가 Inspector에 남고 drawable stroke의 band 가림 계산에 참여하지 않음
- 회전 텍스트 visual bounds box가 logical selection과 분리되어 표시됨
- 브라우저 console error/warning 없음

다음 항목은 브라우저에서 직접 재현할 수 없어 자동 검증으로 대체했다.

- legacy scalar shadow materialize와 색상·opacity parity
- 실제 web font source의 disable/delete fallback 경고
- crop의 원본/다중 consumer 불변과 PNG 픽셀 parity
- native stroke drag reorder와 drag 한 단계 undo의 자동화 adapter 범위

## 17. 완료 조건

- global text, image와 select input을 생성·복제·편집·정렬·group화·삭제할 수 있다.
- 노드에서 input을 만들고 연결하며 하나의 input을 여러 노드가 공유할 수 있다.
- 연결 해제와 input 삭제가 명시한 정적 fallback 계약을 지킨다.
- 관리자 preview 값은 default, document history와 draft 저장에서 분리된다.
- PNG/JPEG/WebP를 로컬 asset으로 추가하고 node 추가·교체·사용 위치 확인이 가능하다.
- image fit, focus, crop, radius와 opacity가 공용 renderer에서 일치한다.
- crop은 원본과 다른 consumer를 바꾸지 않는다.
- image input별 runtime 편집 권한과 권장 비율을 설정할 수 있다.
- 사용 중 asset과 font를 안전하게 진단하고 dangling reference를 만들지 않는다.
- day/entry input이 Thumbnail UI에 나타나지 않고 validator 정책이 명확하다.
- 자동 검사와 브라우저에서 실측 가능한 시나리오가 모두 통과한다. 브라우저에서
  재현 경로가 없는 항목은 해당 자동 회귀 검증으로 대체한다.
- Phase 5가 `StudioRuntimeValues.global`, binding resolver와 image policy를 추가 변환 없이
  사용할 수 있다.

## 18. 이 단계에서 하지 않는 일

- 사용자 runtime 페이지와 사용자별 override 저장
- PNG 다운로드와 export UI
- 원격 asset upload/sync/delete
- React Query 또는 service/API 연결
- 사용자 결과 서버 저장
- AI 이미지 생성과 배경 제거
- SVG/GIF 업로드
- 원격 preset DB와 소유권
- day/entry/builtin input authoring
- gradient, glow, multiple shadow와 SVG path text
