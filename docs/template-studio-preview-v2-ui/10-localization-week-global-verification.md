# Phase 10 — Localization, Week, and Global Cards Verification

## 정적 검사

```bash
npx tsc --noEmit
npx eslint <changed files>
npm run check:template-studio:runtime-v2-ui
npm run check:template-studio:timetable-runtime
```

## 자동 회귀 검사

### locale

- ko/en/ja copy
- unsupported locale fallback
- locale별 week label

### week

- 이전/다음 7일 이동
- Canvas built-in date 반영
- reset
- invalid/missing date에서 disabled

### global groups

- topology group
- label exact fallback group
- standalone fallback
- image upload UI
- boolean select toggle
- 동적 input add/move/delete

## 브라우저 interaction

1. 언어 selector를 ko/en/ja로 변경한다.
2. 헤더, form title, 버튼, status copy가 변경되는지 확인한다.
3. 다음 주 화살표를 누른다.
4. selector와 Canvas의 7개 날짜가 함께 이동하는지 확인한다.
5. 이전 주와 Reset을 확인한다.
6. Artist/Weekly Memo toggle on/off에서 content visibility와 값 보존을 확인한다.
7. Profile Image가 독립 카드로 보이는지 확인한다.

## 시각 검사

- 기존 TimeTable처럼 설정별 카드가 구분된다.
- card radius/border/shadow는 runtime theme token을 사용한다.
- panel horizontal overflow가 없다.
- 400px 전후 sidebar에서 label/action이 잘리지 않는다.
- 언어별 문자열 길이 변화가 layout을 깨지 않는다.

## rollout

이번 locale utility는 Template Studio runtime 전용으로 시작한다. 다른 플랫폼 영역이 같은
locale ID와 persistence key를 채택할 수 있지만, 검증 없이 기존 페이지를 일괄 전환하지
않는다.
