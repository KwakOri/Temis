# V2 Figma Shared-Status Importer Design

- 작성일: 2026-04-19
- 목적: `day x status` 28상태 매트릭스가 아닌, `status 공용 컴포넌트` 기반의 단순 카드 템플릿도 v2 importer로 안정적으로 주입할 수 있게 설계한다.

## 배경

현재 v2 importer는 카드 컴포넌트셋을 `day x status` 매트릭스로 검증한다.

- `online`: 정확히 7개
- `offline`: 정확히 7개
- `multi`: `0 또는 7`
- `offlineMemo`: `0 또는 7`

이 구조는 요일별 카드 내부 스타일이 모두 다른 템플릿에는 잘 맞지만, 아래와 같은 단순 템플릿에는 맞지 않는다.

- 카드 내부 구조/스타일이 요일별로 모두 동일
- `online`, `offline` 두 상태만 존재
- `multi`, `offlineMemo` 없음
- 카드 내부는 공용 status 컴포넌트만 있고, root frame 쪽에서 카드 7개가 배치됨

예시:

- [공용 status 카드 예시](https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/temis?node-id=620-7317&t=eKZPLlQRLjeQfd82-4)

## 문제 정의

현재 구조의 한계는 세 가지다.

1. `shared-status card set`를 importer가 받지 못한다.
- `online/offline` 2개만 있으면 validation 단계에서 실패한다.

2. 공용 status 마스터 1개를 수정해도 importer 관점에서는 "7개 day variant가 없음"으로 처리된다.
- 즉 Figma의 authoring 효율을 importer가 살리지 못한다.

3. 텍스트 노드 authoring 규칙이 명확히 문서화되지 않았다.
- `FlexibleText`는 `Frame > Text`
- 일반 `Text`는 단독 Text
- 이 혼합 구조를 유지할지, 전부 wrapper를 둘지 기준이 필요하다.

## 목표

1. `shared-status card set`를 1차 지원한다.
- 최소 지원 케이스:
  - `online`: 1개
  - `offline`: 1개
  - `multi`: 0 또는 1개
  - `offlineMemo`: 0 또는 1개

2. 공용 status variant 하나를 수정하면, 재import 시 7일 전부 반영되게 한다.

3. 에디터에서도 공용 source에서 확장된 스타일은 즉시 7일 전부에 반영되게 한다.
- Figma 수정 -> 재import만이 아니라
- editor 수정 -> linked day sections 동시 갱신도 지원한다.

4. 텍스트 authoring 규칙을 확정한다.
- `FlexibleText`와 일반 `Text`의 권장 구조를 문서화하고 importer도 그 기준에 맞춘다.

## 비목표

1. 1차에서 "일부 day만 detach해서 개별 override" UI까지 완성하는 것은 범위가 아니다.
- 1차 기본 동작은 `shared group 수정 = 연결된 day 모두 동기화`다.
- "이 day만 분리"는 2차 과제로 둔다.

2. runtime/editor 내부 데이터를 `single shared style record`로 완전 통합하는 것은 이번 1차 범위가 아니다.
- 1차는 기존처럼 day별 확장 저장을 유지한다.
- 대신 확장본끼리의 linkage metadata를 추가한다.

3. `shared-status`와 `day-specific override`를 동시에 섞는 복합 모드는 2차 과제로 둔다.

## 용어

### 1. Day-Status Matrix Mode

현재 importer가 지원하는 모드.

- 7일 x 상태별 variant를 모두 가진다.
- 예: `day=mon,status=online`, `day=tue,status=online` ...

### 2. Shared-Status Mode

새로 지원할 모드.

- 상태별 공용 variant만 가진다.
- 예: `status=online`, `status=offline`
- day tag는 없거나 무시된다.

### 3. Expanded Day Candidate

`shared-status variant`를 importer 내부에서 `mon..sun` 7일로 확장한 synthetic candidate.

## 확정 결정

### 1. 입력 소스는 그대로 2개를 유지한다

- `rootFrameUrl`: scene 배치 추출 전용
- `cardComponentSetUrl`: 카드 내부 구조/스타일 추출 전용

`shared-status mode`도 동일한 입력 인터페이스를 사용한다.

### 2. validation 모드를 2개로 확장한다

#### A. Matrix Mode

기존 규칙 유지.

- `online`: 7
- `offline`: 7
- `multi`: `0 또는 7`
- `offlineMemo`: `0 또는 7`

#### B. Shared-Status Mode

신규 규칙.

- `online`: 1
- `offline`: 1
- `multi`: `0 또는 1`
- `offlineMemo`: `0 또는 1`
- 동일 `status` 중복 금지
- day tag는 없어도 됨

