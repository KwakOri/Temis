# Phase 0. 제품 계약과 문서 모델

상태: 계획 완료, 구현 전  
선행 단계: 없음  
후속 단계:
[Phase 0A — PNG 렌더링 선행 스파이크](./00a-rendering-feasibility-spike.md)

## 1. 목표

Thumbnail Studio 구현 중에 제품 권한, 라우트, 문서 종류와 기본 기능 범위가
바뀌지 않도록 공통 계약을 먼저 확정한다.

이 단계는 UI 기능을 구현하지 않는다. 이후 단계가 같은 모델을 기준으로 개발할
수 있도록 타입과 결정 사항을 고정한다.

## 2. 제품 역할

### Template Author

관리자용 Thumbnail Studio에서 템플릿 원본을 만든다.

- 전체 레이어 편집
- 노드 추가와 삭제
- 디자인과 텍스트 효과 편집
- 공개할 입력 필드 지정
- 초안 저장과 발행

### Template User

발행된 템플릿을 사용자용 Thumbnail Editor에서 사용한다.

- 공개된 텍스트 입력 변경
- 공개된 이미지 입력 변경
- 허용된 이미지 맞춤과 초점 조절
- 결과 미리보기
- PNG 다운로드

초기 사용자는 노드 위치, 레이어 순서와 템플릿 스타일을 변경하지 않는다.

## 3. 라우트 계약

| 역할 | 라우트 | 책임 |
| --- | --- | --- |
| 관리자 목록 | `/admin/thumbnail-studio` | 썸네일 템플릿 조회와 생성 |
| 관리자 생성 | `/admin/thumbnail-studio/create` | 빈 템플릿 생성 |
| 관리자 편집 | `/admin/thumbnail-studio/[templateId]/edit` | 전체 문서 편집 |
| 관리자 미리보기 | `/admin/thumbnail-studio/[templateId]/preview` | 초안 또는 발행본 확인 |
| 사용자 편집 | `/thumbnail/[templateId]` | 입력과 PNG 다운로드 |

기존 `/admin/template-studio`와 `/template-studio/[templateId]` 라우트는
시간표 템플릿 경로로 유지한다.

향후 Template Hub에서 `template_kind`에 따라 올바른 제작·실행 경로로 보낸다.

## 4. 템플릿 종류 계약

DB와 문서 모두 템플릿 종류를 명시한다.

```ts
type StudioTemplateKind = "timetable" | "thumbnail";
```

DB:

```ts
templates.template_engine = "studio";
templates.template_kind = "timetable" | "thumbnail";
```

문서:

```ts
interface CanonicalStudioTemplateMetadata {
  editor: "template-studio";
  kind: StudioTemplateKind;
  name: string;
  description?: string;
}
```

`template_engine`은 렌더링 엔진을 뜻하고, `template_kind`는 제품과 문서 도메인을
뜻한다. 두 값을 하나의 컬럼으로 합치지 않는다.

### 레거시 호환 resolver

기존 v6 문서에는 `metadata.kind`가 없다. 로드와 migration 경계에서는 kind가 없는
문서를 받을 수 있어야 한다.

```ts
getStudioTemplateKind(document, context?): StudioTemplateKind | null
```

판정 순서:

1. 유효한 `metadata.kind`
2. `domains.timetable`이 있으면 `timetable`
3. API 또는 DB가 전달한 명시적 kind
4. 판정할 수 없으면 `null`

v7 migration과 신규 document factory가 반환하는 canonical 문서에서는 kind를
필수로 한다. 애플리케이션 전체에서 kind를 영구 optional로 두지 않고, 레거시
입력 경계만 resolver로 흡수한다.

### 종류와 도메인 불변식

- `kind="timetable"` 문서는 `domains.timetable`을 가질 수 있다.
- `kind="thumbnail"` 문서는 `domains.thumbnail`을 가진다.
- 하나의 문서가 두 도메인을 동시에 활성화하지 않는다.
- API가 요청한 종류와 문서 metadata의 종류가 다르면 저장과 발행을 거부한다.
- 기존 문서는 compatibility resolver와 migration에서 `domains.timetable` 존재
  여부로 `timetable`을 추론한다.

## 5. 썸네일 도메인 계약

