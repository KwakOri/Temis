# 02단계 개발 명령문

아래 내용을 새 작업에 그대로 전달한다.

```text
/Users/kwakori/projects/promotion/temis에서 사용자 템플릿 UI 통합 계획의 02단계를 구현해줘. 계획만 제시하지 말고 소비자용 계약, 정규화 함수, 대표 이미지 resolver와 공용 카드까지 코드와 테스트로 완성해라.

먼저 AGENTS.md와 다음 문서를 읽어라.
- docs/user-template-ui-integration/README.md
- docs/user-template-ui-integration/00-decisions-and-current-state.md
- docs/user-template-ui-integration/01-local-db-api-baseline.md
- docs/user-template-ui-integration/02-consumer-contract-and-cards.md

01단계 완료와 로컬 API 응답 계약을 확인한 뒤, 기존 타입·service·hook·카드 구현을 조사해 중복을 만들지 말고 필요한 최소 변경만 한다.

필수 작업:
1. UI가 사용할 ConsumerTemplateSummary 또는 동등한 명시적 camelCase 계약을 정의한다.
2. Legacy template_kind=null을 timetable로 정규화하고 engine, sales type, access source, plan, thumbnail URL, use_href를 한 경계에서 변환한다.
3. 대표 이미지 우선순위를 thumbnail_url → Legacy timetable 정적 이미지 → 종류별 placeholder로 적용하는 pure resolver를 만든다. 빈 URL과 이미지 로드 실패도 처리한다.
4. 시간표/썸네일, 선택적 Legacy/Studio, 일반 판매/맞춤, plan, 권한 출처, 종류별 CTA를 지원하는 재사용 카드·badge·cover primitive를 구현한다.
5. 탐색은 실제 링크와 API의 use_href를 사용한다. UI에서 route를 다시 계산하지 않는다.
6. 이미지 오류는 React state로 처리하고 DOM innerHTML 조작을 사용하지 않는다.
7. Page/UI가 직접 fetch하지 않도록 UserService와 useUserTemplates의 기존 계층을 유지한다.
8. 필요한 variant는 cva, 이미지는 next/image가 아닌 img, 스타일은 Tailwind를 사용한다.

테스트와 검증:
- kind/engine/null 정규화 단위 테스트
- cover resolver의 URL, Legacy fallback, Studio placeholder, 빈 문자열 테스트
- 세 종류 카드의 badge, CTA, href와 이미지 오류 테스트
- 키보드 focus와 accessible name 확인
- 모바일 폭 레이아웃 확인
- npx tsc --noEmit, 변경 파일 ESLint, 관련 테스트, git diff --check

경계:
- 마이페이지 전체 개편은 03단계로 남긴다.
- 원격 Supabase를 읽거나 변경하지 않는다.
- 관련 없는 리팩터링, 신규 네트워크 계층, production build, git stage/commit/push를 하지 않는다.
- dirty worktree와 기존 사용자 변경을 보존한다.

02 문서의 완료 조건을 모두 충족하면 해당 문서와 상위 README의 상태·검증 결과를 갱신한다. 최종 보고에는 변경 파일, 공용 계약과 핵심 symbol, 테스트 결과, 마이페이지가 03단계에서 연결해야 할 인터페이스와 잔여 위험을 적어라. 03단계 구현은 시작하지 마라.
```