### 3. 1차는 "전부 shared"만 지원한다

지원:

- `online/offline` 공용 2개
- 혹은 `online/offline/multi/offlineMemo`가 있어도 각 상태당 1개

미지원:

- `online`은 shared 1개인데 `offline`은 7개
- 어떤 status는 shared, 어떤 status는 day-specific
- shared base + 일부 day override 혼합

이 혼합 모드는 validation을 단순하게 유지하기 위해 2차로 미룬다.

### 4. import 결과물은 현재처럼 day별로 확장 저장한다

shared-status mode라도 DB/render-config 내부 결과는 `day별 노드/스타일`로 저장한다.

이유:

- runtime/editor 구조를 크게 바꾸지 않아도 된다.
- 기존 day별 style key 체계를 그대로 활용할 수 있다.
- 기존 `free` grid 모드와 `detached component + instanceTransforms` 구조를 그대로 유지할 수 있다.

즉:

- source of truth는 shared variant 1개
- imported config는 7일로 expansion된 결과
- 단, 각 확장 style key/node에는 "같은 shared source에서 왔다"는 linkage metadata를 남긴다.

### 5. editor 전파를 위해 shared linkage metadata를 저장한다

`shared-status mode`로 확장된 결과물은, day별 style key가 서로 독립된 척 보이더라도 실제로는 같은 source에서 왔다는 연결 정보를 함께 저장한다.

1차 제안 저장 위치는 두 가지 중 하나다.

#### A. graph node meta 확장

- 대상 타입:
  - [src/types/time-table/template-render-config.ts](/Users/kwakori/projects/promotion/temis/src/types/time-table/template-render-config.ts)
- 후보 필드:
  - `meta.sharedSourceMode?: "matrix" | "shared-status"`
  - `meta.sharedVariantKey?: string`
  - `meta.sharedStyleGroupIds?: Partial<Record<"container" | "entry" | "text" | "wrapper" | "options", string>>`

장점:

- 기존 `node.styles.*StyleKey`와 함께 읽기 쉽다.
- 레이어/속성 패널에서 "이 노드는 shared"라는 표시를 만들기 쉽다.

#### B. render config 최상위에 shared group registry 추가

- 후보 형태:
  - `sharedStyleGroups: Record<string, { memberSectionKeys: string[]; mode: "sync-all" }>`

장점:

- style section 단위 전파 대상을 한 번에 조회하기 쉽다.
- editor action이 section key만 받아도 propagation 가능하다.

1차 권장안은 `B + 최소한의 A` 조합이다.

- graph node meta에는 `sharedVariantKey` 정도만 남기고
- 실제 전파 대상 조회는 `sharedStyleGroups`에서 처리한다.

이유:

- editor 수정 진입점은 결국 `section key`이기 때문이다.
- 현재 editor는 [use-template-style-editor-actions.ts](/Users/kwakori/projects/promotion/temis/src/app/(root)/v2-template/_components/properties/hooks/use-template-style-editor-actions.ts) 의 `updateStyleSection(section, nextMap)` 중심으로 동작한다.
- 따라서 "section -> linked sections" 조회가 쉬운 저장 구조가 더 유리하다.

### 6. editor 전파 대상은 "카드 내부 스타일"로 제한한다

기존 `free` grid와 `instanceTransforms`는 day별 배치 책임을 가진다.

- [src/app/(root)/v2-template/_components/scene/card-grid.tsx](/Users/kwakori/projects/promotion/temis/src/app/(root)/v2-template/_components/scene/card-grid.tsx)
- [src/utils/v2/template-render-config.ts](/Users/kwakori/projects/promotion/temis/src/utils/v2/template-render-config.ts)

따라서 shared propagation은 아래처럼 나눈다.

#### 전파 대상

- `containerStyleKey`
- `textStyleKey`
- `wrapperStyleKey`
- `optionsKey`
- status root background container style

즉 카드 내부의 시각 스타일과 텍스트 속성은 공용 source 수정 시 같이 움직인다.

#### 기본 제외 대상

- `entryStyleKey`
- `graph.componentDefinitions[*].instanceTransforms`
- grid slot/flex/free 배치 정보

이유:

- `entryStyleKey`는 day별 card 배치나 entry 위치 보정과 충돌할 가능성이 높다.
- `instanceTransforms`는 root frame의 7일 배치를 표현하므로 shared sync 대상이 아니다.

정리:

- `shared-status mode`의 공용화는 "카드 내부 스타일 공유"
- day별 scene/grid 배치는 기존처럼 개별 유지

