# 07단계 개발 명령문

아래 내용을 새 작업에 그대로 전달한다.

```text
/Users/kwakori/projects/promotion/temis에서 사용자 템플릿 UI 통합 계획의 07단계를 수행해줘. 01~06단계 구현을 로컬 Supabase와 실제 브라우저에서 수직 검증하고, 자동화가 부족한 부분은 테스트로 보강해 로컬 출시 후보를 만들어라. 검토만 하고 끝내지 마라.

먼저 AGENTS.md와 다음 문서를 읽어라.
- docs/user-template-ui-integration/README.md
- docs/user-template-ui-integration/01-local-db-api-baseline.md
- docs/user-template-ui-integration/03-my-page-unified-ui.md
- docs/user-template-ui-integration/05-shop-and-product-kind-ux.md
- docs/user-template-ui-integration/06-entitlement-purchase-admin-ui.md
- docs/user-template-ui-integration/07-local-e2e-and-legacy-boundary.md

01~06단계가 완료 상태인지 확인한다. 미완료가 있으면 07 범위 안의 테스트 결함인지 제품 구현 누락인지 구분하고, 작은 누락은 수정·검증하되 큰 기능 누락은 완료를 선언하지 말고 정확히 보고한다.

필수 작업:
1. 로컬 fixture와 API E2E에 구매자 Legacy 시간표, 구매자 Studio 시간표, 구매자 Studio 썸네일, 작가 두 Studio 종류, 미권한 사용자, 관리자, draft/archived를 포함한다.
2. 각 종류에서 상품 생성·판매 시작 → 구매 요청 → 관리자 승인 → template_access → 사용자 목록 → use_href 실행 수직 흐름을 검증한다.
3. Playwright 또는 저장소의 기존 브라우저 테스트 체계로 데스크톱 구매→승인→마이페이지→실행 전체 흐름과 모바일 핵심 smoke를 자동화한다.
4. Studio 시간표 runtime 값 저장·새로고침 복원과 Studio 썸네일 텍스트·이미지 입력·PNG 저장을 검증한다.
5. 사용자 전환 시 auth cookie, React Query cache와 IndexedDB 이미지가 다른 사용자에게 섞이지 않는지 확인한다.
6. Legacy /time-table/{id}, 정적 cover, 팀 템플릿, 관리자 Template Studio/Thumbnail Studio 편집·발행·preview, 구매 이력, 맞춤 주문, Template Hub 판매 상태를 회귀 검증한다.
7. 신규 UI가 독립 thumbnails, 구 purchase_requests, /api/shop/purchase-request, templates.is_shop_visible, template_products, Studio의 /thumbnail/{id}.png 가정에 의존하지 않는지 import·route 호출 수준에서 감사한다.
8. 사용하지 않는 레거시를 발견해도 삭제하지 말고 별도 정리 후보와 근거만 기록한다.
9. 수동 시각 검증으로 이미지 crop/focus, PNG 폰트·stroke·shadow·투명 배경, cover contain/cover, 다국어 긴 텍스트, 실제 모바일 터치를 확인하고 날짜·브라우저·viewport를 기록한다.
10. 발견한 문제를 P0/P1/P2로 분류하고 P0는 이 단계에서 수정·재검증한다.

검증 계층:
- PR 필수: npx tsc --noEmit, 변경 파일 ESLint, pure/static check, 카드·kind·cover 단위 테스트
- 로컬 release gate: route E2E, 세 종류 목록/use_href, Playwright 핵심 흐름, fixture cleanup
- 수동: 문서에 정의된 viewport와 시각 품질 체크리스트
- git diff --check

경계:
- 원격 Supabase를 읽거나 변경하지 않는다.
- production build는 프로젝트 규칙대로 기본 검증에서 제외한다.
- 레거시 table/route/data 삭제, 대규모 리팩터링, git stage/commit/push를 하지 않는다.
- 기존 dirty worktree를 보존한다.

07 출시 후보 체크리스트가 모두 충족되고 P0가 0건일 때만 문서와 상위 README를 완료로 갱신한다. 최종 보고에는 자동·수동 검증 환경과 결과, 변경 파일·테스트, P0/P1/P2 목록, 레거시 경계 감사 결과, fixture cleanup, 08단계 진입 가능 여부를 명확히 적어라. 08단계 원격 작업은 시작하지 마라.
```
