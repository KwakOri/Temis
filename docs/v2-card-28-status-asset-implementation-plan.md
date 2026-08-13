# V2 Card 28-Asset Status Model Implementation Plan

- 작성일: 2026-04-17
- 대상: `v2-template` (editor/runtime/importer)
- 목적: 카드 배경 자산을 `요일(7) x 상태(4)`로 완전 분리 저장

## 1) 요구사항 해석 (확정)

1. 사용자 Runtime UI 흐름은 유지한다.
- 기본 제어는 `온라인/오프라인`.
- `온라인`일 때만 `다회차(multi)`가 유효.
- `오프라인`일 때만 `오프라인 메모(offlineMemo)`가 유효.

2. 저장 구조는 UX와 분리한다.
- UI가 단순해도 내부 데이터는 `online/multi/offline/offlineMemo` 4상태를 독립 저장.
- 결과적으로 카드 배경 builtin 자산은 `7 x 4 = 28` 키를 가진다.

3. 이번 전환에서 카드 배경은 fallback 중심이 아니라 “명시 저장”을 기본으로 한다.
- `onlineByTheme/offlineByTheme` 같은 카드 공통키에 의존하지 않는다.
- 필요 시 UI에서 “일괄 적용” 기능으로 7개 키를 동시에 채우되, 저장은 7개 개별 키에 기록한다.

---

## 2) 목표 데이터 모델

## 2.1 Builtin asset keys (카드 배경)

- `online_mon..online_sun` (7)
- `multi_mon..multi_sun` (7)
- `offline_mon..offline_sun` (7)
- `offlineMemo_mon..offlineMemo_sun` (7)

총 28개.

## 2.2 상태 해석 규칙 (렌더)

- `online && entryCount === 1` -> `online_*`
- `online && entryCount >= 2` -> `multi_*`
- `offline && hasOfflineMemo === false` -> `offline_*`
- `offline && hasOfflineMemo === true` -> `offlineMemo_*`

## 2.3 UX 상태 전이 규칙 (사용자 입력 기준)

런타임/에디터 UI는 계속 아래 규칙으로 단순하게 유지한다.

1. 기본 토글은 `온라인/오프라인` 1개.
2. `다회차` 토글은 온라인일 때만 활성/유효.
3. `오프라인 메모` 토글은 오프라인일 때만 활성/유효.

즉 UI에서는 파생 상태를 계산해서 쓰고, 저장 구조(자산 키)는 4상태를 독립 보관한다.

## 2.4 저장 구조의 Source of Truth

이번 작업에서 독립 저장의 기준은 아래로 고정한다.

1. 카드 배경 자산 키 28개(`status x day`)는 항상 별도 필드로 저장.
2. 카드 노드 가시성은 `visibilityMode`로 상태별 분기 저장.
3. 사용자 입력 데이터(`isOffline`, `entries`, `offlineMemo`)는 기존 흐름 유지.

정리하면, “상태 계산은 입력 데이터에서”, “자산 선택은 28키 저장 구조에서” 수행한다.

## 2.5 카드 노드 구조 (권장)

카드 배경 노드는 상태별 4개를 기본 제공:
- `online-background` (`onlineSingleOnly`)
- `multi-background` (`onlineMultipleOnly`)
- `offline-background` (`offlineNoMemoOnly`)
- `offline-memo-background` (`offlineMemoOnly`)

각 노드는 `assetRefByDayKey`에 해당 상태의 7개 키를 가진다.

## 2.6 비목표(이번 단계에서 하지 않는 것)

1. V1 호환 fallback 확장.
2. 런타임 입력 스키마를 4개의 boolean으로 강제 재설계.
3. 상태가 누락된 Figma 파일을 AI 보정으로 자동 복구.

---

## 2.7 준비 완료 기준 (Implementation Ready Gate)

아래가 모두 충족되면 “구현 착수 가능” 상태로 본다.

