# 11. 1~10단계 구현 검토와 후속 보완 항목

상태: 검토 완료, P0/P1/P2 보완 완료 — 남은 항목 2건은 별도 기능 작업으로 이연
(2026-07-15)

검토 기준 브랜치와 커밋:

- 브랜치: `features/template-system`
- 커밋: `f2ee153b`

## 목적

1~10단계 문서와 실제 애플리케이션 코드, Supabase migration, 로컬 복제 DB의
권한 상태를 다시 대조하고, 원격 반영 전에 보완해야 할 문제를 우선순위별로
기록한다.

이 문서는 기존 1~10단계의 구현 내용을 대체하지 않는다. 기존 단계가 의도한
기능은 대부분 구현되어 있으나, 배포 준비 완료 여부는 이 문서의 후속 보완
조건까지 함께 판단한다.

## 이번 검토의 범위와 보류 항목

검토에는 다음 항목을 포함했다.

- Preview/API 인증
- `templates` 공통 루트와 Studio FK 통합
- Studio persistence CRUD와 publish
- `is_public`과 이용 권한 의미 분리
- 구매 승인과 `template_access` 정합성
- 관리자·상점·마이페이지 연결
- 사용자별 Studio runtime 상태
- anon/authenticated DB 권한
- 파일럿 통합 테스트와 production build

다음 작업은 방향만 확인했으며 이번 후속 작업에서는 잠시 보류한다(P0의 근본
원인인 anon 쓰기 자체는 해결했다 — 아래 참고).

- 브라우저 Supabase 직접 호출을 모두 Next API route로 이전(우선 대상 12개
  라우트는 이번에 전환 완료, 앱 전체 전수 조사는 당시 보류)
- 전체 API route의 공개/사용자/관리자 권한 등급 분류
- 앱 전체 anon/authenticated GRANT 회수(우선 대상 테이블은 회수 완료, 전체
  스키마 전수 회수는 보류)

후속 14단계(2026-07-17)에서 Publishable/Secret key 전환과 남아 있던 브라우저
상점 목록·상세 Supabase 직접 조회 제거를 완료했다. 현재 두 키 모두 서버 전용
환경변수이며 세부 운영 전환 순서는 `14-supabase-api-key-cutover.md`에 기록했다.
같은 재검토에서 기존 "앱 전체 GRANT 회수 보류" 범위에 계정·토큰·정산 데이터
직접 변조가 가능한 P0가 실제로 남아 있음을 확인했으므로, 이 부분은 더 이상
원격 반영을 막지 않는 단순 후속 항목으로 보지 않는다.

## 종합 판정

| 단계 | 판정 | 검토 결과 |
| --- | --- | --- |
| 1 | 양호 | Preview API에 관리자 인증과 published 검사가 적용됨 |
| 2 | 양호 | `template_engine`, `status`, `created_by`와 제약·backfill이 구현됨 |
| 3 | 양호 | Studio 부모 테이블 제거와 `templates.id` FK 재연결이 구현됨 |
| 4 | 양호 | 템플릿 삭제 시 R2 asset prefix를 best-effort로 정리하도록 보완됨 |
| 5 | 양호 | `is_public` 권한 우회와 anon 작가 연결 변조 우회를 모두 제거함 |
| 6 | 양호 | access 중복 방지·원자적 승인에 더해 plan-template 일치 검사를 추가함 |
| 7 | 양호 | engine/status 표시, 상점 필터, 마이페이지 실행 링크가 구현됨 |
| 8 | 양호 | 사용자 상태 격리에 더해 payload/이미지 크기·MIME 서버 검증을 추가함 |
| 9 | 양호(우선 대상 범위) | 우선 대상 revoke는 적용, 앱 전체 전수 GRANT 회수는 별도 결정 전까지 보류 |
| 10 | 양호 | production build 해결, 일반 판매·개인 맞춤 통합 테스트 흐름 모두 확인됨(실제 브라우저 E2E는 보류) |

