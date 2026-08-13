# Phase 08 — Runtime Week Navigation

## 목표

기존 TimeTable의 주간 선택 카드처럼 이전/다음 화살표로 Preview의 표시 주를 이동한다.

## 상태 계약

`StudioTimetableRuntimeValues.weekStartDate?: string`을 추가한다.

초깃값:

1. `document.domains.timetable.week.startDate`
2. 값이 없으면 `undefined`

화살표는 유효한 ISO date가 있을 때만 활성화한다.

## 순수 utility

예정 파일:

```text
src/utils/template-studio/runtime-week.ts
```

API:

```ts
shiftStudioIsoDate(date, dayDelta)
getStudioRuntimeWeekStartDate(document, values)
getStudioRuntimeWeekEndDate(document, values)
setStudioRuntimeWeekStartDate(values, startDate)
shiftStudioRuntimeWeek(document, values, weekDelta)
```

## built-in resolver

`resolveStudioBuiltinFieldValue`는 runtime override를 먼저 본다.

```text
runtime weekStartDate exists
  ├── day.date = start + day.order
  ├── week.start_date = start
  ├── week.end_date = start + day count - 1
  └── week.date_range = runtime start/end
else
  └── existing document behavior
```

## component

`StudioRuntimeWeekSelector`는 controlled component다.

Props:

```ts
interface StudioRuntimeWeekSelectorProps {
  label: string;
  value: string;
  previousLabel: string;
  nextLabel: string;
  disabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}
```

문서나 runtime value를 직접 읽지 않는다.

## 동작 검증

- +1 week = 정확히 +7 UTC days
- 월/연도 경계 이동
- leap year 이동
- selector label 갱신
- day.date 7개 갱신
- week range 갱신
- Reset 복원
