# 관리자 메뉴 및 팀 관리 분리

## 팀 관리 검토와 결정

레거시와 Studio 엔진은 `teams`, `team_members`, 사용자별 주간 일정을 공유한다.
레거시 템플릿은 `relations_team_template_and_team`, Studio 템플릿은
`team_studio_connections`에서 각각 팀을 연결한다.

API 주소나 화면만 분리해도 팀·멤버가 독립되는 것은 아니다. 사용자 선택에 따라
팀과 멤버는 공유하는 혼합 방식을 유지하고 공통 `TeamManagement` UI에 조회 범위를 전달한다.

| 연결 상태 | 레거시 팀 관리 | 새 에디터 팀 관리 |
| --- | --- | --- |
| 레거시 연결만 있음 | 표시 | 제외 |
| Studio 연결만 있음 | 제외 | 표시 |
| 양쪽 연결 있음(혼합) | 표시 | 표시 |
| 연결 없음 | 표시 | 표시 |

`GET /api/admin/teams?scope=legacy|studio`가 서버에서 목록을 분류한다.
기존 범위 없는 조회는 전체 팀을 반환해 양쪽 템플릿 연결 화면에서 기존 팀을 선택할 수 있다.
혼합 팀의 이름·멤버·활성 상태 변경과 팀 삭제는 양쪽 엔진에 적용된다.
엔진별 멤버가 달라야 할 때는 팀을 별도로 생성한다.
연결 변경 후에는 팀 목록 캐시를 무효화해 분류를 갱신한다.
DB 스키마 변경과 원격 데이터 이관은 필요하지 않다.

## 함께 적용한 변경

- 맞춤 주문은 썸네일·시간표 내부 탭으로 분리하고 탭별 조회 조건을 유지한다.
- 같은 상태 필터·정렬·10건 페이지 이동을 사용한다. 기본 제작 대기는 완료·취소를 제외한다.
- 레거시 메뉴에 썸네일 관리·팀 템플릿·에셋·레거시 팀 관리를 모은다.
- 기존 `/admin/teams`, `/admin/thumbnails`, `/admin/team-templates`,
  `/admin/legacy-template-assets` 주소는 해당 내부 탭을 표시한다.
- Studio·일반 템플릿·레거시 썸네일 목록에서 이름을 수정할 수 있다.
  판매 가격·상품 설명 등은 기존 상품 편집에서 관리한다.

## 검증

- `npx tsc --noEmit`
- `npm run lint` (기존 경고 포함)
- `node --import tsx scripts/check-admin-management.ts`
- 로컬 Next 개발 서버에서 `node scripts/check-admin-management-browser.mjs`

브라우저 검사는 모든 API를 테스트 응답으로 대체한다. 주문 조건·페이지 유지,
키보드 탭 전환, 레거시 메뉴, 팀 범위, 이름 저장·빈 이름 검증·실패 후 재시도,
모바일 화면을 검증하며 실제 DB에 쓰지 않는다.