## P0. anon 쓰기 권한을 통한 entitlement 우회 — 해결 완료

상태: 해결 완료 (2026-07-15)

`templates`/`shop_templates`/`template_plans`/`artists`/`template_artists`에
쓰는 admin·사용자 라우트 12개가 anon-key 클라이언트를 쓰고 있어 anon 쓰기
권한을 곧바로 회수할 수 없었다. 전부 `supabaseAdminServer`로 전환한 뒤
`20260715080000_revoke_anon_write_catalog_tables.sql`로 이 5개 테이블의
INSERT/UPDATE/DELETE/TRUNCATE(SELECT는 공개 카탈로그 조회 용도로 유지)와
`template_studio_preview_assets`의 전체 anon/authenticated 권한을 회수했다.

전환한 라우트 12개:

- `src/app/api/admin/templates/route.ts`, `[id]/route.ts`
- `src/app/api/admin/shop-templates/route.ts`, `[id]/route.ts`
- `src/app/api/admin/template-plans/route.ts`, `[id]/route.ts`
- `src/app/api/admin/artists/route.ts`, `[id]/route.ts`
- `src/app/api/admin/template-artists/route.ts`
- `src/app/api/admin/royalty-settings/templates/[templateId]/route.ts`
- `src/app/api/admin/royalty-settings/artists/[artistId]/route.ts`
- `src/app/api/user/artist-profile/route.ts`(관리자가 아닌 일반 사용자 본인
  작가 프로필 수정 경로)

검증: `curl`로 anon key INSERT/UPDATE가 5개 테이블 전부 `401
permission denied`로 거부되고 SELECT는 계속 `200`임을 확인했다. 신규 스크립트
`scripts/check-admin-catalog-writes.ts`(`npm run check:admin-catalog-writes`)로
위 12개 라우트 중 파일럿에서 다루지 않은 나머지(레거시 templates CRUD,
artists CRUD, template-artists 연결, 사용자 본인 artist-profile)를 실제
호출해 service-role 전환 후에도 정상 동작함을 확인했다.

### 참고: 이번 범위에서 여전히 보류하는 것

- 앱 전체 API route 전수 분류, 스키마 전체
  `ALTER DEFAULT PRIVILEGES` 정리는 이번 P0 해결 범위에 포함하지 않았다.
  이번에 처리한 5개 테이블은 이 P0 검토에서 실제로 확인된 우회 경로였고,
  프로젝트 전체를 대상으로 한 전수 조사는 아니다. 새 테이블을 추가하거나
  새 API route를 만들 때는 이번에 확인된 원칙(민감/쓰기 가능한 테이블은
  anon 기본 grant를 그대로 두지 말고 service-role 경유 + grant 회수를
  기본값으로 적용)을 계속 따라야 한다.

### 예전 확인 결과 (문제 확인 당시 기록, 참고용)

전체 신규 migration이 적용된 로컬 복제 DB에서 확인한 결과, 다음 테이블은
RLS가 비활성화되어 있으면서 anon에 `SELECT`, `INSERT`, `UPDATE`, `DELETE`가
모두 허용되어 있었다(현재는 위와 같이 해결됨).

### 확인 결과

전체 신규 migration이 적용된 로컬 복제 DB에서 확인한 결과, 다음 테이블은
RLS가 비활성화되어 있으면서 anon에 `SELECT`, `INSERT`, `UPDATE`, `DELETE`가
모두 허용되어 있었다.

- `templates`
- `shop_templates`
- `template_plans`
- `artists`
- `template_artists`

반면 9단계 우선 대상인 다음 테이블과 RPC는 anon/authenticated 권한이 정상적으로
회수되어 있었다.

- `template_access`
- `template_purchase_requests`
- `template_studio_documents`
- `template_studio_document_revisions`
- `template_studio_document_drafts`
- `template_studio_assets`
- `template_studio_user_states`
- `approve_template_purchase_request`
- `has_template_access`
- `publish_template_studio_document`

