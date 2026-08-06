# 01단계 개발 명령문

아래 내용을 새 작업에 그대로 전달한다.

```text
/Users/kwakori/projects/promotion/temis에서 사용자 템플릿 UI 통합 계획의 01단계를 구현해줘. 검토 보고로 끝내지 말고, 로컬 DB·API 기준선을 실제로 재현하고 필요한 최소 코드·검증 스크립트·fixture를 구현해라.

먼저 AGENTS.md와 다음 문서를 읽어라.
- docs/user-template-ui-integration/README.md
- docs/user-template-ui-integration/00-decisions-and-current-state.md
- docs/user-template-ui-integration/01-local-db-api-baseline.md

선행 조건인 00단계 결정이 현재 문서와 코드에 반영됐는지 확인한 뒤 진행한다.

필수 작업:
1. npm run dev:local 기준으로 로컬 Supabase migration이 빈 환경에서 재현 가능한지 확인한다.
2. templates의 engine/kind/status, Studio 문서·revision·draft·asset·user state, template_access unique, shop_templates unique, approve_template_purchase_request RPC를 검사한다.
3. Legacy 시간표, Studio 시간표, Studio 썸네일, draft, archived, 작가 연결, 미권한 사용자, 관리자까지 재현 가능한 로컬 fixture를 만든다. fixture는 반복 실행 가능하고 종료 시 안전하게 정리돼야 한다.
4. GET /api/user/templates, template access, Studio timetable runtime GET/PUT, thumbnail runtime GET, 잘못된 kind, thumbnail PUT 405, 미권한 403을 실제 route 또는 HTTP 수준에서 검증한다.
5. 구매 요청의 plan-template 검증과 승인 RPC의 원자성·중복 승인 idempotency를 검증한다.
6. 기존 검증 스크립트가 부족하면 프로젝트 패턴을 따라 최소한으로 보강하고 package script가 필요하면 명확한 이름으로 추가한다.
7. 02단계가 사용할 실제 사용자 템플릿 응답 예시를 비밀정보 없이 문서에 기록한다.

안전 경계:
- 원격 Supabase는 읽기와 쓰기 모두 금지한다. bare supabase link/db push/migration repair를 실행하지 않는다.
- 기존 로컬 데이터가 있는 환경에서 승인 없이 db reset이나 파괴적 정리를 하지 않는다.
- fixture는 예약된 테스트 식별자를 사용하고 운영 사용자 정보를 복제하지 않는다.
- 관련 없는 리팩터링, production build, git stage/commit/push를 하지 않는다.
- dirty worktree의 기존 변경을 보존한다.

검증 기준:
- npx tsc --noEmit
- 변경 파일 ESLint
- 문서에 기재된 check:template-* 및 check:thumbnail-studio:* 중 관련 명령
- fixture cleanup 확인
- git diff --check
tsx IPC가 EPERM이면 node --import tsx scripts/<check-file> 형태를 사용한다.

완료 조건은 01 문서의 체크리스트 전체다. 모두 충족하면 01 문서와 상위 README의 상태·검증 결과를 갱신한다. 충족하지 못한 항목이 있으면 완료로 표시하지 말고 재현 근거와 정확한 차단 원인을 보고해라. 최종 보고에는 변경 파일, 핵심 symbol, migration/API 검증 결과, 실행 명령과 결과, 잔여 위험을 포함해라. 02단계 구현은 시작하지 마라.
```