### 7. 기존 style clone 로직을 재사용한다

현재 importer에는 이미 "하나의 base node/style ref를 suffix를 붙인 여러 확장본으로 복제"하는 로직이 있다.

- [scripts/import-v2-template-from-figma.ts](/Users/kwakori/projects/promotion/temis/scripts/import-v2-template-from-figma.ts)
- `cloneCardLayoutRecordWithSuffix`
- `cloneNodeStyleRefsWithSuffix`
- `ensureStatusTextVariantNode`

즉 1차 구현은:

1. shared variant 1개를 `mon..sun`으로 synthetic expansion
2. 기존 clone 흐름으로 day별 style key 생성
3. 생성된 style key들을 `sharedStyleGroups`에 묶어 저장

으로 끝낼 수 있다.

새로운 style storage 체계를 만들 필요는 없다.

### 8. offlineMemo는 shared-status mode에서도 card root 규칙을 유지한다

`offlineMemo`는 항상:

- `status root`의 직접 자식
- `bind=card.offlineMemo`

이어야 한다.

`entry.offlineMemo`는 허용하지 않는다.

### 9. 텍스트 authoring 규칙은 hybrid 구조를 유지한다

#### FlexibleText

권장 구조:

- `Frame [slot=...]`
  - `Text [bind=...]`

이유:

- multiline
- auto-resize
- center alignment
- wrapper/container 분리

#### 일반 Text

권장 구조:

- 단독 `Text [slot=...] [bind=...]`

이유:

- `date/time/day` 같은 고정 텍스트는 wrapper가 불필요하다.
- layer depth가 얕아지고 authoring이 단순해진다.

정리하면:

- `FlexibleText`: wrapper 유지
- `Text`: 단독 text 유지

전부 `Frame > Text`로 통일하지 않는다.

## importer 설계

### 1. wrapper 단계

대상 파일:

- [scripts/import-v2-template-from-figma-v2.ts](/Users/kwakori/projects/promotion/temis/scripts/import-v2-template-from-figma-v2.ts)

할 일:

1. `component set` children에서 `day/status`를 파싱한다.
2. 아래 두 모드 중 하나로 classify한다.
- `matrix`
- `shared-status`
3. classify 실패 시 validation error를 낸다.

### 2. mode 판별 규칙

#### Matrix Mode

아래를 모두 만족하면 matrix mode:

- `online = 7`
- `offline = 7`
- `multi = 0 or 7`
- `offlineMemo = 0 or 7`

#### Shared-Status Mode

아래를 모두 만족하면 shared-status mode:

- `online = 1`
- `offline = 1`
- `multi = 0 or 1`
- `offlineMemo = 0 or 1`
- duplicate status 없음

#### 그 외

critical error:

- `"card component set does not match matrix mode or shared-status mode"`

### 3. expanded day candidate 생성

shared-status mode일 때는 wrapper가 variant를 `mon..sun` 7일로 복제한 것처럼 importer에 전달한다.

예:

- `status=online` 공용 variant 1개
  -> synthetic:
  - `(mon, online)`
  - `(tue, online)`
  - ...
  - `(sun, online)`

- `status=offline`도 동일

이때 실제 Figma node는 같은 variant를 가리키되, importer가 받는 candidate meta에는 synthetic dayKey를 부여한다.

### 4. shared style group 생성

shared-status mode에서 expansion된 각 candidate는 import 시 아래와 같은 shared group registry를 만든다.

예:

- source variant: `status=online`
- group seed: `shared-status:online`

생성 규칙 예시:

- `shared-status:online:background:container`
- `shared-status:online:mainTitle:container:e0`
- `shared-status:online:mainTitle:text:e0`
- `shared-status:online:mainTitle:wrapper:e0`
- `shared-status:online:mainTitle:options:e0`
- `shared-status:online:subTitle:*`
- `shared-status:online:streamingTime:*`
- `shared-status:online:streamingDate:*`

각 group에는 7일에서 확장된 section key들을 넣는다.

예:

- `shared-status:online:mainTitle:text:e0`
  - `mainTitleTextStyle__mon__online__e0`
  - `mainTitleTextStyle__tue__online__e0`
  - ...
  - `mainTitleTextStyle__sun__online__e0`

이 group registry는 이후 editor action에서 즉시 전파 기준으로 사용된다.

### 5. core importer 단계

대상 파일:

- [scripts/import-v2-template-from-figma.ts](/Users/kwakori/projects/promotion/temis/scripts/import-v2-template-from-figma.ts)