`template_studio_preview_assets`는 anon `ALL`을 유지하고 RLS에만 의존하고 있어
프로젝트의 RLS 미사용 원칙과도 맞지 않았다(이 테이블도 함께 anon/authenticated
전체 권한을 회수해 해결함).

### 영향

`TemplateService.hasAccess()`는 `template_artists -> artists.user_id`가 로그인
사용자와 일치하면 연결 작가 권한을 허용한다. 그러나 두 테이블이 anon 쓰기에
열려 있으므로 공격자가 작가의 `user_id`를 자기 계정으로 바꾸거나 임의의 작가
연결을 추가해 `template_access` 없이 published 템플릿 이용 권한을 얻을 수 있다.

또한 템플릿 상태, 가격, 상점 노출, 작가 정보의 직접 변조·삭제가 가능하다.

### 관련 위치

- `src/lib/templates.ts`의 `TemplateService.hasAccess()`
- `supabase/migrations/20260328060938_baseline_remote_20260328.sql`의 기본 GRANT
- `supabase/migrations/20260715070000_revoke_anon_access_to_sensitive_tables.sql`
- `supabase/migrations/20260707000000_create_template_studio_preview_assets.sql`

### 후속 조치 처리 상태

위 7단계 계획 중 이번 P0 해결에서 실제로 처리한 범위는 1(해당 5개 테이블),
5(해당 5개 테이블 + preview_assets)이다. 2·3·4·6·7(전체 API 등급 분류,
Secret client 전면 전환, DTO/view 계층, `ALTER DEFAULT PRIVILEGES` 전체 정리,
Publishable key 거부 테스트 자동화)은 여전히 보류하며, 앱 전체 권한 경계
개편을 다시 시작할 때 함께 처리한다.

## P1. 구매 plan과 template의 연결 검증 누락 — 해결 완료

상태: 해결 완료 (2026-07-15)

### 확인 결과

`POST /api/template-purchase-requests`는 `template_id`와 `plan_id`가 각각 존재하는지만
검사한다. 선택한 plan이 해당 template의 `shop_templates` 행에 속하는지는 확인하지
않는다.

`approve_template_purchase_request()` RPC도 전달받은 plan을 대상 template과
대조하지 않고 `template_access.template_plan_id`에 기록한다. 판매 기록 트리거는
요청의 plan 가격과 template을 조합해 매출과 로열티 원본을 만든다.

### 영향

다른 상품의 저가 plan과 원하는 고가 template을 조합한 구매 요청이 승인되면,
원하는 template 권한을 얻으면서 다른 plan 가격으로 매출·로열티가 기록될 수 있다.

### 관련 위치

- `src/app/api/template-purchase-requests/route.ts`
- `src/app/api/admin/purchase-requests/[id]/approve/route.ts`
- `supabase/migrations/20260715050000_reconcile_template_access.sql`
- `supabase/migrations/20260328061315_add_artists_and_template_sales.sql`

### 처리 내용

- `POST /api/template-purchase-requests`가 `plan -> shop_template ->
  template_id` 일치, `templates.is_public/status`, `shop_templates.is_shop_visible`을
  모두 검사하도록 고쳤다.
- 승인 API(`/api/admin/purchase-requests/{id}/approve`)는 더 이상
  클라이언트의 `planId`를 받지 않고 요청 행 자체의 plan만 쓴다.
- `approve_template_purchase_request` RPC(`20260715090000` migration)도
  요청에 기록된 plan과 다른 `p_plan_id`가 들어오면 예외를 던지도록 방어했다
  (API를 우회해 RPC를 직접 호출하는 경로에 대한 defense-in-depth).
- 신규 스크립트 `scripts/check-purchase-plan-validation.ts`
  (`npm run check:purchase-plan-validation`)로 다른 상품 plan 제출, draft
  템플릿 구매, 노출 안 된 상품 구매, RPC 레벨 plan 불일치가 모두 거부되고
  정상 조합은 성공하는지 확인했다.

## 해결 완료. production build

