# Timetable–Thumbnail Editor Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 썸네일 에디터에 이미 있는 날짜 포맷팅을 시간표 에디터의 모든 관련 바인딩 경로에서 사용할 수 있게 하고, 시간표 day card를 카드별 X/Y 위치와 회전값으로 편집·저장·렌더링할 수 있게 한다.

**Architecture:** 날짜 포맷 모드는 `date-template.ts`의 공통 필드 매핑을 단일 기준으로 삼고, 시간표 카드 인스펙터와 Thumbnail Studio 인스펙터는 각자의 command adapter를 통해 같은 `dateRangeFormat/dateRangeTemplate` 값을 갱신한다. day card transform은 기존 자동 그리드 좌표에 더하는 `dayOffsets` 계약을 유지하면서 선택적인 `rotateDeg`를 추가한다. 전체 day-card 그룹 회전은 기존 `composition.objects["day-cards"].style.rotateDeg`로 유지하고 카드별 회전만 `dayOffsets[dayId].rotateDeg`로 분리한다.

**Tech Stack:** Next.js/React, TypeScript, existing Template Studio inspector controls, existing Thumbnail Studio adapter commands, repository check scripts. 새 의존성이나 DB migration은 추가하지 않는다.

**Spec:** 사용자 요청과 현재 브랜치 `e9732e48`의 read-only audit 결과. Thumbnail Studio의 공유 렌더러/adapter 원칙은 `docs/thumbnail-studio/README.md`를 따른다.

## Global Constraints

- 기존 문서의 `dayOffsets`와 기존 시간표 렌더링을 backward-compatible하게 읽는다. `rotateDeg`가 없는 기존 문서는 `0`도로 처리한다.
- `custom`의 Slot Map과 카드별 transform은 서로 다른 기능이다. Slot Map은 어느 칸에 놓을지를 정하고, transform은 해당 카드의 자동 배치 결과에 더하는 보정값을 정한다.
- 카드별 transform은 day ID를 키로 보존한다. Slot Map을 바꾸거나 프리셋을 바꿔도 슬롯 인덱스 기준으로 transform을 재배치하지 않는다.
- `week.date_range`는 range 모드, `week.start_date`/`week.end_date`/`day.date`는 single 모드의 토큰과 preset을 사용한다.
- 원격 Supabase 명령, migration, 저장된 템플릿 데이터 변경은 수행하지 않는다. 구현 후에도 로컬 문서/런타임 검증만 한다.
- production build는 실행하지 않는다. 프로젝트 규칙에 따라 lint, TypeScript, 관련 `check:*`와 브라우저 실측을 우선한다.

## Audit Findings

| 영역 | 현재 상태 | 판단 |
| --- | --- | --- |
| 시간표의 전용 `weekDates` composition object | `studio-timetable-inspector.tsx`에서 `StudioTimetableWeekDatesFormatControls`를 이미 렌더링한다. | 날짜 포맷팅 자체가 완전히 없는 것은 아니다. |
| 시간표 card/graph node의 builtin date binding | `studio-card-node-inspector.tsx`가 `day.date`일 때만 날짜 포맷 컨트롤을 렌더링한다. `week.date_range`, `week.start_date`, `week.end_date`에는 노출되지 않는다. | 카드 authoring 경로에 parity gap이 있다. |
| Thumbnail Studio의 `weekDates` | `thumbnail-inspector.tsx`와 `setWeekDateFormatting` command가 포맷 값을 지원한다. 다만 현재 `week.date_range`에도 `mode="single"`을 전달한다. | 구현은 있으나 range/single 모드 매핑을 공통화할 필요가 있다. |
| 시간표 `custom` layout | `Grid Preset`, `Columns`, `Rows`, `Slot Map`만 제공한다. | custom은 현재 슬롯 배치만 의미한다. 카드별 transform UI는 없다. |
| 카드별 위치 | `dayOffsets[dayId].left/top` 모델, drag command, 개별 day-card 선택 후 Position X/Y 경로가 이미 있다. | 위치는 부분 구현되어 있지만 custom controls 안에서 발견하기 어렵다. |
| 카드별 회전 | offset 타입에 `rotateDeg`가 없고, renderer는 day-card 그룹만 회전하며, 개별 day card에는 Rotate field가 없다. | UI만 숨겨진 것이 아니라 end-to-end 미구현이다. |

