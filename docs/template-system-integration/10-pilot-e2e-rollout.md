# 10. 파일럿 E2E와 배포 준비

## 목적

한 개 Studio 템플릿을 실제 판매·권한·사용자 저장 흐름에 연결해 전체 설계를
검증한 뒤 원격 반영 준비 자료를 만든다.

## 파일럿 시나리오

1. 관리자가 Studio 템플릿을 생성하고 draft를 저장한다.
2. preview를 확인하고 publish한다.
3. 일반 판매 상품과 plan을 연결해 상점에 노출한다.
4. 사용자가 구매 요청을 하고 관리자가 승인한다.
5. `template_access`가 한 건 생성된다.
6. 구매자는 Studio 실행 페이지에서 값을 저장·재조회한다.
7. 미구매 사용자와 다른 사용자는 접근하지 못한다.
8. 작가와 관리자는 의도한 범위에서 접근한다.
9. template revision을 갱신하고 기존 사용자 상태 호환성을 확인한다.

## 자동 검증

- migration reset 및 migration up
- lint/typecheck/build
- persistence/API checks
- entitlement 단위·통합 테스트
- 사용자 간 runtime 격리 테스트
- anon 직접 DB 접근 거부 테스트

## 원격 반영 전 산출물

- 적용 migration 목록과 순서
- 원격 적용 전 데이터 점검 SQL과 예상 건수
- 구매/access reconciliation 결과
- rollback 또는 forward-fix 전략
- 수동 smoke test 체크리스트
- 원격 반영 후 모니터링 항목

## 경계

이 단계까지 Codex 작업은 로컬 검증과 문서화로 끝낸다. 원격 migration 적용과
운영 데이터 변경은 사용자가 직접 수행한다.

