# v2-template 프로젝트 점검 및 로드맵 (2026-04-11)

## 0) 목적

이 문서는 `v2-template`의 현재 구현 상태를 점검하고,
다음 개발 사이클에서 기능 중심으로 진행할 로드맵을 재정의한다.

핵심 방향:
- graph-first 구조 유지
- 정렬 모델은 `orderKey` 단일 쓰기 경로로 고정
- Layer/Component/Property의 역할 분리 강화
- 카드 중심 예외를 줄이고 일반 컴포넌트 모델로 수렴

## 1) 점검 결과

### 1.1 코드/브랜치 상태

- 브랜치: `features/template-system`
- 워크트리: clean
- 최근 변경은 `orderKey` 중심 정렬, graph normalize 강화, scene component 편집/복구 UX 보강에 집중됨

### 1.2 검증 결과

- `npx tsc --noEmit` 통과
- `npm run check:v2-orderkey` 통과

### 1.3 현재 아키텍처 상태 (요약)

- 데이터의 source of truth는 `renderConfig.graph`
- normalize에서 `pointer`는 읽기 호환 파싱만 허용하고, 정상화 결과는 `orderKey`로 저장
- cardCollection 기본 7개 인스턴스는 정규화 자동보정이 아니라 기본 그래프 시드 단계에서 생성
- child component id는 런타임/정규화 모두에서 명시값을 보존
- Layers/Components 탭 분리는 존재하며, 마스터 편집 진입은 Components 탭 중심으로 이동 중

### 1.4 현재 병목/부채

- 대형 파일 잔존
  - `use-template-scene-node-actions.ts` (~1389 lines)
  - `layers-panel.tsx` (~1270 lines)
  - `template-properties-panel.tsx` (~1190 lines)
- Components 탭은 아직 "카탈로그/진입" 중심이며, 컴포넌트 CRUD가 약함
- 카드 인스턴스 조정 UI에 `1~7` 하드코딩이 일부 잔존
- override를 체계적으로 관리/리셋하는 모델이 아직 약함

## 2) 현재 기능 상태

### 2.1 완료

- orderKey 기반 정렬/재정렬/검증 경로
- scene 노드 re-parent(루트/그룹/카드 컬렉션 제약 포함)
- component instance의 `Move To Root` / `Extract Copy To Root` 분리
- scene component instance의 `componentId`, `dayKey`, `instanceId` 속성 편집
- 카드 컬렉션의 자식 componentId 불일치 감지 + 동기화 액션
- 입력 스키마와 그래프 바인딩의 기본 일관성 관리(필드 수정/삭제 시 그래프 바인딩 반영)

### 2.2 부분 완료

- Layers는 인스턴스 중심으로 정리됐지만, "완전 인스턴스 전용 뷰" 규칙은 추가 정리가 필요
- Components는 마스터 편집 진입점은 있으나 마스터 라이프사이클 관리(CRUD) 기능 부족
- Card 일반화는 진행됐지만 일부 UX가 여전히 주간 7카드 전제에 묶여 있음

## 3) 재작성 로드맵

### 3.0 진행 현황 (2026-04-11 업데이트)

- Phase 1: 완료
  - Layers 인스턴스 편집 전용 안내 강화, Components 탭 중심 마스터 진입 정리
- Phase 2: 완료(1차)
  - Components 탭에서 `New / Duplicate / Delete` 지원
  - 삭제 시 사용 중 인스턴스 존재하면 차단
- Phase 3: 진행 중(핵심 완료)
  - scene component instance `Move / Extract Copy` 후처리 공통 유틸화
  - 남은 작업: 실패 메시지/제약 문구를 Layers/Properties에서 완전 단일화
- Phase 4: 진행 중
  - Card 인스턴스 보정 UI를 하드코딩 인덱스(1~7)에서 runtime `instanceId` 기반으로 전환
  - 남은 작업: dayKey 중복/누락 진단 배지 및 Data 탭 매핑 안내
- Phase 5: 진행 중
  - 입력 스키마에 필드별 사용 개수/연결 노드 라벨 표시
  - 필드 삭제 confirm에 실제 영향 노드 목록 표시
  - 남은 작업: rename/scope 변경 영향 목록 실시간 고정 패널화
- Phase 6: 완료
  - `layers-panel.tsx` -> `layers-tree.tsx` / `layers-dnd.ts` / `layers-components-tab.tsx` 분리
  - `template-properties-panel.tsx` -> selection/tabs/aggregator 단위 분리
  - `use-template-scene-node-actions.ts` -> structure/component-instance/binding 하위 훅 분리

## Phase 1 - Layer/Component 역할 경계 완성

목표:
- Layers는 인스턴스 운용(순서/가시성/구조 이동) 전용
- Components는 마스터 구조 편집 전용

작업:
- Layers에서 마스터 의미를 주는 표시/동선 최소화
- Components에서 마스터 선택/편집 컨텍스트를 더 명확히 표준화
- 선택 상태가 Properties 패널 모드와 항상 일치하도록 동기화

완료 조건:
- 사용자가 "지금 인스턴스를 편집 중인지 마스터를 편집 중인지"를 탭/패널에서 혼동하지 않음

