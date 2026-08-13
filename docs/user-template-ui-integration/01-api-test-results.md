# 01단계 API·구매 승인 검증 결과

확인일: 2026-08-05  
실행 방식: Next route handler에 `NextRequest`와 local JWT를 전달하는 route-level HTTP 계약 검증  
원격 DB: 미접속

## 실행 결과 요약

| 검증                                         | 명령                                                                                   | 결과                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------- |
| canonical schema/RPC                         | `npm run check:user-template-ui:schema`                                                | 통과                    |
| 사용자 목록·권한·runtime·fixture cleanup     | `npm run check:user-template-ui:baseline`                                              | 통과                    |
| plan-template negative cases와 RPC plan 방어 | `npm run check:purchase-plan-validation`                                               | 통과                    |
| entitlement 회귀                             | `npm run check:template-entitlement`                                                   | 통과                    |
| Template Studio runtime                      | `npm run check:template-studio:runtime`                                                | 통과                    |
| Thumbnail runtime/integration                | `npm run check:thumbnail-studio:runtime`, `npm run check:thumbnail-studio:integration` | 통과                    |
| Pilot E2E                                    | `npm run check:pilot-e2e`                                                              | 통과 (메일 실패는 허용) |
| Supabase key boundary                        | `npm run check:supabase-key-boundary`                                                  | 통과                    |
| TypeScript/lint/diff                         | `npx tsc --noEmit`, 변경 checker lint, `git diff --check`                              | 통과                    |

## 사용자 목록

`GET /api/user/templates`를 buyer/artist/no-access token으로 호출했다.

- buyer: `total_purchase=2`, `total_artist=1`, `total=3`
- Legacy published: `template_engine=legacy`, `template_kind=null`, `use_href=/time-table/{id}`
- Studio timetable published: `template_engine=studio`, `template_kind=timetable`, `use_href=/template-studio/{id}`
- Studio thumbnail published: `template_engine=studio`, `template_kind=thumbnail`, `use_href=/thumbnail/{id}`
- 동일 Studio timetable이 access와 artist link 양쪽에 있어도 artist section에 한 번만 나타남
- draft와 archived는 목록에서 제외됨
- artist user: 연결된 artist template 1건
- no-access user: 0건
- `template_engine`, `template_kind`, `status`, `thumbnail_url`, `use_href` 응답 필드 확인

승인 전 buyer 응답 예시는 [`01-user-template-response-sample.json`](./01-user-template-response-sample.json)이다. 승인 후에는 artist-linked template에 대한 access가 추가되어 buyer 목록이 4건이 된다.

## entitlement

`GET /api/template-access?templateId=...` 결과:

- access가 있는 published buyer: 200, `hasAccess=true`
- `template_artists`로 연결된 artist: 200, `hasAccess=true`
- access/link가 없는 사용자: 200, `hasAccess=false`, `reason=no_access`
- draft와 archived: access row가 있어도 일반 사용자는 `hasAccess=false`
- admin: `hasAccess=true`, `isAdmin=true`, `reason=admin_access`

## Studio runtime

`/api/user/templates/{id}/runtime` route를 직접 호출했다.

| 요청                                       | 기대/실제                         |
| ------------------------------------------ | --------------------------------- |
| timetable GET, buyer                       | 200, `kind=timetable`, revision 1 |
| timetable PUT, buyer                       | 200, user state 1건 생성          |
| timetable GET, no-access                   | 403                               |
| thumbnail GET `?kind=thumbnail`, buyer     | 200, `kind=thumbnail`             |
| thumbnail PUT, 유효 runtime payload, buyer | 405                               |
| thumbnail GET `?kind=timetable`            | 404 kind mismatch                 |
| thumbnail GET `?kind=invalid`              | 400 invalid kind                  |
| thumbnail GET, no-access                   | 403                               |

초기 검증에서 thumbnail PUT에 빈 payload를 넣으면 route의 payload validation이 먼저 실행되어 400이 되는 것을 확인했다. checker는 GET으로 받은 유효 runtime payload를 PUT에 사용해, 썸네일 저장 정책의 실제 405 경계를 검증한다.

## 구매 요청·승인

- 다른 템플릿의 plan으로 `POST /api/template-purchase-requests`: 400
- 요청 템플릿에 속한 published/visible plan: 201, pending request 생성
- draft 또는 shop hidden product: 400
- 승인 RPC에 다른 템플릿 plan override: 오류, request는 pending 유지, access 0건
- 정상 `approve_template_purchase_request`: request `completed`와 access upsert 수행
- 같은 승인 RPC를 즉시 한 번 더 호출: 성공, access는 정확히 1건
- access의 `template_plan_id`는 요청에 기록된 plan과 일치
- 승인 후 buyer 목록에 해당 템플릿이 노출
- 개선된 purchase-plan checker cleanup 후 `plan_check_user=0`,
  `plan_check_templates=0`을 read-only 조회로 확인

## unique 확인

통합 checker는 다음 duplicate insert를 실제 local DB에 시도했다.

- `template_access(template_id, user_id)`: unique violation
- `shop_templates(template_id)`: unique violation

검증 후 duplicate 시도에서 생긴 row가 없도록 cleanup 경로를 유지했다.
