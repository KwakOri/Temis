# 04단계 개발 명령문

아래 내용을 새 작업에 그대로 전달한다.

```text
/Users/kwakori/projects/promotion/temis에서 사용자 템플릿 UI 통합 계획의 04단계를 구현해줘. 카탈로그 대표 이미지를 관리자가 업로드·교체·삭제하고 마이페이지와 상점이 templates.thumbnail_url로 소비할 수 있게 완성해라.

먼저 AGENTS.md와 다음 문서를 읽어라.
- docs/user-template-ui-integration/README.md
- docs/user-template-ui-integration/02-consumer-contract-and-cards.md
- docs/user-template-ui-integration/03-my-page-unified-ui.md
- docs/user-template-ui-integration/04-catalog-cover-pipeline.md

03단계가 cover 없이도 fallback으로 동작하는지 확인하고, 기존 R2 asset service, 관리자 Template Hub/상품 form, 인증·업로드 route 패턴을 재사용한다.

필수 작업:
1. 관리자 UI → React Query mutation → browser service → /api/admin/templates/{id}/catalog-cover → server service → R2/DB 흐름을 구현한다.
2. 관리자 인증, template 존재 여부, PNG/JPEG/WebP MIME, 파일 크기와 16:9 권장 규격을 검증한다.
3. 업로드 성공 후에만 templates.thumbnail_url을 갱신한다.
4. 교체는 새 자산 저장과 DB 갱신이 성공한 뒤 이전 관리 자산을 정리한다. DB 갱신 실패와 이전 삭제 실패의 orphan 처리·로그 정책을 구현하거나 명확히 기록한다.
5. 삭제 시 thumbnail_url을 비우고 02단계 placeholder/Legacy fallback이 즉시 적용되게 한다.
6. 관리자 미리보기에서 contain/cover 정책과 투명 PNG 배경을 확인할 수 있게 한다.
7. 마이페이지, 상점 목록·상세, 관리자 미리보기가 동일 resolver와 URL을 사용하게 한다.
8. catalog cover와 사용자가 썸네일 런타임에서 생성한 PNG 결과물을 코드·문구·저장 경로에서 명확히 분리한다.

범위 제한:
- 초기 필수 경로는 관리자 업로드 하나다.
- published 문서 기반 자동 생성, 발행 시 자동 캡처, 비동기 생성 job은 구현하지 않는다.
- cover 실패가 템플릿 발행이나 사용자 실행을 막게 만들지 않는다.
- 외부 URL 허용 여부는 기존 정책을 조사해 API 계약에 명시하되 범위를 넓히지 않는다.
- 운영 R2 bucket이나 원격 Supabase를 사용하지 않는다. 개발용 자산 환경이 없다면 mock/local 검증 범위와 실제 브라우저 검증 차단점을 명확히 보고하고 완료로 표시하지 않는다.
- production build, 관련 없는 리팩터링, git stage/commit/push를 하지 않는다.

검증:
- Studio 시간표·썸네일 업로드, 교체, 삭제
- Legacy 정적 cover 회귀
- 잘못된 MIME/크기/미권한 요청 거부
- 업로드 성공·DB 실패와 이전 삭제 실패 처리
- 이미지 404 fallback
- 마이페이지와 상점의 동일 URL 표시
- npx tsc --noEmit, 변경 파일 ESLint, 관련 테스트, 브라우저 확인, git diff --check

04 문서의 완료 조건을 모두 충족하면 문서와 상위 README 상태·검증 결과를 갱신한다. 최종 보고에는 API 계약, R2 key/정리 정책, 변경 파일·핵심 symbol, 검증 결과, 운영 전 필요한 설정을 비밀값 없이 적어라. 05단계나 자동 생성 기능은 시작하지 마라.
```
