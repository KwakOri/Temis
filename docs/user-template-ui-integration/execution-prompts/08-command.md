# 08단계 개발 명령문

아래 내용을 새 작업에 그대로 전달한다.

```text
/Users/kwakori/projects/promotion/temis에서 사용자 템플릿 UI 통합 계획의 08단계를 준비하고, 승인 게이트를 지켜 원격 DB 최종 반영을 수행해줘.

중요: 이 명령문을 전달받았다는 사실만으로 원격 쓰기 승인을 받은 것으로 간주하지 마라. 먼저 읽기 전용 8.0 재감사와 rollout 계획만 수행하고 결과를 보고한 뒤, 원격 migration·데이터 변경·앱 배포에 대한 사용자의 별도 명시 승인을 기다려라.

먼저 AGENTS.md와 다음 문서를 읽어라.
- docs/user-template-ui-integration/README.md
- docs/user-template-ui-integration/07-local-e2e-and-legacy-boundary.md
- docs/user-template-ui-integration/08-remote-db-rollout.md

사전 게이트:
1. 07단계 체크리스트 완료, P0 0건, 로컬 전체 migration 재현과 release gate 결과를 확인한다.
2. 대상은 project ref ajlgjdwkjyayrnocdfpj 하나로 고정한다.
3. 원격 명령은 SB_TOKEN_TEMIS를 주입한 temis 전용 패턴만 사용하고 bare supabase login/link/db push를 사용하지 않는다.
4. 비밀값, DB URL, service role key를 로그·코드·문서에 남기지 않는다.

승인 전 읽기 전용 8.0 재감사:
- 원격/로컬 migration list 차이
- templates 실제 컬럼·제약
- Studio table/function/view 존재 여부
- 대상 table 행 수와 최근 수정 시각
- migration history 밖 수동 DDL 흔적
- 현재 배포 앱과 Supabase key 경계
- anon/authenticated table·function 권한
- v2 transitional data와 파괴적 migration 영향
- access 중복, 고아 관계, 잘못된 plan, 중복 shop product, Studio table 충돌

재감사 결과를 08 문서 또는 별도 날짜별 rollout 기록에 남기고, 2026-08-04 기준점과 달라진 항목, 배치 A~F별 영향 행 수·lock·비가역 위험, 백업·rollback, bridge release 또는 maintenance window, 앱/schema 배포 순서를 제시해라. 이 시점에는 어떤 원격 쓰기도 실행하지 말고 사용자에게 정확한 대상·명령 범주·위험을 제시해 명시 승인을 요청해라.

별도 승인을 받은 뒤에만 수행할 작업:
1. 승인된 운영 백업과 복구 책임·위치를 확인한다.
2. 신규 UI가 비활성화된 bridge release 또는 승인된 maintenance window를 준비한다.
3. migration timestamp 순서를 유지하고 08 문서의 의미 단위 배치 A~F로 적용·검증한다.
4. DROP, truncate, 중복 정리 등 비가역 작업은 대상 목록을 별도 백업하고 배치 직전 다시 확인한다.
5. 배치마다 schema, 데이터 정합성, 권한과 서버 API health를 검사하고 실패하면 다음 배치로 진행하지 않는다.
6. 최종 UI release 또는 feature flag 활성화 후 전용 파일럿 계정으로 Legacy 시간표, Studio 시간표, Studio 썸네일, 구매·승인, 마이페이지, 작가 연결, 미권한 403, draft/archived, 상점을 smoke test한다.
7. anon/authenticated가 민감 테이블을 직접 읽거나 쓰지 못하는지 검증한다.
8. 테스트 권한과 fixture를 정리하고 오류율·구매·승인 실패를 모니터링한다.

안전 경계:
- 승인 범위를 넘어 migration repair, rollback, 데이터 삭제, 다른 프로젝트 작업을 하지 않는다.
- 장애 시 anon 직접 접근을 성급히 복구하지 말고 승인된 rollback/서버 API 수정 경로를 우선한다.
- 관련 없는 리팩터링이나 git stage/commit/push를 하지 않는다. 앱 배포도 승인 범위에 포함된 경우에만 수행한다.
- 기존 dirty worktree를 보존한다.

완료 후 local/remote migration list 일치, 배치별 결과, smoke test, Legacy 회귀, 보안 권한, fixture cleanup, 모니터링, 백업·rollback 기록을 확인하고 08 문서와 상위 README 상태를 갱신한다. 최종 보고에는 실제 승인 내용, 대상 ref, 실행한 명령의 비밀값 제거본, migration별 결과, 데이터 영향, 배포 버전, 검증 결과와 잔여 위험을 포함해라.
```