1. 타입 레벨에서 28키가 컴파일 타임에 강제된다.
2. 기본 프리셋 생성 시 28키가 null 포함으로 모두 생성된다.
3. 자산 UI에서 28키를 직접 보고/수정/일괄 적용할 수 있다.
4. importer dry-run 로그에 4상태별 매핑 카운트가 출력된다.
5. 렌더러에서 상태별 노드 가시성 + dayKey 에셋 선택이 일관 동작한다.

---

## 3) 변경 범위

## 3.1 타입/정규화

파일:
- `src/types/time-table/template-render-config.ts`
- `src/utils/v2/template-render-config.ts`

작업:
1. `V2TemplateAssetMap`에 28개 키 반영(`multi_*`, `offlineMemo_*` 추가).
2. 기본 프리셋(`v2_createDefaultTemplateRenderConfig`)에 28개 키/치수 초기값 추가.
3. normalize/merge 로직에 28개 키 병합 추가.
4. 카드 기본 구조에 상태별 배경 4노드 기본 탑재.

## 3.2 자산 매핑 규칙

파일:
- `src/utils/v2/asset-mapping.ts`

작업:
1. 파일명 규칙 매핑에 `multi_*`, `offlineMemo_*` 추가.
2. alias 규칙 확장:
- 예: `multi_mon`, `online_multi_mon`, `offline_memo_tue`, `memo_offline_sun`

## 3.3 에디터 자산 UI

파일:
- `src/app/(root)/v2-template/_components/properties/model/template-properties-constants.ts`
- `src/app/(root)/v2-template/_components/properties/panels/template-assets-tab.tsx`
- `src/app/(root)/v2-template/_components/properties/hooks/use-template-theme-asset-actions.ts`

작업:
1. “요일별 토글(on/off)” 기반 대신, 4상태별 7키를 기본 표시.
2. 상태별 “일괄 적용” 버튼 제공:
- `online 일괄 적용` -> `online_mon..sun` 7개 동시 반영
- `multi 일괄 적용` -> `multi_mon..sun`
- `offline 일괄 적용` -> `offline_mon..sun`
- `offlineMemo 일괄 적용` -> `offlineMemo_mon..sun`
3. bulk matcher candidate keys에 28개 포함.
4. 섹션 그룹을 `온라인`, `다회차`, `오프라인`, `오프라인 메모`로 고정한다.
5. “기본 에셋” 패널에서만 28키를 관리하고 `extraAssets`로 빠지지 않게 한다.

## 3.4 런타임 렌더

파일:
- `src/app/(root)/v2-template/_components/scene/card-cell.tsx`
- `src/utils/v2/template-render-config.ts` (`v2_isVisibleByMode` 연계)

작업:
1. 배경 노드는 상태별 visibilityMode로 분기 렌더.
2. `assetRefByDayKey[dayKey]`를 우선 사용(상태별 노드별로 독립).
3. 텍스트 노드도 이미 있는 status visibility 규칙과 동기화 확인.

## 3.5 Figma Importer

파일:
- `scripts/import-v2-template-from-figma.ts`

작업:
1. status/day 태그 해석을 4상태 기준으로 확장.
2. 배경 자산 target key 매핑을 28키로 확장.
3. 레이아웃/텍스트 variant 생성 시 4상태와 키 체계를 일치.
4. import summary에 상태별 매핑 통계 출력:
- `online mapped x/7`, `multi mapped x/7`, `offline mapped x/7`, `offlineMemo mapped x/7`
5. 템플릿 frame에 특정 상태 인스턴스가 없으면 component set fallback으로 보강 탐색.
6. asset 후보는 IMAGE/FILL 가능한 노드만 허용하고 TEXT/FRAME은 제외한다.

---

## 4) 마이그레이션 정책

이번 프로젝트 상황(테스트 중심, 기존 호환 부담 낮음)을 반영:

1. 신규/재주입 템플릿은 28키를 표준으로 저장.
2. 기존 템플릿 자동 호환(fallback)은 최소화한다.
3. 필요 시 1회성 변환 스크립트 제공:
- `online_*` 비어있으면 기존 `onlineByTheme`로 채움
- `multi_*` 비어있으면 `online_*` 복사
- `offlineMemo_*` 비어있으면 `offline_*` 복사

