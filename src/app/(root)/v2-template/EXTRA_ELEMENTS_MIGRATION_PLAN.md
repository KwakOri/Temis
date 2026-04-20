# V2 Template: "추가 요소" 확장 전환 계획

## 목적

- 고정 스키마 중심 렌더링에서 벗어나, **프리셋은 초기값**만 제공하고 이후 구조 변경은 전부 데이터(graph)에 기록한다.
- `addon` 용어 대신 **추가 요소(extra element)** 용어를 사용한다.
- Builtin과 추가 요소를 같은 렌더 엔진으로 처리하되, Builtin은 조건부 필수 검증으로 안전성을 보장한다.

## 범위

- 대상: `v2-template` 편집/렌더/검증/저장 모델
- 비대상: DB 마이그레이션(현재는 localStorage 기반), 외부 퍼블릭 API 계약 변경

## 용어

- Builtin: 기본 템플릿 기능(배경, 그리드, 카드, 요일/날짜/시간, 프로필, 메모 등)
- 추가 요소: Builtin 외에 사용자가 추가하는 자유 노드/컴포넌트 묶음
- Capability: 템플릿 생성/설정에 따라 Builtin의 필수 여부를 결정하는 기능 플래그

## 핵심 원칙

1. 프리셋은 초기 `scene graph + styles + assets`만 제공한다.
2. 이후 구조 변경(추가/삭제/순서/컴포넌트 교체)은 graph 데이터에만 기록한다.
3. 렌더러는 `assetRef`만 해석하고, 나머지는 graph를 그대로 따른다.
4. 필수 검증은 고정 목록이 아니라 **capability 기반 조건부 규칙**으로 처리한다.

## 데이터 모델 변경안

## 1) Asset 참조 통합

- 기존: `assetKey: keyof V2TemplateAssetMap`
- 변경: `assetRef` 도입

```ts
type V2TemplateAssetRef =
  | { source: "builtin"; key: keyof V2TemplateAssetMap }
  | { source: "extra"; key: string }; // extraAssets key
```

## 2) 추가 요소 레지스트리

```ts
type V2TemplateExtraElement = {
  id: string; // slug 기반 고유 ID (예: sticker-star, sticker-star-2)
  label: string; // UI 표시명
  rootNodeIds: string[]; // 이 추가 요소가 소유하는 graph root 노드들
  description?: string;
  createdAt?: string;
};
```

- `extraElements: Record<string, V2TemplateExtraElement>`
- `extraAssets: Record<string, Record<string, string | null>>`
- `extraAssetDimensions: Record<string, Record<string, { width: number; height: number } | null>>`

## 3) 조건부 필수 기준(Capabilities)

```ts
type V2TemplateStructureCapabilities = {
  grid: { enabled: boolean };
  weekFlag: { enabled: boolean };
  memo: { enabled: boolean };
  artist: {
    enabled: boolean;
    mode: "textOnly" | "textWithImage";
  };
  profile: {
    enabled: boolean;
    imageRequired: boolean;
    frameRequired: boolean;
  };
};
```

## Builtin 조건부 필수 매트릭스

## 1) Grid

- `grid.enabled=true`: `scene-grid` 필수
- `grid.enabled=false`: `scene-grid` optional

## 2) WeekFlag

- `weekFlag.enabled=true`: `scene-week-flag` 필수
- `weekFlag.enabled=false`: optional

## 3) Memo

- `memo.enabled=true`: `scene-memo-text` 필수, `scene-memo-object` optional
- `memo.enabled=false`: memo 관련 노드 optional

## 4) Artist

- `artist.enabled=false`: artist 관련 노드 optional
- `artist.enabled=true`: `scene-artist-object` 필수, on/off asset 전환으로 표시 제어

## 5) Profile

- `profile.enabled=false`: profile 관련 노드 optional
- `profile.enabled=true`, `imageRequired=true`: profile image 필수
- `profile.enabled=true`, `frameRequired=true`: profile frame 필수