상태: 별도 작업에서 해결 완료 (2026-07-15)

최초 검토 당시에는 로컬 Supabase service-role 환경을 주입한 상태에서도
`npm run build`가 `/admin` prerender에서 다음 오류로 실패했다.

```text
TypeError: a[d] is not a function
Error occurred prerendering page "/admin"
```

이 문제는 이후 별도 작업으로 해결됐다. 따라서 현재 후속 보완 대상이나 원격 반영
차단 조건으로 취급하지 않는다.

검토 당시 환경변수를 주입하지 않은 기본 `npm run build`는 API route 수집 단계에서
당시 legacy service-role 환경변수 누락으로 더 일찍 실패했다. 서버 client를 module
import 시 즉시 생성하는 구조도 당시 함께 확인된 항목이다. 실제 해결 변경의 범위와
검증 결과는 별도 build 수정 이력을 따른다.

## P2. Studio runtime 이미지와 payload 제한 부족 — 부분 해결

상태: 크기/타입 제한 해결, 저장 구조 변경은 별도 기능으로 이연 (2026-07-15)

### 확인 결과

사용자 runtime UI는 이미지 파일을 `FileReader.readAsDataURL()`로 변환하고 그 값을
일반 input 문자열로 저장한다. runtime PUT API는 이 값을 `runtime_values` JSONB에
그대로 저장한다.

현재 검증은 timetable entry 구조와 일부 상태 제약을 확인하지만 다음을 충분히
검사하지 않는다.

- global/day/entry input 값의 실제 primitive 타입
- document input type과 runtime 값의 일치
- input `maxLength`
- 이미지 MIME과 byte size
- runtime payload 전체 크기
- 중첩 JSON 크기와 깊이

### 영향

권한이 있는 사용자가 큰 base64 이미지나 과도한 runtime payload를 반복 저장하면
DB 용량과 API 메모리 사용량이 증가할 수 있다.

### 처리 내용

- `src/utils/template-studio/runtime-payload-limits.ts`를 추가해 PUT
  `/api/user/templates/{id}/runtime`에서 다음을 검사한다: 값이 문자열인지,
  이미지 data URI의 MIME이 허용 목록(png/jpeg/webp/gif)에 속하는지와 디코딩
  크기가 4MB를 넘지 않는지, 텍스트 input은 문서에 정의된 `maxLength`(없으면
  기본 2000자), timetable entry의 `mainTitle`/`subTitle`과 휴방 메모 길이,
  직렬화한 전체 payload가 5MB를 넘지 않는지.
- 기존 `validateStudioRuntimeValuesForDocument`(문서 contract 검사)와 함께
  적용해 하나라도 위반하면 `400`으로 거부한다.
- 신규 스크립트 `scripts/check-runtime-payload-limits.ts`
  (`npm run check:runtime-payload-limits`)로 초과 payload, 과도하게 긴
  제목, (문서에 이미지 input이 있는 경우) 잘못된 MIME과 초과 크기 이미지가
  모두 거부되고 정상 범위 편집은 성공하는지 확인했다.

### 이연: 사용자 runtime 이미지의 브라우저 로컬 저장 전환

최초 검토에서는 별도 user asset 테이블과 private R2 저장을 제안했지만, runtime
이미지는 편집 중인 브라우저에서만 필요하다는 요구사항에 따라 서버 영구 저장을
추가하지 않기로 결정했다. 후속 12단계에서는 crop 처리 PNG Blob만 IndexedDB에
저장하고 image binary와 브라우저 로컬 참조를 server runtime payload에서 모두
제외한다. 현재 구현은 전환 전이므로 크기·MIME 제한을 통과한 base64 Data URL을
`runtime_values` JSONB에 저장한다 — 무제한 저장은 막았지만 DB 행 크기 자체는
여전히 이미지 데이터를 포함한다.

## P2. E2E 완료 범위와 문서 표현 불일치 — 부분 해결

