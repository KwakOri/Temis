# 06단계 개발 명령문

아래 내용을 새 작업에 그대로 전달한다.

```text
/Users/kwakori/projects/promotion/temis에서 사용자 템플릿 UI 통합 계획의 06단계를 구현해줘. 구매 승인, 관리자 직접 권한 부여·회수, 작가 연결이 세 템플릿 종류의 동일 entitlement와 사용자 목록으로 이어지게 완성해라.

먼저 AGENTS.md와 다음 문서를 읽어라.
- docs/user-template-ui-integration/README.md
- docs/user-template-ui-integration/00-decisions-and-current-state.md
- docs/user-template-ui-integration/05-shop-and-product-kind-ux.md
- docs/user-template-ui-integration/06-entitlement-purchase-admin-ui.md

기존 관리자 access 화면, 구매 요청 목록, 승인 RPC, template_artists mutation과 사용자 query invalidation을 조사한 뒤 최소 변경으로 통합한다.

필수 작업:
1. 공통 entitlement 순서인 로그인 → 관리자 → published → template_access 또는 template_artists를 모든 종류에서 일관되게 사용한다.
2. 관리자 템플릿 선택 UI에 시간표/썸네일, Legacy/Studio, draft/published/archived, 일반 판매/맞춤 표시와 이름·종류·게시 상태 필터를 추가한다.
3. 직접 권한 부여는 같은 template_id/user_id에 idempotent한 upsert로 처리하고, 사용자·템플릿 존재 및 제공된 plan의 소속을 서버에서 검증한다.
4. granted_by는 요청 body가 아니라 인증된 관리자 id를 사용한다.
5. 관리자에서는 read/write/admin 값을 확인·수정할 수 있지만 일반 사용자 UI에는 구조 편집 권한처럼 표시하지 않는다. API/service의 access_level 값은 보존한다.
6. 구매 승인 UI는 종류·engine·plan·가격·사용자·상태를 표시하고 서버의 원자적 승인 route 하나만 호출한다.
7. 중복 승인은 권한 한 건을 유지하고 이미 완료된 상태를 명확히 처리한다.
8. 작가 연결 사용자는 내 작업물에 나타나며 구매 권한과 중복이면 기존 규칙대로 내 작업물에만 표시한다. 연결 해제 후 구매 권한이 남으면 구매 목록으로 복귀시킨다.
9. 권한 부여·회수, 승인, 작가 연결 변경 후 정확한 access, purchase, user templates query를 invalidate한다.
10. 권한 회수 후 새 runtime 요청은 403, archived는 권한 행이 있어도 일반 사용자 목록·실행에서 제외, 판매 중지는 기존 권한 회수와 분리되게 한다.

검증:
- 세 템플릿 종류의 직접 권한 부여·중복 부여·회수
- 잘못된 사용자·템플릿·plan 거부
- 승인 RPC 원자성과 중복 승인
- 작가/구매 중복과 연결 해제 fallback
- draft/archived와 판매 중지의 서로 다른 동작
- 일반 사용자 access_level 오해 표현 없음
- npx tsc --noEmit, 변경 파일 ESLint, route/service 테스트, 로컬 브라우저 smoke, git diff --check

경계:
- is_public이나 상점 노출을 이미 부여된 실행 권한으로 사용하지 않는다.
- 권한 레벨별 Studio 구조 편집 기능은 구현하지 않는다.
- 원격 Supabase 접근, production build, 관련 없는 리팩터링, git stage/commit/push를 하지 않는다.
- dirty worktree를 보존한다.

06 문서의 완료 조건을 모두 충족하면 문서와 상위 README 상태·검증 결과를 갱신한다. 최종 보고에는 변경 파일·핵심 symbol, entitlement 불변식, mutation과 invalidation, 검증 결과, 잔여 위험을 포함해라. 07단계는 시작하지 마라.
```