## 추가 요소가 2개 이상일 때 처리 규칙

1. 각 추가 요소는 `id`로 완전히 분리 관리한다.
2. 동일 이름 생성 시 slug 충돌을 자동 회피한다.
- 예: `sticker`, `sticker-2`, `sticker-3`
3. 각 요소의 root node/instance/style/asset는 해당 `id` 네임스페이스에만 귀속한다.
4. 렌더 순서는 graph order(`orderKey`)를 기준으로 통합 정렬한다.
5. 삭제는 요소 단위로 수행하고, 해당 요소의 참조만 cleanup한다.
6. 다른 추가 요소/ builtin에는 영향이 없어야 한다.

## 검증 전략

## Hard validation (저장 차단)

1. graph 타입 불일치/필수 필드 누락
2. capability 기준 required 노드 누락
3. `assetRef`가 가리키는 자산 미존재
4. `componentId`/`styleKey`/`binding key` 참조 오류

## Soft validation (경고만 표시)

1. 미참조 extra asset/style
2. 고아 graph 노드
3. 비활성 capability 영역에 남아 있는 노드
4. 이름 충돌 가능성(자동 suffix 적용 예정 안내)

## 저장 시 정리 옵션

- `cleanupOrphans=true`일 때:
1. 미참조 extra asset/style 제거
2. orphan node 제거
3. 비활성 capability 영역 노드 제거(선택)

## 렌더/에디터 변경 단계

## 1단계: 타입 확장

- `assetRef`, `extraElements`, `extraAssets`, `extraAssetDimensions`, `structureCapabilities` 타입 추가
- 기존 `assetKey`를 읽는 레거시 호환 파서 유지(마이그레이션 기간 한정)

## 2단계: 정규화/검증

- normalize 단계에서 신규 필드 병합
- hard/soft validator 분리
- validator 결과를 UI에서 확인 가능하도록 diagnostics 모델 추가

## 3단계: 렌더러

- `getAssetUrlFromConfig`를 `assetRef` 기반 resolver로 확장
- Scene Asset 렌더에서 builtin/extra 분기만 수행

## 4단계: 에디터 UX

- "추가 요소" 패널 추가
- 요소 생성/복제/삭제/정렬
- 요소별 asset/style 관리

## 5단계: Figma Import 연계

1. 규칙 매핑 성공 노드는 Builtin에 결합
2. 미매핑/추가 노드는 자동으로 `extraElements` 생성
3. diff(변경 전/후) + confidence + 충돌 경고 노출
4. 사용자 승인 후 apply

## 마이그레이션 전략

## Phase A (안전 도입)

- 기존 스키마 유지 + 신규 스키마 병행 저장 가능
- `assetKey` -> `assetRef` 자동 변환
- runtime은 신규 필드 우선, 없으면 구필드 fallback

## Phase B (전환 완료)

- 신규 템플릿은 `assetRef`만 저장
- 구필드 fallback 경고 출력

## Phase C (정리)

- 레거시 fallback 제거
- validator를 신규 스키마 기준으로 단순화

## 테스트 계획

1. Artist 비활성 템플릿이 오류 없이 저장/렌더되는지
2. Artist text-only에서 이미지 노드 없이 hard pass 되는지
3. Artist textWithImage에서 이미지 누락 시 hard fail 되는지
4. 추가 요소 3개 이상 생성/삭제/정렬/복제 시 참조 일관성 유지되는지
5. orphan cleanup 시 타 요소가 보존되는지
6. Figma import 시 미매핑 노드가 추가 요소로 안전하게 분리되는지

## 리스크와 완화

1. 리스크: 타입 변경 폭이 큼
- 완화: `Phase A`에서 레거시 공존 기간 운영
2. 리스크: 에디터 패널 복잡도 증가
- 완화: Builtin 탭/추가 요소 탭 분리
3. 리스크: 잘못된 자동 cleanup
- 완화: 기본값은 cleanup 비활성, 미리보기 후 적용