Git history도 이 판단과 일치한다. `d8cb5365`에서 시간표 formatting controls가 먼저 정리되었고, 이후 `f7d49041`에서 Thumbnail week dates가 추가되었지만 card binding 경로와 day-card transform parity가 완성되지는 않았다.

## Implementation Tasks

### Task 1: 날짜 포맷 모드 매핑을 공통화하고 시간표 card inspector에 노출

**Files:**

- `src/utils/template-studio/date-template.ts`
- `src/app/(root)/template-studio/_components/studio-card-node-inspector.tsx`
- `src/app/(root)/admin/thumbnail-studio/_components/thumbnail-inspector.tsx`
- `scripts/check-studio-card-node-inspector.tsx`
- `scripts/check-thumbnail-studio-editor.tsx`
- `scripts/check-thumbnail-studio-week-dates.ts`

- [ ] `date-template.ts`에 `StudioBuiltinFieldId`를 받아 `StudioDateFormatMode | null`을 반환하는 명시적 helper를 추가한다. `week.date_range`는 `range`, `day.date`/`week.start_date`/`week.end_date`는 `single`, 날짜가 아닌 field는 `null`을 반환한다.
- [ ] `studio-card-node-inspector.tsx`의 `day.date` 전용 조건을 helper 기반 조건으로 바꾸고, 반환된 mode를 `StudioWeekDatesFormatControls`에 전달한다. `onChange`는 기존 binding의 `dateRangeFormat/dateRangeTemplate` 저장 방식을 유지한다.
- [ ] 시간표 card inspector에서 `week.date_range`에는 `${start.*}`/`${end.*}` 토큰과 range preset이, single date에는 `${YYYY}` 계열 토큰과 single preset이 표시되는지 보장한다.
- [ ] `thumbnail-inspector.tsx`도 같은 helper를 사용한다. 기존 thumbnail semantic guard는 유지하되 `week.date_range`에는 `mode="range"`, `week.start_date`에는 `mode="single"`을 전달한다. `setWeekDateFormatting` command와 저장 필드명은 변경하지 않는다.
- [ ] 기존 dedicated timetable `weekDates` composition object의 UI를 회귀시키지 않는다. 이 경로와 card binding 경로가 동일한 preset/template semantics를 사용하는지 확인한다.
- [ ] card inspector check에 `day.date`, `week.date_range`, `week.start_date` fixture를 추가하고 각각 올바른 `Date Format` label과 토큰을 검사한다. `day.label`/시간 field에는 날짜 컨트롤이 나타나지 않는지도 유지한다.
- [ ] Thumbnail editor check에는 `week.date_range` range control과 range token 노출을 추가하고, resolver check에는 공통 mode helper의 mapping을 추가한다.

### Task 2: day card offset에 선택적 회전값을 추가하고 command 경로를 완성

**Files:**

- `src/types/template-studio.ts`
- `src/utils/template-studio/timetable-commands.ts`
- `src/app/(root)/template-studio/_hooks/use-timetable-object-commands.ts`
- `scripts/check-studio-timetable-commands.ts`

- [ ] `StudioTimetableDayCardOffset`에 `rotateDeg?: number`를 추가한다. 기존 `left/top`은 필수로 유지하고, 오래된 문서의 누락값은 `0`도로 해석한다.
- [ ] `setStudioTimetableDayOffset`가 `rotateDeg`를 round하고 기존 offset의 회전값을 불필요하게 지우지 않도록 한다. X/Y만 바꾸는 drag/update는 기존 회전값을 보존하고, 회전만 바꾸는 update도 가능하게 한다.
- [ ] `planStudioTimetableDayCardOffset`의 `nextPosition`과 반환값에 선택적 `rotateDeg`를 포함한다. left/top은 기존처럼 자동 배치 기준 좌표에서 계산하고, rotate는 현재 값 또는 새 값만 round해서 전달한다.
- [ ] `updateTimetableLayerPosition`의 `day-card` branch가 `rotateDeg`를 `planStudioTimetableDayCardOffset`에 전달하도록 한다. 기존 day-cards group의 회전 처리와 placed composition object의 회전 처리는 그대로 둔다.
- [ ] canvas drag 경로가 day card를 이동할 때 `rotateDeg`를 잃지 않는지 확인한다. `createTimetableDayCardsLayoutDraft`의 기존 deep-ish clone이 optional field를 보존하도록 유지한다.
- [ ] command check에 다음 회귀 케이스를 추가한다: 회전만 변경, X/Y 변경 시 회전 보존, 음수/소수 회전값 round, legacy offset에 회전값이 없을 때 0 취급, offset reset 후 빈 map.

