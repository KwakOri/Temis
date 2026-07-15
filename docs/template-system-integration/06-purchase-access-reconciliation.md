# 06. 구매·권한 데이터 정합성

## 목적

구매 승인 결과와 `template_access`를 일치시키고 중복 또는 누락된 이용 권한을
정리한다.

## 사전 점검

- 완료된 구매 요청인데 access가 없는 행
- 동일 `(template_id, user_id)`의 중복 access
- 삭제된 template/plan을 참조하는 행
- 사용자가 지정되지 않은 개인 맞춤 템플릿
- access는 있으나 구매·관리자 부여 근거를 추적할 수 없는 행

## 변경 범위

- 데이터 정리 migration을 로컬 복제본에서 먼저 검증한다.
- 정리 후 `template_access(template_id, user_id)` unique 제약을 추가한다.
- 구매 승인 처리는 insert가 아니라 idempotent upsert로 만든다.
- 관리자 수동 부여와 구매 승인 모두 `granted_by`/시간 정보를 유지한다.
- 완료 구매 → access 생성이 하나의 트랜잭션 경계 안에서 처리되도록 한다.

## 완료 조건

- 같은 사용자·템플릿 access가 한 건만 존재한다.
- 승인 API 재시도 시 중복 access가 생기지 않는다.
- 원격 복제 데이터에 대한 reconciliation 결과가 문서화된다.

