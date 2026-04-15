# V2 Figma Import 구조 점검 문서

- 대상 Figma: `https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/temis?node-id=448-1665`
- 점검 일시: `2026-04-15`
- 점검 범위: `scripts/import-v2-template-from-figma.ts` 기준 매핑 구조 + 실제 Figma node payload 비교

## 1) 이번 노드의 실제 구조 요약

- Root: `Scene/Template` (`4000 x 2250`)
- 주요 1depth 노드
  - `Image/Background`
  - `Image/ProfileImage`
  - `Image/ProfileFrame`
  - `Image/ArtistObject`
  - `Group/Grid`
  - `Text/WeekFlag`
  - `Image/TopObject`
  - `FlexibleText/ProfileText`

### Grid 실제 필드 (Figma API payload)

- `layoutMode: "GRID"`
- `gridColumnCount: 3`
- `gridColumnGap: 8`
- `gridColumnsSizing: "repeat(3,fit-content(100%))"`
- `gridRowCount: 3`
- `gridRowGap: 10`
- `gridRowsSizing: "repeat(3,fit-content(100%))"`

### Card 내부 구조 (대표 패턴)

- `ComponentInstance/Card` (`680 x 720`)가 7개 배치
- 각 카드 내부
  - `ComponentInstance/CardBackground`
    - `Image/Wed` (배경 이미지)
  - `ComponentInstance/CardContent`
    - `FlexibleText/MainTitle` + child `Content(TEXT)`
    - `FlexibleText/SubTitle` + child `Content(TEXT)`
    - `Text/Time` + child `Content(TEXT)`

## 2) Importer 매핑 구조 (개선 반영)

## 전역 레이아웃

- `layout.grid` <- `Group/Grid`의 `left/top/width/height`
- `layout.grid.rowGap` <- `gridRowGap`
- `layout.grid.columnGap` <- `gridColumnGap`
- `layout.grid.columns` <- `gridColumnCount`
- `layout.grid.gridTemplateColumns` <- `gridColumnsSizing`
- `layout.weekFlag` <- `Text/WeekFlag`의 rect
- `layout.weekFlag` text style <- `Text/WeekFlag` 내부 `Content(TEXT)`
- `layout.topObjectContainer` <- `Image/TopObject` rect
- `layout.profileImage` <- `Image/ProfileImage` rect
- `layout.profileFrame` <- `Image/ProfileFrame` rect
- `layout.profileTextRootStyle` <- `FlexibleText/ProfileText` rect(회전 제외)
- `layout.profileTextWrapperStyle` <- `FlexibleText/ProfileText`의 width/height + rotate
- `layout.profileTextStyle` <- `FlexibleText/ProfileText` 내부 `Content(TEXT)`

## 카드 레이아웃

- `layout.card.container` <- 카드 alias 다중 후보 중 점수 기반 선택 결과 rect
- `layout.card.onlineBackgroundContainer` <- 카드 내부 `OnlineBackground` 또는 `CardBackground` rect
- `layout.card.offlineBackgroundContainer` <- 카드 내부 `OfflineBackground` 또는 `CardBackground` rect
- `layout.card.mainTitleContainer` <- 카드 내부 `MainTitle` rect
- `layout.card.mainTitleWrapperStyle` <- `MainTitle` width/height + rotate
- `layout.card.subTitleContainer` <- 카드 내부 `SubTitle` rect
- `layout.card.subTitleWrapperStyle` <- `SubTitle` width/height + rotate
- `layout.card.streamingTime` <- 카드 내부 `Text/Time` rect
- `layout.card.mainTitleTextStyle` <- `MainTitle` 내부 `Content(TEXT)`
- `layout.card.subTitleTextStyle` <- `SubTitle` 내부 `Content(TEXT)`
- `layout.card.streamingTimeStyle` <- `Text/Time` 내부 `Content(TEXT)`

## 3) 확인된/잠재 불일치 포인트

1. 카드 alias 다중 매칭
- 현재 템플릿은 카드 인스턴스가 7개라 `cardContainer` alias가 다중 매칭됨.
- 현재 로직은 `Main/Sub/Time/Background` 존재 여부를 점수화해 대표 카드를 선택하도록 개선됨.
- 동점 시에는 top-left 우선으로 deterministic 선택하고 경고를 남김.

2. 카드 배경 컨테이너
- `online/offline` 배경 컨테이너 추출을 추가함.
- 전용 노드가 없으면 `CardBackground`를 fallback으로 사용.

3. 텍스트 스타일 추출 대상
- 규칙을 `Flexible/* = container layout`, `Content(TEXT) = text style`로 고정함.
- `MainTitle/SubTitle/Time/ProfileText/WeekFlag/Memo` 모두 `Content(TEXT)` 우선 추출.

4. 회전값 단위
- `rotation` 값이 `±2π` 범위면 radian으로 간주해 degree 변환하도록 개선함.
- `relativeTransform` 계산 경로는 기존대로 degree 계산 유지.

5. 비존재 노드의 pruning은 정상
- 이번 템플릿에서 `memo`, `streamingDate`, `streamingDay`는 실체가 없어 `not-applicable`로 제거됨.
- 현재 의도와 일치(없으면 제거).

## 4) 네이밍/구조 규칙 권장안

1. 텍스트 스타일용 `Content(TEXT)` 명시
- `FlexibleText/MainTitle` 같은 컨테이너와 별개로 child `Content`를 항상 유지.
- importer는 향후 child `Content` 우선 탐색으로 변경하는 것이 안전.

2. 카드 배경 노드 명시
- 온라인/오프라인 배경 컨테이너를 각각 alias 가능한 이름으로 분리:
  - `Image/OnlineBackground`
  - `Image/OfflineBackground`
- 그러면 `onlineBackgroundContainer/offlineBackgroundContainer`를 직접 추출 가능.

3. 카드 기준 샘플 1개 명시
- `Group/Grid` 하위 여러 카드 중 기준 카드(예: `ComponentInstance/CardMaster`)를 1개 두고 importer가 우선 참조하도록 규칙화.

4. Grid는 Figma GRID 필드 기준 사용
- 간격 값은 `itemSpacing/counterAxisSpacing`이 아니라 GRID 노드에서는
  - `gridRowGap`
  - `gridColumnGap`
  를 기준으로 사용.

## 5) 운영 체크리스트 (Import 전)

- `Group/Grid`가 `layoutMode=GRID`인지 확인
- 카드 기준 컨테이너 alias가 단일로 잡히는지 확인
- 텍스트 스타일이 `Content(TEXT)`에 있는지 확인
- 온라인/오프라인 배경 컨테이너가 분리되어 있는지 확인
- 회전이 있는 노드의 `rotation` 단위(rad/deg) 검증

---

이 문서는 importer 동작과 실제 Figma payload의 차이, 그리고 반영된 개선 사항을 정리한 기준 문서다.