### Task 3: 카드별 회전 렌더링과 시각적 bounds 계산

**Files:**

- `src/app/(root)/template-studio/_components/studio-timetable-preview.tsx`
- `src/app/(root)/template-studio/_components/template-studio-client.tsx`
- `scripts/check-template-studio-timetable-layout.ts`

- [ ] preview에 rectangle과 `rotateDeg`를 받아 회전 후 axis-aligned bounds를 계산하는 순수 helper를 추가한다. `width/height`가 있는 center-origin rectangle에 대해 `abs(w*cos)+abs(h*sin)`, `abs(w*sin)+abs(h*cos)` 공식을 사용한다.
- [ ] `getStudioTimetableDayCardsBounds`가 각 day card의 `dayOffsets[dayId].rotateDeg`를 반영해 전체 visual bounds를 계산하도록 한다. logical geometry의 left/top/width/height는 drag와 자동 배치 기준으로 유지한다.
- [ ] `renderDayCardsObject`의 개별 day-card wrapper에 `transform: rotate(...)`와 `transformOrigin: "center"`를 적용한다. parent day-card group의 기존 `style.rotateDeg`와 transform composition이 깨지지 않도록 한다.
- [ ] 회전된 visual bounds를 parent의 상대 좌표에 사용하는 현재 `left - bounds.left`, `top - bounds.top` 계산과 함께 검증한다. 0도, 90도, 음수 45도에서 clipping이나 위치 점프가 없어야 한다.
- [ ] client에서 선택된 layer가 placed object, day-card group, 개별 day card일 때 각각의 회전값을 계산한다. 개별 day card는 `layout.dayOffsets[dayId]?.rotateDeg ?? 0`, group은 기존 composition style을 사용한다.
- [ ] layout check에 회전 rectangle bounds와 여러 카드가 섞인 전체 bounds 계산을 추가한다. 기존 unrotated geometry와 day card placement 테스트는 그대로 통과해야 한다.

### Task 4: Inspector와 layout controls에 명시적인 카드별 transform UI 추가

**Files:**

- `src/app/(root)/template-studio/_components/studio-timetable-inspector.tsx`
- `src/app/(root)/template-studio/_components/template-studio-client.tsx`
- `src/app/(root)/template-studio/_components/studio-timetable-day-cards-layout-controls.tsx`
- `src/app/(root)/template-studio/_components/studio-timetable-layer-panel.tsx`
- `scripts/check-studio-timetable-inspector.tsx`
- `scripts/check-studio-day-cards-layout.tsx`

- [ ] `StudioTimetableInspectorModel`에 `selectedLayerRotation`을 추가하고, Position section이 placed object뿐 아니라 `selection.dayId`가 있는 개별 day card에도 `Rotate` field를 표시하게 한다. 개별 day card의 W/H는 기존처럼 read-only로 둔다.
- [ ] 개별 day card의 Rotate 변경이 `onUpdateLayerPosition(selectedLayerId, { rotateDeg })`를 통해 Task 2 command로 저장되도록 연결한다. group Rotate와 개별 Rotate의 라벨/대상을 혼동하지 않게 한다.
- [ ] `StudioTimetableDayCardsLayoutControls`에 `Card Transforms` 영역을 추가한다. 각 day별로 Offset X, Offset Y, Rotate를 `StudioNumberField`로 제공하고 `layout.dayOffsets[day.id]`를 갱신한다. transform은 자동 배치 기준에 대한 상대 보정값이라는 설명을 함께 표시한다.
- [ ] transform 영역은 모든 grid preset에서 동일하게 보여 기존에 저장된 `dayOffsets`도 발견·수정할 수 있게 한다. `custom`에서는 Slot Map 바로 아래에 배치해 “custom grid + card transforms” 흐름이 명확하게 보이도록 한다.
- [ ] Reset 버튼의 문구를 위치와 회전을 모두 초기화한다는 의미로 명확히 하고, 실행 시 기존처럼 `dayOffsets = {}`를 설정한다.
- [ ] layer panel의 generated day card row 또는 layout controls에 “Select a day card to edit Position / Rotate” 안내를 추가해 canvas double-click/layer selection 경로도 발견 가능하게 한다. 기존 layer ordering과 selection 동작은 바꾸지 않는다.
- [ ] inspector check에서 개별 `day-card:mon`의 Position section에 Rotate가 있고 W/H는 read-only인지, group `day-cards`의 Rotate가 기존처럼 있는지 검사한다.
- [ ] layout controls check에서 `Card Transforms`, day별 Offset X/Y/Rotate, reset 동작과 `custom` Slot Map의 공존을 검사한다. preset 변경이 transform을 의도치 않게 slot index로 옮기지 않는지도 확인한다.

