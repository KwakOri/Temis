# v2-template 구조 전환 실행 계획 (Component / Instance / Ordering)

## 0) 배경과 목표

이 문서는 v2-template를 **포토샵/피그마식 편집 경험**으로 확장하기 위한 구조 전환 실행안이다.

핵심 목표:
- Layer 탭은 **인스턴스 편집 전용**
- Components 탭은 **마스터(원본) 편집 전용**
- 인스턴스 편집은 항상 **override-only**
- 정렬은 우선 pointer 기반으로 진행하되, 추후 **orderKey(lexo/fractional)** 로 무중단 이행 가능하게 설계
- 그룹 밖 이동 / 그룹 간 이동(re-parent) / Card -> Scene 루트 이동 규칙 명확화

## 1) 비기능 원칙

- 하위호환은 이번 브랜치(`temis-template-system-v2-dev`)에서 우선순위 아님
- 기존 레거시 경로 의존성은 단계적으로 축소 후 제거
- 로컬 저장소는 당분간 localStorage 유지
- 저장소 추상화(Supabase 전환 대비)는 현재 단계에서 포함하지 않음

## 2) 데이터 모델 원칙

### 2.1 마스터/인스턴스 분리

- `graph.componentDefinitions`: 마스터 정의
- `graph.nodes`: 노드 그래프(구조 데이터)
- Layer에서 편집되는 값은 기본적으로 노드 본문 변경이 아니라 override로 저장

### 2.2 정렬 모델 추상화

정렬 로직은 반드시 `OrderAdapter`를 통해 접근:

- `PointerOrderAdapter` (현재 활성)
- `OrderKeyAdapter` (후속)

확장 슬롯:
- `order.model: "pointer" | "orderKey"`
- `order.prevSiblingId?: string | null`
- `order.orderKey?: string`

## 3) UX/편집 규칙

- Layer 탭에서는 인스턴스 선택/가시성/순서/부모 이동/override 편집
- Components 탭에서는 마스터 구조(추가/삭제/기본 스타일/기본 바인딩) 편집
- Layer에서 "마스터 편집"을 누르면 Components 탭으로 포커스 이동
- 인스턴스에서 override reset 지원

## 4) Card 관련 정책

Card는 현재 "컴포넌트" 개념이 명확히 드러나는 대표 케이스다.

- Card 인스턴스 이동/정렬은 Layer에서 가능
- Card 내부 구조 변경은 Components에서만 가능
- "인스턴스 분리(detach)"는 단방향 동작으로 정의 (되돌리기 없음)

Move / Extract Copy 분리:
- Move: 마스터 노드에서 제거 + 대상 부모로 재부모화
- Extract Copy: 마스터는 유지 + 대상 부모에 새 노드 생성

## 5) 단계별 구현 계획

## Phase A (현재 착수) - 정렬 어댑터 실사용 연결

- `OrderAdapter`/pointer 구현 정리
- 기존 layer 순서 계산 경로를 adapter 경유로 통일
- 기존 zIndex 기반 결과와 동등 동작 보장

완료 조건:
- Layers 패널 렌더 순서 계산에 adapter가 실제 사용됨
- 드래그 정렬 후 순서가 기존과 동일하게 반영됨

## Phase B - 정렬 데이터 슬롯 확장

- graph 노드에 order 확장 슬롯 타입 추가
- normalize 단계에서 order 값의 안전한 보정(sanitize)

완료 조건:
- 타입/정규화가 `pointer/orderKey` 모두 수용 가능
- 기존 데이터 로딩 시 회귀 없음

## Phase C - Re-parent DnD

- Drop mode를 before/inside/after로 확장
- 부모 변경(re-parent) 지원
- 자기 자신/자식 하위 이동 금지

완료 조건:
- 그룹 밖 이동/그룹 간 이동이 UI + 데이터에 일관 반영

## Phase D - Components 탭 분리 강화

- Layer/Properties와 독립된 Components 패널 구성
- 마스터 편집 진입 동선 확정

완료 조건:
- "인스턴스 편집 vs 마스터 편집" 경계가 UI에서 명확

## Phase E - Card 예외 흐름 축소

- Card 전용 하드코딩 경로 제거
- 일반 컴포넌트 규칙으로 수렴

완료 조건:
- Card도 동일한 컴포넌트/인스턴스 규칙으로 동작

## Phase F - orderKey 이행 준비 완료

- `OrderKeyAdapter` 초안 + 시뮬레이터
- pointer -> orderKey 변환 유틸 준비

완료 조건:
- 런타임에 adapter 교체가 가능
- 전환 실험이 코드 변경 최소로 가능

## 6) 리스크와 완충 전략

- pointer 체인 손상
  - sanitize에서 부모 단위 재연결 + 안정 정렬 fallback
- 마스터/인스턴스 경계 혼선
  - 패널 분리 + 편집 진입점 강제
- 대규모 리팩토링 중 회귀
  - phase 단위 점진 적용 + 단계별 타입/린트 검증

## 7) 즉시 실행 항목 (이번 작업)

1. 계획 문서 최신화 (완료)
2. Phase A 구현 시작:
   - `layer-z-index`를 adapter 경유 경로로 리팩토링
   - 기존 UI 동작 동일성 확인
3. 타입체크/린트 최소 검증 후 커밋

## 8) 진행 현황 (2026-04-10)

- 완료
  - Phase A: `OrderAdapter`(pointer) 도입 및 실제 정렬 경로 연결
  - Phase B(기반): graph node `order` 슬롯(`model/prevSiblingId/orderKey`) 타입/정규화 추가
  - pointer 정합성 보정 유틸(`v2_normalizePointerOrderInGraph`) 추가 및 editor/render-config 경로 연결
  - re-parent primitive(`v2_graphMoveNode`) 추가
  - Scene 노드 구조 패널에서 부모 이동 UI 연결
  - Layers 패널 `before/inside/after` 드롭 및 re-parent relay 연결
  - 왼쪽 패널 `Layers / Components` 분리 탭 추가
  - Components 탭 `Detach (one-way)` 동작 추가
  - Scene/Properties 주요 액션(`reorder`, `relocate`, `add/remove`, `binding/meta`)을 graph-first sync로 통일
  - Card 노드 액션(`visibility`, `binding`, `meta`, `append/remove`, `instance`)을 graph-first sync로 통일
  - Form schema 바인딩 재작성 흐름을 graph 기준으로 통일하고 runtime 구조 재생성으로 연결
  - normalize 단계에서 graph payload 우선 처리:
    - graph가 존재하면 structure 기반 fallback 주입 최소화
    - 최종 structure를 normalized graph에서 runtime 재생성

- 부분 완료
  - Phase C: DnD re-parent가 scene 기반 노드에서 동작 (추가 UX polishing 필요)
  - Phase D: Components 탭 최소 분리 완료 (마스터 편집 전용 플로우 강화 필요)
  - Phase E(진행): `cardCollection`에 `componentId`를 도입해 카드 렌더/레이어 생성 경로를 컴포넌트 기반으로 일반화
  - graph-only 전환(진행): 구조 직접 수정 코드는 대부분 정리됨. `graph` 미보유 레거시 입력의 구조 마이그레이션 경로 정리만 남음

- 남은 핵심
  - Card 전용 예외 경로 축소 및 일반 컴포넌트 규칙으로 통합
  - orderKey adapter 실제 도입 및 pointer->orderKey 전환 유틸 고도화
  - 완전 graph-only 경로로 잔여 fallback 의존 제거
