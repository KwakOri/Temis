# 05단계 개발 명령문

아래 내용을 새 작업에 그대로 전달한다.

```text
/Users/kwakori/projects/promotion/temis에서 사용자 템플릿 UI 통합 계획의 05단계를 구현해줘. 상점 목록·상세·관리자 상품 편집·구매 요청을 시간표와 썸네일 종류에 맞게 연결하고 로컬 DB에서 검증해라.

먼저 AGENTS.md와 다음 문서를 읽어라.
- docs/user-template-ui-integration/README.md
- docs/user-template-ui-integration/02-consumer-contract-and-cards.md
- docs/user-template-ui-integration/04-catalog-cover-pipeline.md
- docs/user-template-ui-integration/05-shop-and-product-kind-ux.md

현재 상점 query/service/API, pagination, 상품 form, template_plans와 purchase request 흐름을 먼저 조사하고 기존 계약을 재사용한다.

필수 작업:
1. 상점 목록에 전체/시간표/썸네일 필터, kind badge, 공용 cover, 종류별 설명·CTA를 적용한다.
2. pagination이 있으면 kind filter를 서버 query param, service 인자, React Query key까지 일관되게 연결한다.
3. 상세 화면에서 시간표 capability와 썸네일의 변경 가능한 입력·PNG 다운로드·서버 미저장·동일 브라우저 이미지 보관 안내를 종류별로 표시한다.
4. 이미 권한이 있는 사용자는 API의 use_href로 바로 사용하기를 제공한다.
5. 관리자 상품 form은 공통 필드와 시간표 전용 capability를 구분하고 썸네일에서 시간표 전용 옵션을 숨겨 false 중립값으로 저장한다.
6. Studio 썸네일은 기존 DB 제약 안에서 pro 단일 plan으로 처리한다. plan enum이나 신규 capability schema migration은 추가하지 않는다.
7. POST /api/template-purchase-requests가 plan-template 소속, 판매 중, published, 일반 판매, 중복 pending, 기존 권한 재구매 정책을 서버에서 보장하게 한다.
8. 상세 페이지의 직접 fetch가 있다면 service와 React Query mutation으로 옮기고 성공 후 purchase history, shop access, user templates의 필요한 query key만 invalidate한다.
9. 신규 흐름이 구 purchase_requests와 /api/shop/purchase-request를 사용하지 않게 한다.
10. 향후 썸네일 전용 plan 도입 시 DB 제약, 구매 검증, access plan, 판매 판정, 정산·로열티, UI, 기존 pro 구매자 이관 영향을 결정 기록에 유지한다.

검증:
- 필터와 pagination 정합성
- 썸네일 상품의 시간표 capability 미노출
- 기존 시간표 lite/pro 회귀 없음
- 미구매, pending, 기존 권한 상태별 CTA
- 중복 pending과 잘못된 plan의 서버 거부
- 승인 후 바로 사용하기 경로
- 모바일 목록·상세·구매 form
- npx tsc --noEmit, 변경 파일 ESLint, 관련 route/unit 테스트, 브라우저 smoke, git diff --check

경계:
- 원격 Supabase를 읽거나 변경하지 않는다.
- 결제 자동화, 썸네일 전용 plan migration, 사용자 결과 서버 저장은 범위 밖이다.
- Page/UI 직접 fetch·Supabase 호출, production build, 관련 없는 리팩터링, git stage/commit/push를 하지 않는다.
- dirty worktree를 보존한다.

05 문서의 완료 조건이 모두 충족되면 문서와 상위 README 상태·검증 결과를 갱신한다. 최종 보고에는 변경 파일·핵심 symbol, kind/plan 계약, API 오류 정책, query invalidation, 검증 결과와 잔여 위험을 적어라. 06단계는 시작하지 마라.
```