상태: 통합 테스트 범위 확장 완료, 실제 브라우저 E2E는 별도 작업으로 이연
(2026-07-15)

### 처리 내용

- 신규 스크립트 `scripts/check-personalized-template-flow.ts`
  (`npm run check:personalized-template-flow`)로 개인 맞춤(비공개) Studio
  템플릿의 생성 → publish → 관리자가 특정 사용자에게만 `template_access`
  수동 부여 → 지정 사용자의 실행/저장/재조회/접근 목록 포함 → 타 사용자의
  실행 거부(403) 및 접근 목록 미노출을 전부 검증했다.
- `scripts/check-purchase-plan-validation.ts`로 plan-template 불일치 거부를
  다뤘다(P1 참고).
- Publishable/Secret key 전환 자체가 이번 범위에서 보류되어 있어 "Publishable
  key 직접 DB 쓰기 거부" 항목은 다루지 않았다. 대신 현재 키 체계(anon/
  service-role) 기준으로 anon 직접 쓰기 거부를 P0에서 검증했다.

### 이연: 실제 브라우저 E2E

`check:pilot-e2e`, `check:personalized-template-flow` 모두 여전히 Next API
route handler를 직접 호출하는 통합 테스트이며, 실제 브라우저(로그인 폼,
`TemplateProtectedRoute` 리다이렉트, 새로고침 후 값 복원, 브라우저 network
탭에서 Supabase 직접 호출이 없는지)로는 검증하지 않았다. Playwright 등을
이용한 브라우저 E2E 구축은 별도 작업으로 남긴다.

## P2. Studio template 삭제 후 R2 orphan — 해결 완료

상태: 해결 완료 (2026-07-15)

Studio asset sync는 template ID 아래 R2 key로 파일을 업로드하지만 template 삭제는
DB의 `templates` 행만 삭제해, 하위 metadata는 FK cascade로 제거되나 실제 R2
객체는 남는 문제가 있었다.

### 관련 위치

- `src/app/api/admin/template-studio/templates/[id]/assets/sync/route.ts`
- `src/app/api/admin/template-studio/templates/[id]/route.ts`
- `src/utils/template-studio/asset-storage.ts`(신규 — sync route와 delete
  route가 R2 prefix 로직을 공유하도록 추출)

### 처리 내용

- `DELETE /api/admin/template-studio/templates/{id}`가 DB 삭제 전에 해당
  템플릿의 R2 asset prefix(`{base}/{templateId}`) 전체를
  `deleteFilesFromR2Prefix`로 best-effort 삭제한다.
- R2 삭제가 실패해도(자격 증명 누락, 네트워크 오류 등) 로그만 남기고 DB
  삭제는 계속 진행한다 — 정책은 "차단하지 않음, 기존 수동 정리 스크립트
  (`npm run cleanup:template-studio:r2-assets -- --template-id <id>`)가
  안전망" 쪽으로 정했다. R2가 살아있는 정상 상황에서는 이 안전망을 쓸 일
  없이 삭제 시점에 함께 정리된다.
- 신규 스크립트 `scripts/check-template-studio-delete-r2-cleanup.ts`
  (`npm run check:template-studio:delete-r2-cleanup`)로 R2 자격 증명을
  의도적으로 제거한 상태에서 DELETE를 호출해, R2 정리가 실패해도 DB 삭제는
  `200`으로 성공하고 템플릿 행이 실제로 사라지는지 확인했다.

## 검토 시 재실행한 로컬 검증

최초 검토(2026-07-15 오전) 당시 다음 검증은 로컬 Supabase 복제 DB를 대상으로
통과했다.

- `npx tsc --noEmit`
- `npm run check:template-entitlement`
- `npm run check:template-studio:persistence`
- `npm run check:template-studio:runtime`
- `npm run check:admin-purchase-requests`
- `npm run check:admin-template-access`
- `npm run check:pilot-e2e`

`npm run build`는 `/admin` prerender 오류로 실패했다(별도 작업에서 next-pwa
교체로 해결, `10-pilot-e2e-rollout.md` "next-pwa 교체" 참고).