### Task 5: 통합 검증과 수동 acceptance

**Files/commands:**

- `scripts/check-studio-card-node-inspector.tsx`
- `scripts/check-thumbnail-studio-editor.tsx`
- `scripts/check-thumbnail-studio-week-dates.ts`
- `scripts/check-studio-timetable-commands.ts`
- `scripts/check-studio-timetable-inspector.tsx`
- `scripts/check-studio-day-cards-layout.tsx`
- `scripts/check-template-studio-timetable-layout.ts`

- [ ] sandbox에서 `tsx` IPC가 실패하면 프로젝트 규칙대로 아래 `node --import tsx` 형식으로 관련 check를 실행한다.

  ```bash
  node --import tsx scripts/check-studio-card-node-inspector.tsx
  node --import tsx scripts/check-thumbnail-studio-editor.tsx
  node --import tsx scripts/check-thumbnail-studio-week-dates.ts
  node --import tsx scripts/check-studio-timetable-commands.ts
  node --import tsx scripts/check-studio-timetable-inspector.tsx
  node --import tsx scripts/check-studio-day-cards-layout.tsx
  node --import tsx scripts/check-template-studio-timetable-layout.ts
  ```

- [ ] `npx tsc --noEmit`와 `npm run lint`를 실행한다. 새 warning을 기존 warning으로 뭉뚱그리지 말고 변경으로 발생한 오류를 별도로 확인한다.
- [ ] `npm run dev:local`로 로컬 환경을 띄운 뒤 `/admin/template-studio/[templateId]/edit`에서 다음을 수동 확인한다.
  1. Timetable workspace에서 card의 `week.date_range`를 선택하면 range preset/token이 보이고, `week.start_date`를 선택하면 single preset/token이 보인다.
  2. Day Card Containers에서 `custom`을 선택하면 Slot Map과 Card Transforms가 함께 보인다.
  3. 한 카드의 Offset X/Y와 Rotate를 바꾸면 canvas preview와 개별 card Position/Rotate 값이 함께 갱신된다.
  4. 저장/새로고침 또는 backed preview 재진입 후 값이 유지되고, 0도·음수·90도에서 card가 잘리지 않는다.
  5. 다른 grid preset과 Slot Map을 바꿔도 day ID별 transform이 유지되며 Reset이 위치와 회전을 모두 초기화한다.
- [ ] 원격 DB나 migration을 건드리지 않았는지 `git diff --stat`와 `git status --short`로 확인한다.

## Acceptance Criteria

- [ ] 시간표 card authoring 경로에서 `week.date_range`, `week.start_date`, `week.end_date`, `day.date`가 올바른 날짜 포맷 UI를 제공한다.
- [ ] Thumbnail Studio와 시간표 card authoring 경로가 range/single preset과 token semantics를 공유한다.
- [ ] 기존 `dayOffsets.left/top` 문서는 수정 없이 렌더링되고, 새 문서는 카드별 `rotateDeg`를 저장·복원한다.
- [ ] custom grid에서 카드별 Offset X/Y/Rotate를 직접 설정할 수 있고, canvas/layer Position UI에서도 동일한 값이 보인다.
- [ ] 카드별 회전은 preview/runtime에서 시각적으로 반영되며, parent bounds와 selection이 회전된 카드의 visual extent를 포함한다.
- [ ] 전체 day-card group 회전, 기존 drag, Slot Map, legacy timetable formatting 동작에 회귀가 없다.
- [ ] 관련 check scripts, `npx tsc --noEmit`, `npm run lint`가 통과한다.

## Non-goals

- legacy `/time-table` editor를 새 Template Studio 계약으로 마이그레이션하지 않는다.
- 개별 entry card 내부 요소의 별도 위치/회전 편집은 이번 범위에 포함하지 않는다.
- 카드별 transform을 서버 schema나 별도 테이블로 분리하지 않는다.
- Thumbnail Studio의 semantic weekDates 모델을 시간표 domain 모델로 통합하는 대규모 리팩터링은 하지 않는다.