```ts
interface StudioThumbnailDomain {
  version: 1;
  export: {
    defaultFormat: "png";
    transparentBackground: boolean;
  };
  guide?: {
    assetId?: StudioAssetId | null;
    visible?: boolean;
    opacity?: number;
  };
}

interface StudioTemplateDomains {
  timetable?: StudioTimetableDomain;
  thumbnail?: StudioThumbnailDomain;
}
```

초기 도메인에는 다음 데이터를 넣지 않는다.

- 시간표 일자
- 시간표 항목
- 카드 상태
- Component Set
- 시간표 capability
- 사용자 작업 결과

사용자 입력값은 기존 `StudioRuntimeValues.global`에 저장한다. 사용자 작업 결과를
서버에 저장하는 기능은 초기 범위에 포함하지 않는다.

## 6. 캔버스 계약

기본 캔버스:

```ts
{
  width: 1280,
  height: 720,
  background: "#ffffff"
}
```

초기 프리셋:

| 이름 | 크기 |
| --- | --- |
| YouTube | 1280 × 720 |
| 가로형 카드 | 1200 × 630 |
| 정사각형 | 1080 × 1080 |
| 세로형 | 1080 × 1350 |

관리자는 사용자 정의 크기를 사용할 수 있다. 캔버스 크기 변경 시 기존 노드의
좌표와 크기를 자동 비율 조정하지 않는다. 자동 재배치는 후속 기능으로 둔다.

## 7. 노드 계약

현재 공통 노드:

- `group`
- `text`
- `flexibleText`
- `image`

Thumbnail Studio에서 추가할 노드:

```ts
type StudioGraphNodeType =
  | "group"
  | "text"
  | "flexibleText"
  | "image"
  | "shape";
```

초기 `shape` 종류:

- 사각형
- 둥근 사각형

타원, 선, 임의 path는 초기 범위에서 제외한다.

`shape`를 union에 추가하기 전에 renderer, 기본값, label과 picker의 노드 타입
dispatch를 exhaustive registry 또는 `assertNever` switch로 바꾼다. 새 타입을
텍스트 fallback으로 조용히 처리하지 않는다.

### 논리 노드 원칙

- 하나의 텍스트는 그래프 노드 하나다.
- 외곽선과 그림자는 자식 그래프 노드가 아니다.
- 레이어 패널에는 논리 노드만 표시한다.
- 시각 효과 레이어는 공용 텍스트 렌더러 내부에서 생성한다.

## 8. 입력 계약

초기 Thumbnail Studio는 `global` 범위만 사용한다.

지원 타입:

- `text`
- `image`
- `select`

지원 바인딩:

- `inputText`
- `inputImage`
- `selectText`
- `selectAsset`
- 정적 텍스트와 정적 에셋

시간표의 `day`, `entry`, `builtinField`는 썸네일 입력 UI에 노출하지 않는다.

입력 표시 정보를 위해 다음 선택 필드를 추가할 수 있다.

```ts
interface StudioInputPresentation {
  order?: number;
  groupId?: string;
  helpText?: string;
}
```

이미지 입력 정책:

```ts
interface StudioImageInputPolicy {
  allowFitChange: boolean;
  allowFocusChange: boolean;
  recommendedAspectRatio?: number;
}
```

정책은 사용자 UI 권한을 제어하고 이미지 자체의 스타일을 대체하지 않는다.

## 9. 텍스트 표현 계약

구조화된 텍스트 효과 모델은
[Phase 3 문서](./03-text-effects.md)에서 상세화한다.

Phase 0에서 고정할 원칙:

- 단색 채우기
- 여러 외곽선
- 외곽선 두께는 glyph 바깥으로 보이는 실효 두께로 저장
- 그림자 하나
- 효과 프리셋
- 자동 크기 텍스트와 효과 레이어의 측정 결과 공유
- 프리셋 적용 시 값 복사
- 작성, 런타임과 PNG에서 같은 렌더러 사용

중앙 정렬 CSS stroke를 선택하면 renderer가 저장된 실효 두께의 2배를 CSS
`stroke-width`로 사용한다. 선택 영역과 effect outset은 저장된 실효 두께를
그대로 사용한다.

최종 DOM/SVG 렌더링 방식과 PNG 라이브러리는
[Phase 0A 선행 스파이크](./00a-rendering-feasibility-spike.md)에서 확정한다.

그라데이션, 글로우와 여러 그림자는 후속 확장으로 둔다.

## 10. 사용자 결과 계약

초기 사용자 흐름:

```text
발행 문서 로드
→ 기본 입력값 생성
→ 브라우저에서 입력값 수정
→ 실시간 미리보기
→ PNG 다운로드
```