세부 태스크:
1. Layers 탭에서 마스터 편집 액션 완전 제거 및 안내 문구 표준화
2. Components 탭에서 마스터 편집 진입 버튼/선택 상태를 단일 패턴으로 통일
3. 좌측 탭 선택과 우측 Properties `editorMode(instance|master)`를 강결합
4. 인스턴스 선택 상태에서 마스터 전용 패널 노출 시 안내 UI로 대체

영향 파일(예상):
- `_components/editor/layers-panel.tsx`
- `_components/editor/template-editor-shell.tsx`
- `_components/properties/template-properties-panel.tsx`
- `_components/properties/hooks/use-template-simple-properties-panel.tsx`

검증:
- Layers 탭에서 마스터 편집 진입 버튼이 보이지 않음
- Components 탭에서만 master 모드 진입 가능
- 동일 레이어 선택 시 포커스 모드가 흔들리지 않음

커밋 분할:
- P1-1: Layers/Components UX 경계
- P1-2: Properties 편집 모드 동기화

## Phase 2 - Component 라이프사이클 CRUD

목표:
- Card 외의 일반 컴포넌트도 생성/복제/삭제 가능한 구조 확립

작업:
- Components 탭에서 컴포넌트 생성/복제/삭제 액션 제공
- 생성 시 root node/layer/기본 스타일 키 자동 생성
- 삭제 시 참조 인스턴스 처리 정책(차단 또는 다른 컴포넌트로 치환) 명시

완료 조건:
- 컴포넌트를 데이터 단위로 관리하는 전체 흐름이 UI에서 완결됨

세부 태스크:
1. Components 탭에 `+ New Component` 추가
2. 선택 컴포넌트 `Duplicate Component` 지원
3. `Delete Component` 지원(사용 중 인스턴스 존재 시 차단/치환 옵션)
4. 생성/복제 시 `componentDefinitions + graph.nodes + layer` 동시 생성
5. 기본 style key/label 네이밍 규칙 확정

영향 파일(예상):
- `_components/editor/layers-panel.tsx`
- `_components/editor/template-editor-shell.tsx`
- `utils/time-table/template-graph-editor.ts`
- `utils/time-table/template-graph-runtime.ts`
- `_components/properties/model/structure-utils.ts`

검증:
- 신규 컴포넌트 생성 후 Components 탭/Properties에서 바로 편집 가능
- 복제 시 원본과 분리된 rootNodeId/styleKey가 생성됨
- 삭제 시 참조 무결성 깨지지 않음

커밋 분할:
- P2-1: Create/Duplicate
- P2-2: Delete + 참조 보호 정책

## Phase 3 - Re-parent/분해 정책 최종화

목표:
- Move(원본 이동)와 Extract Copy(복제 분리) 동작을 모든 경로에서 일관화

작업:
- Layers/Properties 양쪽에서 동일 정책 적용
- 카드 컬렉션 내부/외부 이동 제약 문서화 및 메시지 통일
- 이동 후 styleKey/layerTarget/layerSectionKey 정합성 자동 보정 강화

완료 조건:
- 어떤 경로로 이동해도 결과 그래프와 시각 결과가 동일

세부 태스크:
1. `Move To Root` / `Extract Copy` 공통 action 유틸로 통합
2. Layers 드래그 이동과 Properties 버튼 이동의 후처리(스타일/타깃) 일치화
3. cardCollection 내부 이동 제약 메시지/실패 피드백 통일
4. re-parent 후 sanitize/normalize 1회 통과 시 결과 변형 없는지 보장

영향 파일(예상):
- `_components/editor/template-editor-shell.tsx`
- `_components/properties/hooks/use-template-scene-node-actions.ts`
- `utils/time-table/template-render-config.ts`
- `utils/time-table/template-graph-order.ts`

검증:
- 동일 노드에 대해 Layers 이동 결과와 Properties 이동 결과가 동일
- 이동 전/후 `v2_validateOrderKeyGraph`가 항상 valid
- 실패 케이스에서 사용자 메시지가 일관됨

커밋 분할:
- P3-1: move/extract 공통화
- P3-2: 제약/피드백/정합성 마감

## Phase 4 - Card 7인스턴스의 데이터 주도화

목표:
- "7개"는 유지하되, 고정 인덱스 UI/로직 의존 축소

작업:
- 카드 인스턴스 편집 UI에서 하드코딩 `1..7` 표시 대신 런타임 인스턴스 목록 기반 렌더
- `instanceId`/`dayKey` 바인딩 규칙을 명시하고 중복/누락 진단 강화
- card scope 입력 데이터와 인스턴스 매핑을 구조적으로 노출

완료 조건:
- 카드 인스턴스 제어가 인덱스 하드코딩이 아니라 그래프 데이터 기준으로 동작

세부 태스크:
1. `Card Component` 패널의 인스턴스 보정 UI를 `Array.from({length:7})`에서 runtime instances 기반으로 전환
2. instance row에 `instanceId/dayKey/componentId`를 함께 노출
3. 중복 `instanceId` / 중복 `dayKey` / 누락 `dayKey` 진단 배지 제공
4. 데이터 탭(card scope)과 인스턴스 목록 간 매핑 안내 추가