주의:
- fallback은 변환 시점에만 사용, 런타임 상시 fallback은 두지 않는다.

---

## 5) 검증 시나리오 (DoD)

1. 에셋 탭에서 4상태 x 7요일 총 28개 슬롯을 직접 확인 가능.
2. 템플릿 저장 후 DB `render_config.assets`에 28키 모두 존재.
3. 월요일이 Figma에서 offline만 보이는 케이스여도:
- importer가 컴포넌트셋 fallback으로 `online_mon` 포함 가능한지 검증.
4. Runtime 상태 전환 시 배경이 정확히 분기:
- online 단회차 -> `online_*`
- online 다회차 -> `multi_*`
- offline no memo -> `offline_*`
- offline + memo -> `offlineMemo_*`
5. Layers 카드 눈 토글이 free/grid/flex 모드에서 정상 동작.
6. 상태 전환 UI 규칙 검증:
- 온라인일 때만 다회차 토글 유효
- 오프라인일 때만 오프라인 메모 토글 유효
- 상태를 왕복 전환해도 28키 저장값은 유실되지 않음

---

## 6) 구현 순서 (권장)

1. 타입/기본값/normalize (컴파일 기준점 확보)
2. 렌더(카드 배경 4상태 분기) 반영
3. 에디터 자산 UI 28키 반영
4. importer 28키 매핑 반영
5. 통합 테스트 + 문서 업데이트

---

## 7) 리스크 및 대응

1. 리스크: 키 확장으로 누락 필드/타입 에러 대량 발생
- 대응: 타입/normalize를 1단계에서 먼저 고정

2. 리스크: importer가 일부 상태를 못 찾는 Figma 템플릿
- 대응: 컴포넌트셋 fallback 유지 + 상태별 매핑 리포트 출력

3. 리스크: UI 복잡도 증가
- 대응: 기본은 상태별 섹션 접기/펼치기 + 일괄 적용 버튼 제공

4. 리스크: 기존 template data와 시각 차이
- 대응: 테스트 템플릿 재주입을 기준으로 검증하고, 필요 시 1회성 변환 스크립트 사용

---

## 8) 바로 착수할 작업 브레이크다운

- [ ] `V2TemplateAssetMap` 28키 반영
- [ ] default config assets/assetDimensions 28키 반영
- [ ] normalize merge 28키 반영
- [ ] card default graph에 `multi-background`, `offline-memo-background` 추가
- [ ] template assets tab: 28키 렌더 + 상태별 일괄 적용 버튼
- [ ] bulk matcher 키/alias 업데이트
- [ ] importer status/day -> 28키 매핑
- [ ] dry-run + write-run 로그 검증
- [ ] runtime 상태 전환 테스트 (4경우)

---

## 9) 파일 단위 착수 체크리스트

타입/정규화:
- [ ] `/src/types/time-table/template-render-config.ts`
- [ ] `/src/utils/v2/template-render-config.ts`

에셋 매핑/추천:
- [ ] `/src/utils/v2/asset-mapping.ts`
- [ ] `/src/app/api/admin/v2/templates/assets/suggest-mapping/route.ts`

에디터 UI:
- [ ] `/src/app/(root)/v2-template/_components/properties/model/template-properties-constants.ts`
- [ ] `/src/app/(root)/v2-template/_components/properties/panels/template-assets-tab.tsx`
- [ ] `/src/app/(root)/v2-template/_components/properties/hooks/use-template-theme-asset-actions.ts`

렌더:
- [ ] `/src/app/(root)/v2-template/_components/scene/card-cell.tsx`
- [ ] `/src/app/(root)/v2-template/_components/scene/card-grid.tsx`

importer:
- [ ] `/scripts/import-v2-template-from-figma.ts`

검증:
- [ ] `npm run typecheck:v2-runtime`
- [ ] `npm run lint:v2-runtime`
