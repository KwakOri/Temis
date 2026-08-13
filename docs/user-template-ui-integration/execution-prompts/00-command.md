# 00단계 개발 명령문

아래 내용을 새 작업에 그대로 전달한다.

```text
/Users/kwakori/projects/promotion/temis에서 사용자 템플릿 UI 통합 계획의 00단계를 수행해줘.

먼저 저장소의 AGENTS.md와 다음 문서를 읽어라.
- docs/user-template-ui-integration/README.md
- docs/user-template-ui-integration/00-decisions-and-current-state.md

목표는 구현 전에 현재 코드·migration·API가 계획 문서의 확정 결정과 일치하는지 재검증하고, 이후 단계가 따를 기준선을 고정하는 것이다. 단순히 문서를 요약하지 말고 실제 파일, route, service, hook, migration과 핵심 symbol을 근거로 확인해라.

필수 작업:
1. 사용자 템플릿 목록, entitlement, 런타임, 구매 요청·승인, 작가 연결 흐름을 추적한다.
2. Legacy 시간표, Studio 시간표, Studio 썸네일의 engine/kind/use_href 계약을 확인한다.
3. template_kind=null 정규화 경계, catalog cover fallback, access_level 보존, published 제한과 is_public 의미가 문서와 일치하는지 확인한다.
4. Page → React Query hook → service → API route → server service → Supabase 계층 위반 후보를 기록한다.
5. 문서와 코드가 다르면 현재 제품 의도와 migration 이력을 근거로 가장 작은 수정안을 결정하고 00 문서와 상위 README를 갱신한다.
6. 확정할 수 없는 항목은 구현을 추측하지 말고 ‘차단 항목’과 ‘후속 결정’으로 구분한다.

경계:
- 이 단계에서는 사용자 기능 구현을 시작하지 않는다.
- 원격 Supabase를 읽거나 변경하지 않는다.
- 로컬 DB를 초기화하거나 기존 데이터를 삭제하지 않는다.
- 관련 없는 리팩터링, 의존성 추가, git stage/commit/push를 하지 않는다.
- 기존 dirty worktree의 사용자 변경을 보존한다.

검증:
- 변경한 Markdown에 Prettier 검사를 수행한다.
- 상대 링크와 git diff --check를 확인한다.
- 코드 변경이 꼭 필요하지 않은 단계이므로 build는 실행하지 않는다.

완료 시 00 문서와 상위 README에 상태와 확인 날짜를 갱신하고, 최종 보고에는 확인한 파일·핵심 symbol, 일치한 계약, 남은 위험, 변경한 문서, 수행한 검증을 적어라. 01단계 구현은 시작하지 마라.
```
