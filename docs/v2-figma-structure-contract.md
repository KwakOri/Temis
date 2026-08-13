# V2 Figma Structure Contract

이 문서는 v2 템플릿 importer가 기대하는 "새 시스템" 기준 Figma 구조 계약을 정리한다.

목표:
- 메타데이터 태그 없이 import 가능
- root 링크 하나로 analyze/import 가능
- importer는 이름, 계층 구조, component set/variant 정보만으로 해석

## 1. Root Frame

root frame 예시:

- `Template`
  - `Image/BG`
  - `Scene/Frame`
    - `Image/Profile`
    - `Image/Frame`
  - `Scene/Grid`
    - `Card` instances
  - `Scene/WeekDates`
  - `Scene/TopObject`
  - `Scene/Artist`

규칙:
- scene singleton은 root의 직접 자식으로 둔다.
- `Scene/Frame` 안의 프로필 관련 이미지는 직접 자식으로 둔다.
- root 안 카드들은 `Scene/Grid` 아래 인스턴스로 배치한다.

## 2. Card Component Set

카드 컴포넌트는 반드시 component set variant 구조를 사용한다.

### Shared-status card

- component set name: `Card`
- variants:
  - `status=online`
  - `status=offline`
  - optional: `status=multi`
  - optional: `status=offlineMemo`

### Matrix card

- component set name: `Card`
- variants:
  - `day=mon, status=online`
  - `day=tue, status=online`
  - ...
  - `day=sun, status=offline`

규칙:
- shared-status와 matrix를 섞지 않는다.
- shared-status 카드에는 day를 variant 이름에 넣지 않는다.

## 3. Card Internal Structure

### Online / Multi

- `Image/BG`
- `Entry`
  - `MainTitle`
  - `SubTitle`
  - `StreamingTime`
  - `StreamingDate`
  - `StreamingDay`

### Offline

- `Image/BG`
- `Entry`
  - `StreamingDate`
  - `StreamingDay`

### OfflineMemo

- `Image/BG`
- `OfflineMemo`
- `Entry`
  - `StreamingDate`

규칙:
- `Entry`는 status root의 직접 자식 `FRAME`이어야 한다.
- `OfflineMemo`는 `Entry` 안이 아니라 status root의 직접 자식이어야 한다.
- 카드 배경은 상태와 무관하게 `Image/BG` 이름을 사용한다.

## 4. Artist Component Set

- component set name: `Scene/Artist`
- variants:
  - `artist=on`
  - `artist=off`

규칙:
- root에는 `Scene/Artist` 인스턴스를 하나만 배치해도 된다.
- importer는 인스턴스의 `componentId -> componentSetId`를 타고 on/off 전체 set을 복원한다.

## 5. Optional Elements

다음 요소는 없으면 없는 것으로 처리한다.

- `Scene/WeekDates`
- `Scene/TopObject`
- `Scene/Artist`
- `Scene/Frame`
  - `Image/Profile`
  - `Image/Frame`
- `status=multi`
- `status=offlineMemo`
- `StreamingDay`

원칙:
- optional 요소는 "숨겨두는 것"보다 "없으면 아예 만들지 않는 것"이 더 좋다.

## 6. Importer Expectations

새 importer의 우선순위:

1. root path 구조
2. component set / variant properties
3. 노드 이름

메타데이터 태그(`[slot=...]`, `[bind=...]`)는 새 시스템의 기준이 아니다.

## 7. Naming Checklist

scene:
- `Scene/Grid`
- `Scene/Frame`
- `Scene/WeekDates`
- `Scene/TopObject`
- `Scene/Artist`
- `Image/Profile`
- `Image/Frame`

card:
- `Image/BG`
- `Entry`
- `MainTitle`
- `SubTitle`
- `StreamingTime`
- `StreamingDate`
- `StreamingDay`
- `OfflineMemo`

artist variants:
- `artist=on`
- `artist=off`