### P0~P2 보완 후 재검증 (2026-07-15)

`supabase db reset --local`(seed 없음)로 신규 migration 11개를 포함한 전체
스키마가 빈 DB에서 처음부터 재현됨을 확인한 뒤, 위 스크립트 전체와 이번에
추가한 다음 스크립트를 함께 재실행해 모두 통과를 확인했다.

- `npm run check:admin-catalog-writes`(P0)
- `npm run check:purchase-plan-validation`(P1)
- `npm run check:runtime-payload-limits`(P2)
- `npm run check:template-studio:delete-r2-cleanup`(P2)
- `npm run check:personalized-template-flow`(P2)

`curl`로 anon key INSERT/UPDATE가 `templates`/`shop_templates`/
`template_plans`/`artists`/`template_artists`/`template_studio_preview_assets`
전부 `401`로 거부되고, 공개 카탈로그 SELECT(`templates`, `shop_templates`
등)는 계속 `200`임을 재확인했다. `npx tsc --noEmit`과 변경/신규 파일
ESLint도 다시 통과했다. `npm run build`는 next-pwa 교체 커밋에서 별도로
`exit code 0` 성공을 확인했다(이 문서 수정 시점에는 재실행하지 않음).

R2 외부 객체 쓰기를 포함하는 asset 업로드 검증 스크립트
(`check:template-studio:api` 등)는 로컬에 R2 자격 증명이 없어 이번에도
실행하지 않았다. 원격 Supabase DB에는 schema, data, migration을 포함해
어떤 변경도 적용하지 않았다.

## 원격 반영 전 추가 완료 조건

- [x] anon/anon key로 entitlement 구성 테이블(`templates`/`shop_templates`/
      `template_plans`/`artists`/`template_artists`)을 변조할 수 없다.
      (Publishable/Secret key 전환 자체는 별도 결정 전까지 보류 — 현재
      anon/service-role 키 체계 기준으로 해결)
- [x] 구매 요청과 승인에서 plan-template 관계가 항상 일치한다.
- [x] 사용자 runtime payload와 현재 Data URL image 저장에 서버 크기/타입 제한이
      적용된다. (브라우저 IndexedDB 전환은 별도 기능 작업으로 이연)
- [x] Studio template 삭제 후 R2 객체가 best-effort로 정리된다(R2 장애 시
      기존 수동 정리 스크립트가 안전망).
- [x] 일반 판매·개인 맞춤 흐름이 통합 테스트(route handler 직접 호출)로
      검증된다. 실제 브라우저 E2E는 별도 작업으로 이연.
- [x] `npm run build`가 성공한다.
- [ ] 원격 migration 적용과 legacy key 비활성화는 사용자가 최종 확인 후 직접
      수행한다(앱의 새 키 이름 전환은 14단계에서 완료).

남은 후속 항목(별도 기능/작업으로 분리, 원격 반영을 막는 조건은 아님):

- 사용자 runtime image의 브라우저 로컬 저장 전환: 12단계 계획 수정 완료,
  구현 미착수. source file은 보존하지 않고 crop PNG Blob만 IndexedDB에 저장하며,
  image binary와 로컬 참조는 서버 payload에서 제외한다. source와 처리 결과에는
  각각 최대 20 MiB를 적용한다. 상세 내용은
  `12-user-runtime-browser-image-storage.md`를 따른다.
- Playwright 등을 이용한 실제 브라우저 E2E

원격 Publishable/Secret key 전환 전 차단 조건(P0):

- 앱 전체 API route 권한 등급 전수 분류와 민감 테이블·함수의
  `PUBLIC`/`anon`/`authenticated` GRANT 회수. 후속 14단계 재검토에서
  `users`/`tokens`/`files`/판매·정산 테이블과 정산 RPC의 실제 anon 유효 권한을
  재현했다. 상세 근거와 전환 순서는 `14-supabase-api-key-cutover.md`를 따른다.