초기에는 사용자 입력값을 서버에 자동 저장하지 않는다. 기존 Studio의 사용자
상태 저장 기능을 썸네일에 적용할지는 실제 재방문 요구를 확인한 뒤 결정한다.

브라우저 임시 상태를 유지하더라도 템플릿 원본 문서에는 기록하지 않는다.

## 11. 프리셋 계약

초기 텍스트 프리셋은 프로젝트 관리자 공용이다.

- 프리셋에는 폰트, 간격, 채우기, 외곽선과 그림자를 포함할 수 있다.
- 적용할 때 노드에 현재 값을 복사한다.
- 노드에는 `source`, `presetId`와 `presetVersion`을 출처로 기록할 수 있다.
- 프리셋 수정이 기존 문서에 자동 전파되지 않는다.
- 사용자 개인 프리셋과 팀 소유권은 초기 범위에서 제외한다.

```ts
type StudioTextPresetReference = {
  source: "builtin" | "custom";
  presetId: string;
  presetVersion: number;
};
```

`builtin` version은 코드 registry가 명시적으로 관리하고, `custom` version은
저장된 preset row의 version을 의미한다.

프리셋의 DB 저장은 Phase 6에서 결정한다. Phase 3에서는 코드 또는 문서 내
프리셋만으로 기능을 완성할 수 있어야 한다.

## 12. 문서 버전

현재 `StudioTemplateDocument.version`은 `6`이다.

새 종류, 썸네일 도메인, `shape`와 텍스트 표현 구조를 포함하는 다음 목표 문서
버전은 `7`로 계획한다.

v6 → v7 migration:

1. compatibility resolver로 기존 문서 kind 판정
2. 기존 문서에 `metadata.kind="timetable"` 추가
3. 기존 시간표 도메인과 리소스 유지
4. 새 선택 필드는 기본값으로 보완
5. 기존 스타일과 바인딩 변경 없음
6. migration을 여러 번 적용해도 결과가 달라지지 않음

구현 시점에 다른 작업이 문서 버전을 먼저 올렸다면 숫자만 현재 버전에 맞춰
재조정하고 같은 migration 의미를 유지한다.

## 13. 변경 대상

계약 정의:

- `src/types/template-studio.ts`
- `src/utils/template-studio/migrations.ts`
- `src/utils/template-studio/validator.ts`
- `src/utils/template-studio/input-values.ts`
- 신규 `src/utils/template-studio/template-kind.ts`

빈 문서:

- 신규 `src/utils/thumbnail-studio/document-factory.ts`
- 기존 `src/utils/template-studio/sample-document.ts`는 시간표 표본으로 유지

DB 종류는 Phase 6에서 적용한다.

## 14. 구현 순서

1. `StudioTemplateKind`와 metadata 종류 정의
2. 레거시 호환 `getStudioTemplateKind` resolver 정의
3. `StudioThumbnailDomain` 정의
4. 목표 v7 canonical 문서 타입 정의
5. v6 문서 migration 규칙 정의
6. 썸네일 빈 문서 팩토리 계약 정의
7. validator의 종류·도메인 일치 규칙 정의
8. 입력 표시와 이미지 정책 타입 정의
9. stroke 실효 두께와 preset 출처 계약 정의
10. 이후 단계가 참조할 기본값 상수 정의

## 15. 완료 조건

- Template Studio와 Thumbnail Studio의 역할과 권한이 구분돼 있다.
- 관리자와 사용자 라우트가 확정돼 있다.
- 템플릿 엔진과 템플릿 종류의 의미가 분리돼 있다.
- 기존 kind 없는 문서를 읽는 resolver와 canonical 문서의 필수 kind가 구분돼 있다.
- 썸네일 문서가 시간표 도메인 없이 생성될 수 있다.
- 초기 노드, 입력, 캔버스와 내보내기 범위가 확정돼 있다.
- stroke 실효 두께와 preset 출처 의미가 확정돼 있다.
- v6 시간표 문서의 기본 migration 방향이 정의돼 있다.
- Phase 1~6이 동일한 타입 계약을 참조할 수 있다.

## 16. 이 단계에서 하지 않는 일

- 실제 DB migration
- 원격 Supabase 변경
- Thumbnail Studio UI 구현
- 텍스트 효과 렌더링
- 사용자 런타임 구현
- 상세 테스트 계획 작성