현재 core importer는 이미 `resolveDayStatusCandidate({ dayKey, status })` 형태의 day/status 후보 해석을 전제로 한다.

1차 구현에서는 wrapper가 expanded candidate를 만들어 넘기기 때문에, core importer는 큰 구조 변경 없이 재사용한다.

즉 1차 구현 포인트는:

- wrapper에서 shared-status -> expanded day candidate 변환
- core importer는 기존 day/status 주입 로직 유지

## Figma authoring 규칙

### Shared-Status Mode 권장 구조

#### online

- `Image [slot=card.background]`
- `Frame [slot=card.entry] [index=0]`
  - `FlexibleText [slot=card.mainTitle] [bind=entry.mainTitle]`
  - `FlexibleText [slot=card.subTitle] [bind=entry.subTitle]`
  - `Text [slot=card.time] [bind=entry.time]`
  - `Text [slot=card.date] [bind=entry.date]`

#### offline

- `Image [slot=card.background]`
- `Text [slot=card.day] [bind=entry.day]` 또는 `Text [slot=card.date] [bind=entry.date]`
- 오프라인 전용 fixed text/label

단, offline 템플릿도 런타임 데이터 연동을 원하면 `Entry(index=0)`를 두는 쪽이 더 안전하다.

#### offlineMemo

- `Image [slot=card.background]`
- `FlexibleText [slot=card.offlineMemo] [bind=card.offlineMemo]`
- `Frame [slot=card.entry] [index=0]`
  - `Text [slot=card.date] [bind=entry.date]`

### day tag 규칙

shared-status mode에서는 day tag를 붙이지 않는 것을 권장한다.

이유:

- `shared`라는 의도가 더 명확해진다.
- variant가 공용 source라는 사실을 validation에서 더 쉽게 판단할 수 있다.

## editor 반영 정책

### Figma 단계

가능하다.

- 7개 card가 같은 shared status 컴포넌트를 사용하면
- 마스터 1개 수정 후 재import로 7일 전부 반영된다.

### Editor 단계

이번 설계에서는 가능하게 만든다.

- import 결과는 여전히 day별 style로 분리 저장되지만
- `sharedStyleGroups`를 통해 editor가 linked section 전부를 같이 갱신한다.

핵심 구현 지점:

- [src/app/(root)/v2-template/_components/properties/hooks/use-template-style-editor-actions.ts](/Users/kwakori/projects/promotion/temis/src/app/(root)/v2-template/_components/properties/hooks/use-template-style-editor-actions.ts)
- [src/app/(root)/v2-template/_components/editor/model/style-section-resolver.ts](/Users/kwakori/projects/promotion/temis/src/app/(root)/v2-template/_components/editor/model/style-section-resolver.ts)

현재는 `updateStyleSection(section, nextMap)`가 section 1개만 갱신한다.

1차 변경 방향:

1. `section -> propagationTargetSections[]` resolver 추가
2. section이 shared group 소속이면 member section 전체를 찾음
3. 각 section에 동일 `nextMap`을 적용
4. scene/root section은 기존처럼 단일 갱신 유지

즉 editor 기준 정책은 다음과 같다.

- shared-status에서 확장된 카드 내부 스타일 수정
  - 즉시 7일 전파
- grid/free 배치, instanceTransforms 수정
  - day별 개별 유지
- 향후 2차에서만 "이 day만 detach" 지원

## 구현 단계

### Phase 1 - shared-status validation + expansion

대상:

- [scripts/import-v2-template-from-figma-v2.ts](/Users/kwakori/projects/promotion/temis/scripts/import-v2-template-from-figma-v2.ts)

작업:

1. mode classifier 추가
2. shared-status validation 추가
3. shared-status -> expanded day candidate 변환 추가
4. validation summary에 `mode=matrix|shared-status` 출력

완료 조건:

- `online/offline` 2개만 있는 공용 카드셋이 validate-only 통과
- 기존 28상태 템플릿도 regression 없이 통과

### Phase 2 - shared linkage metadata 저장

대상:

- [scripts/import-v2-template-from-figma.ts](/Users/kwakori/projects/promotion/temis/scripts/import-v2-template-from-figma.ts)
- [src/types/time-table/template-render-config.ts](/Users/kwakori/projects/promotion/temis/src/types/time-table/template-render-config.ts)

작업:

1. `sharedStyleGroups` 저장 구조 추가
2. shared-status expansion 결과의 style key를 group별로 registry에 기록
3. node meta에 최소한의 `sharedVariantKey` 또는 `sharedSourceMode` 저장

완료 조건:

- import 결과 config에 linked section group 정보가 남는다
- runtime에는 영향 없이 normalize/load가 통과한다

### Phase 3 - editor 즉시 전파

대상:

- [src/app/(root)/v2-template/_components/properties/hooks/use-template-style-editor-actions.ts](/Users/kwakori/projects/promotion/temis/src/app/(root)/v2-template/_components/properties/hooks/use-template-style-editor-actions.ts)
- [src/app/(root)/v2-template/_components/editor/model/style-section-resolver.ts](/Users/kwakori/projects/promotion/temis/src/app/(root)/v2-template/_components/editor/model/style-section-resolver.ts)

작업:

1. `section -> linked shared members` resolver 추가
2. `updateStyleSection`을 `updateStyleSections` 형태로 확장
3. shared group이면 member section 전체를 한 번에 갱신
4. 비공유 section이면 기존 단일 동작 유지

완료 조건:

- 월요일 `MainTitle` text style 수정 시 화~일까지 즉시 반영
- `grid/free` 배치는 다른 day에 전파되지 않음

### Phase 4 - importer audit/report 정리

대상:

- [scripts/import-v2-template-from-figma.ts](/Users/kwakori/projects/promotion/temis/scripts/import-v2-template-from-figma.ts)

작업:

1. audit 로그에 `sourceMode` 표시
2. shared-status expansion origin을 summary에 남김
3. shared mode에서 day tag가 들어온 경우 warning 정책 정리

### Phase 5 - optional detach / mixed mode 검토

후속 과제:

- shared group에서 특정 day만 분리(detach)하는 UI
- shared base + 일부 day override 허용 여부 검토
- 현재는 미지원 유지

## 리스크

1. shared-status와 matrix mode를 애매하게 섞은 component set
- classifier가 모호해질 수 있음
- 1차는 아예 불허하는 것이 안전

2. offline variant의 구조 자유도가 너무 높아지는 문제
- 텍스트 노드가 너무 자유롭게 배치되면 importer 탐색 안정성이 떨어짐
- 권장 slot/bind 규칙을 문서로 고정해야 함

3. editor에서 "한 번 수정했더니 7일이 같이 바뀌는" 동작이 surprise가 될 수 있음
- 속성 패널에 `shared` 배지 또는 설명이 필요
- 향후 detach 액션 필요

4. 전파 범위를 너무 넓게 잡으면 day별 배치까지 같이 바뀔 수 있음
- `entryStyleKey`, `instanceTransforms`는 1차에서 제외하는 것이 안전

## 검증 시나리오

### 시나리오 A. 기존 28상태 템플릿

- 결과:
  - 기존과 동일하게 통과
  - mode=`matrix`

### 시나리오 B. online/offline 공용 2variant 템플릿

- 입력:
  - `online=1`
  - `offline=1`
  - `multi=0`
  - `offlineMemo=0`
- 결과:
  - validate 통과
  - mode=`shared-status`
  - import 시 7일로 expansion

### 시나리오 C. offlineMemo 공용 포함 템플릿

- 입력:
  - `online=1`
  - `offline=1`
  - `offlineMemo=1`
- 결과:
  - `offlineMemo`가 root direct child + `card.offlineMemo`면 통과
  - 아니면 critical

### 시나리오 D. editor 즉시 전파

- 입력:
  - shared-status mode로 import된 템플릿
  - 월요일 `MainTitleTextStyle` 수정
- 결과:
  - 화~일까지 같은 shared group의 `MainTitleTextStyle`가 즉시 동일 값으로 갱신
  - `grid/free` 배치값은 유지

### 시나리오 E. free layout 템플릿

- 입력:
  - `layout.grid.layoutMode = free`
  - 7일 card 위치가 `instanceTransforms`로 관리됨
- 결과:
  - 카드 내부 text/wrapper/options 수정은 7일 전파
  - 개별 카드 위치/크기/회전은 전파되지 않음

## 결론

1차 방향은 다음으로 고정한다.

1. 기존 `28상태 matrix mode`는 유지
2. 새로 `shared-status mode`를 추가
3. shared-status mode는 wrapper 단계에서 `7일 synthetic candidate`로 expansion
4. 결과 저장은 기존처럼 day별 확장 저장
5. 대신 shared expansion 결과의 style key들을 `sharedStyleGroups`로 묶어 linkage metadata를 저장
6. editor 수정은 linked style sections 전체에 즉시 전파
7. `free` grid 및 `instanceTransforms`는 기존처럼 day별 유지
8. 텍스트 authoring은 hybrid 유지
- `FlexibleText = Frame > Text`
- `Text = 단독 Text`
