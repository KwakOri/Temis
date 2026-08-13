# 07. 레거시 정리

상태: 보류  
선행 단계: 06. 정식 전환과 관찰 기간 완료  
실행 조건: 사용자 승인

## 1. 목표

Hub 정식 전환 후 실제로 사용하지 않는 기존 목록 코드, 중복 API, 레거시 컬럼을
안전하게 정리한다.

이 단계는 기능 개발이 아니라 제거 작업이다. 사용 경로와 데이터 이력을 확인한
뒤 작은 PR로 나누어 진행한다.

## 2. 정리 원칙

- 사용 여부를 `rg`, route 참조, 브라우저 검증으로 확인
- 코드 제거와 DB migration을 같은 PR에 섞지 않음
- 기존 URL redirect를 먼저 충분히 운영
- 상품·구매·권한·정산 이력이 있는 데이터는 삭제하지 않음
- 원격 DB 변경은 사용자 명시 요청 없이 실행하지 않음

## 3. 후보 영역

### 기존 목록 UI

- `src/components/admin/TemplateManagement.tsx`
- 기존 Template Studio 관리자 목록 page·list component
- 기존 탭 전용 상태·modal·helper

Studio 생성·편집·미리보기 컴포넌트는 유지 대상이다. 관리자 목록과 제작 도구를
경로 기준으로 구분해 삭제한다.

### 기존 route·API

- Hub로 대체된 목록 route
- 더 이상 호출되지 않는 레거시 `template_products` API
- 중복된 판매 상태 변경 경로

API는 호출 검색만으로 제거하지 않는다. 외부 운영 도구나 북마크된 관리자
workflow 사용 여부도 확인한다.

### 타입과 hook

- 실제 응답과 맞지 않는 기존 확장 타입
- 기존 목록에서만 쓰던 hook·service
- Hub 도입 후 참조가 0인 helper

### DB 컬럼·테이블

- `templates.is_shop_visible`
- 레거시 `template_products`

DB 정리는 별도 migration 계획과 원격 데이터 점검이 필요하다. 코드 제거가 끝난
후에도 바로 DROP하지 않고 최소 한 번의 배포 관찰 기간을 둔다.

## 4. 삭제 정책

Hub의 영구 삭제는 엔진이 아니라 데이터 이력으로 판단한다.

### 영구 삭제 허용 후보

- `status=draft`
- 상품 없음
- 구매 요청 없음
- 접근 권한 없음
- 판매·정산 이력 없음

### 영구 삭제 금지

- 게시 또는 판매 이력 존재
- 상품·구매·권한·작가 정산 관계 존재
- 운영 사용 여부 불명확

삭제 금지 템플릿은 판매 중지 후 archive를 기본으로 한다. 실제 삭제 API를 Hub에
추가하는 것은 별도 기능 요청으로 다룬다.

## 5. 권장 작업 순서

1. 참조·사용 경로 inventory 작성
2. 사용하지 않는 UI component 제거
3. 사용하지 않는 hook·service·type 제거
4. 기존 API access log와 호출 여부 확인
5. 사용하지 않는 API 제거
6. 최소 한 번 배포·관찰
7. DB 컬럼·테이블 migration 작성
8. 로컬 reset과 복제 데이터 검증
9. 원격 반영 계획을 사용자에게 별도 제시

각 단계는 독립적으로 되돌릴 수 있는 작은 커밋으로 만든다.

## 6. 검증

- `rg`로 제거 심볼 참조 0건 확인
- TypeScript typecheck
- ESLint
- production build
- 기존 템플릿 통합 check scripts
- Hub 목록·판매 mutation 회귀
- Studio 생성·편집·미리보기
- Legacy 실행
- 상품·구매·권한·정산 흐름
- 로컬 migration reset

## 7. 완료 조건

- 정식 운영 경로가 Hub로 단일화됨
- 삭제된 코드의 참조 0건
- Studio 제작 route와 Legacy 실행 route 정상
- 중복 API 제거 후 회귀 없음
- DB 정리 migration이 로컬에서 재현됨
- 원격 반영은 사용자 승인 전 실행되지 않음
- rollback 또는 forward-fix 전략 문서화

