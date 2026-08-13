# 03단계 개발 명령문

아래 내용을 새 작업에 그대로 전달한다.

```text
/Users/kwakori/projects/promotion/temis에서 사용자 템플릿 UI 통합 계획의 03단계를 구현해줘. Legacy 시간표, Studio 시간표, Studio 썸네일을 로컬 DB 기준 마이페이지에서 실제 사용 가능하게 만들고 브라우저 smoke test까지 완료해라.

먼저 AGENTS.md와 다음 문서를 읽어라.
- docs/user-template-ui-integration/README.md
- docs/user-template-ui-integration/00-decisions-and-current-state.md
- docs/user-template-ui-integration/02-consumer-contract-and-cards.md
- docs/user-template-ui-integration/03-my-page-unified-ui.md

02단계 공용 계약과 카드가 완료됐는지 확인하고, 현재 마이페이지의 query·탭·팀 템플릿·구매 내역 흐름을 조사한 뒤 최소 범위로 통합한다.

필수 작업:
1. 구매한 템플릿과 작가의 내 작업물 영역에 02단계 공용 카드·cover resolver를 연결한다.
2. 각 영역에 전체/시간표/썸네일 필터를 제공하고 전체 빈 상태와 필터 결과 없음 상태를 구분한다.
3. Legacy 시간표, Studio 시간표, Studio 썸네일의 badge, 판매 유형, plan, 작가 출처와 종류별 CTA를 표시한다.
4. 모든 실행은 API 응답의 use_href를 사용하고 새 탭을 강제하지 않는다.
5. loading skeleton, 독립적인 query error와 refetch, 구매/작가 목록의 중복 규칙을 구현한다.
6. 작가 프로필이나 팀 query가 사용자 템플릿 표시를 불필요하게 막지 않게 한다.
7. 구매 승인, 직접 권한 부여·회수, 작가 연결 변경 mutation의 queryKeys.user.templates() invalidation 경계를 확인하고 필요한 곳만 수정한다.
8. 팀 템플릿은 기존 별도 시스템으로 유지하고 통합 목록에 섞지 않는다.
9. 모바일 1열, 태블릿 2열, 데스크톱 3~4열과 긴 다국어 이름, 키보드 탐색, alt text를 확인한다.

브라우저 검증:
- 세 종류 권한이 있는 로컬 사용자로 전체/시간표/썸네일 필터를 확인한다.
- 각 카드가 /time-table/{id}, /template-studio/{id}, /thumbnail/{id}로 정확히 이동하는지 확인한다.
- cover 없는 Studio 카드와 이미지 404가 placeholder로 전환되는지 확인한다.
- 작가+구매 중복과 팀 템플릿 회귀를 확인한다.
- 모바일과 데스크톱 대표 viewport에서 smoke test를 수행하고 결과를 기록한다.

기술 경계:
- Page에서 직접 fetch/Supabase를 호출하지 않고 React Query → service → API 계층을 지킨다.
- img, Tailwind, 필요한 cva variant를 사용한다.
- 대표 이미지 관리자 업로드는 04단계이므로 여기서는 fallback으로 완료한다.
- 원격 Supabase 접근, production build, 관련 없는 리팩터링, git stage/commit/push를 하지 않는다.
- dirty worktree를 보존한다.

npx tsc --noEmit, 변경 파일 ESLint, 관련 단위·컴포넌트 테스트, 브라우저 smoke, git diff --check를 수행한다. 03 문서의 완료 조건이 모두 충족되면 문서와 상위 README 상태를 갱신한다. 최종 보고에는 변경 파일·핵심 symbol, 화면별 동작, 검증 결과, 남은 위험을 적고 04단계는 시작하지 마라.
```