영향 파일(예상):
- `_components/properties/components/template-card-component-properties.tsx`
- `_components/properties/template-properties-panel.tsx`
- `utils/time-table/template-graph-runtime.ts`
- `_components/properties/model/form-schema-diagnostics.ts`

검증:
- 카드 개수 변경 없이도 인스턴스 편집 UI가 그래프 목록 기준으로 렌더됨
- 진단 상태가 카드 컬렉션/인스턴스 편집 UI에 동일하게 표시됨

커밋 분할:
- P4-1: runtime 기반 렌더
- P4-2: 진단/매핑 안내

## Phase 5 - 입력 스키마/바인딩 워크플로우 완결

목표:
- 오브젝트 생성 -> 필드 정의 -> 바인딩 연결이 한 흐름에서 닫히도록 개선

작업:
- 바인딩 에디터에서 필드 즉시 생성/연결 UX 강화
- field rename/scope 변경 시 영향 범위 안내 개선
- 미사용/누락/타입 경고를 패널 상단에서 우선 노출

완료 조건:
- 템플릿 제작자가 "데이터가 어디에 들어가는지"를 설정 화면 내에서 즉시 추적 가능

세부 태스크:
1. 바인딩 에디터에서 `새 필드 생성 + 즉시 바인딩` UX 강화
2. 필드 rename/scope 변경 시 영향 노드 목록 즉시 노출
3. 필드 삭제 시 `사용 중 노드 목록` 명시 + 대체 전략 선택(빈 literal / 다른 필드로 치환)
4. Schema 탭 상단에 `missing/duplicate/unused/invalid` 요약을 고정 배치

영향 파일(예상):
- `_components/properties/components/template-node-binding-editor.tsx`
- `_components/properties/hooks/use-template-form-schema-actions.ts`
- `_components/properties/panels/template-schema-tab.tsx`
- `_components/properties/model/form-schema-diagnostics.ts`

검증:
- 새 오브젝트 생성 후 3클릭 이내 필드 생성/연결 가능
- 필드 변경 시 영향을 받는 노드가 즉시 보임
- 삭제 시 무음 손실 없이 명시적 확인 과정을 거침

커밋 분할:
- P5-1: create/bind UX
- P5-2: rename/delete 영향 분석 UX

## Phase 6 - 대형 파일 분해(기능 단위)

목표:
- 유지보수 난이도와 회귀 리스크 축소

작업:
- `use-template-scene-node-actions.ts`를 "구조 이동/메타 편집/컴포넌트 인스턴스" 하위 훅으로 분해
- `layers-panel.tsx`를 "트리 렌더/드래그앤드롭/컴포넌트 탭"으로 분해
- `template-properties-panel.tsx`를 선택/집계/탭 렌더 경계로 재분리

완료 조건:
- 핵심 파일 3개의 책임이 명확하고 파일당 복잡도가 현저히 감소

세부 태스크:
1. `use-template-scene-node-actions.ts` 분해
   - `use-scene-structure-actions` (완료)
   - `use-scene-component-instance-actions` (완료)
   - `use-scene-binding-actions` (완료)
2. `layers-panel.tsx` 분해
   - `layers-tree.tsx` (완료)
   - `layers-dnd.ts` (완료)
   - `components-tab.tsx`
3. `template-properties-panel.tsx` 분해
   - `properties-selection-context.ts` (완료)
   - `properties-tabs-renderer.tsx` (완료)
   - `properties-aggregators.ts` (완료)

영향 파일(예상):
- `_components/editor/layers-panel.tsx`
- `_components/properties/template-properties-panel.tsx`
- `_components/properties/hooks/use-template-scene-node-actions.ts`

검증:
- 분해 전/후 기능 스냅샷(선택, 이동, 바인딩, 스타일 수정)이 동일
- 타입체크/정렬체크 통과

커밋 분할:
- P6-1: scene actions 분해
- P6-2: layers panel 분해
- P6-3: properties panel 분해

## 4) 다음 실행 우선순위

1. Phase 1 완료 (역할 경계 고정)
2. Phase 2 착수 (컴포넌트 CRUD)
3. Phase 3 동작 정합성 마감
4. Phase 4/5로 데이터 바인딩 완성도 상승
5. Phase 6으로 유지보수성 확보

## 5) 실행 규칙

1. 각 Phase는 `작업 -> 타입체크/정렬체크 -> 커밋` 단위로 완료한다.
2. 커밋 메시지는 `feat/refactor/fix(v2-template): ...` 규칙을 사용한다.
3. 각 Phase 완료 후 문서의 상태를 `진행중/완료`로 갱신한다.
4. 구조 변경은 항상 graph 무결성(`v2_validateOrderKeyGraph`) 보존을 우선한다.

## 6) 비고

- 저장소(localStorage -> Supabase 추상화)는 별도 트랙으로 유지한다.
- 본 로드맵은 기능 구조 완성에 집중하며, 배포/운영 최적화 항목은 분리한다.
