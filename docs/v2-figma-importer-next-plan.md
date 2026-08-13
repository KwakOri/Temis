# V2 Figma Importer (Next) Plan

- 작성일: 2026-04-18
- 목적: 카드 28상태(7일 x 4상태)를 안정적으로 추출/주입하기 위한 신규 importer 경로 정의

## 확정 결정

1. 입력 소스 분리
- `rootFrameUrl`: scene 배치(카드 7개 위치/크기) 추출 전용
- `cardComponentSetUrl`: 카드 내부 구조/스타일/슬롯 추출 전용

2. 상태 강제 규칙
- `online`: 반드시 7개
- `offline`: 반드시 7개
- `multi`: `0 또는 7`
- `offlineMemo`: `0 또는 7`
- `(day,status)` 중복 금지

3. Entry 프레임 규칙
- 공통 권장 골격 유지
- offline/offlineMemo도 `Frame [slot=card.entry] [index=0]` 사용 권장

4. 슬롯/바인딩 엄격도
- 구조 판단은 `slot` 우선
- 데이터 바인딩 판단은 `bind` 사용
- 텍스트 노드는 `slot + bind` 동시 존재를 권장(누락 시 경고)

5. 배경 에셋 규칙
- 카드 배경은 `[slot=card.background] [asset=...]` 태그를 1순위로 사용
- 이름 기반 alias는 보조 fallback만 허용

6. AI 운용 규칙
- 기본 모드: `B` (규칙 기반 + AI 검수 리포트 중심, 자동 구조 보정 금지)
- 자동 보정은 고위험 항목(구조/slot/bind 변경) 금지
- 저위험 후보(자산 키 추정)만 향후 선택적으로 허용
- `C`(AI 자동 보정)는 당장 기본 모드로 사용하지 않음
  - 이유: 구조 오판 시 템플릿 전체 좌표/슬롯이 연쇄 손상될 수 있음
  - 적용 가능 범위: 향후 `asset key 추천` 같은 저위험 항목에 한정

7. 전환 전략
- 기존 importer 유지
- 신규 importer 파일 병행 추가 후 점진 전환

## 권장 기본 동작

1. 먼저 `cardComponentSetUrl`로 상태 매트릭스 검증
2. 검증 통과 시에만 실제 import(write)
3. 실패 시 write 금지 + 누락/중복 리포트 출력

## 1차 구현 범위

1. 신규 CLI 엔트리 추가
- `scripts/import-v2-template-from-figma-v2.ts`

2. 검증기 구현
- root/card-set URL 파싱
- 같은 fileKey 검증
- 카드 상태 매트릭스(7/7/0or7) 검증
- 중복 `(day,status)` 검증

3. 실행 파이프
- 검증 통과 시 기존 importer(`import-v2-template-from-figma.ts`) 호출
- 기본은 dry-run, `--write` 명시 시 write

4. 리포트
- 상태별 카운트, 누락 상태, 중복 조합, 변형 식별 실패 목록

## 진행 현황 (2026-04-18)

- [x] 신규 스크립트 추가: `scripts/import-v2-template-from-figma-v2.ts`
- [x] 상태 매트릭스 검증(online/offline=7, multi/offlineMemo=0|7)
- [x] `(day,status)` 중복 검증
- [x] `--validate-only` 모드 지원
- [x] `.env/.env.local/.envrc` 자동 로드 지원
- [x] npm 스크립트 연결: `import:v2:figma:v2`
- [ ] 2차: 기존 importer 내부 카드 후보 확정 로직을 component-set 기반으로 완전 이관

## 후속(2차) 구현 범위

1. 기존 importer 내부의 카드 소스 후보 확정 로직을 신규 규칙으로 이관
2. component-set를 source of truth로 사용하고 root 인스턴스는 layout 전용으로 축소
3. 상태별 슬롯 누락표(critical/warning) 표준화
