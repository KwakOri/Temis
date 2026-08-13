# 14. Supabase Publishable/Secret 키 전환과 브라우저 경계

상태: 애플리케이션·로컬 개발·CI 전환 완료, 원격 전환은 아래 P0 DB 권한 회수
후 진행 (2026-07-17)

## 목표

- legacy `anon` key 대신 `SUPABASE_PUBLISHABLE_KEY`를 사용한다.
- legacy `service_role` key 대신 `SUPABASE_SECRET_KEY`를 사용한다.
- 두 키 모두 `NEXT_PUBLIC_*` 환경변수로 만들지 않는다.
- 브라우저는 Supabase client를 직접 만들지 않고 Next API route만 호출한다.

Publishable key는 공개되어도 되는 저권한 키지만, 이 프로젝트는 9~11단계에서
정한 "브라우저 직접 DB 접근 제거" 원칙을 더 강하게 적용해 서버에만 둔다.
Secret key는 `service_role` 권한과 RLS 우회를 가지므로 관리자 서버 client
외부에서 사용하지 않는다.

## 환경변수 경계

| 환경변수 | 실행 위치 | 용도 |
| --- | --- | --- |
| `SUPABASE_URL` | 서버 | Supabase API URL |
| `SUPABASE_PUBLISHABLE_KEY` | 서버 | 공개 카탈로그 등 저권한 DB 호출 |
| `SUPABASE_SECRET_KEY` | 서버 관리자 경로 | 권한이 검증된 privileged DB 호출 |
| `NEXT_PUBLIC_SUPABASE_TARGET` | 브라우저 허용 | 로컬/원격 UI 동작 구분값이며 키가 아님 |

금지 항목:

- `NEXT_PUBLIC_SUPABASE_*KEY`
- client component에서 `@supabase/supabase-js`, `@/lib/supabase`,
  `@/lib/supabase-admin-server` import
- 키 값 로그 출력과 저장소 커밋

## 구현 내용

- `src/lib/supabase.ts`는 Publishable key를 쓰는 저권한 서버 client로 변경했다.
- `src/lib/supabase-admin-server.ts`는 Secret key만 쓰며 `sb_secret_` 형식을
  강제한다.
- 상점 목록·상세 브라우저 직접 조회를 각각
  `GET /api/shop/templates`, `GET /api/shop/templates/{templateId}`로 옮겼다.
- `dev:local`은 Supabase CLI의 `PUBLISHABLE_KEY`/`SECRET_KEY`를 주입한다.
- `dev:remote`는 새 키 이름과 `sb_publishable_`/`sb_secret_` 형식을 검증한다.
- CI도 로컬 Supabase의 새 키를 내보낸다.
- `npm run check:supabase-key-boundary`가 legacy 이름과 client import graph를
  검사한다.

## 운영 전환 순서

1. 아래 P0 DB 권한을 회수하고 Publishable role 거부 회귀 테스트를 통과시킨다.
2. Supabase Dashboard에서 Publishable key와 Secret key를 발급한다.
3. 배포 환경에 위의 서버 전용 환경변수 3개를 설정한다.
4. 새 버전을 배포하고 공개 상점 조회, 로그인/회원가입, 관리자 CRUD,
   구매·권한 승인 흐름을 smoke test 한다.
5. 모든 배포 환경과 외부 스크립트가 새 키를 쓰는지 확인한다.
6. 확인이 끝난 뒤에만 Dashboard에서 legacy `anon`/`service_role` key를
   비활성화한다.

새 키와 legacy 키는 전환 기간에 함께 사용할 수 있으므로 6번을 먼저 실행하지
않는다. 원격 키 발급·교체·비활성화는 이 로컬 변경에 포함하지 않았다.

## P0. Publishable role의 민감 DB 직접 접근 — 미해결

키 이름과 브라우저 번들 경계는 정상적으로 바뀌었지만, Publishable key가
매핑되는 `anon` DB 역할의 기존 권한은 자동으로 축소되지 않는다. 전체 로컬
migration 적용 상태에서 다음을 재확인했다.

- `users`, `tokens`, `admin_settings`, `files`, `purchase_requests`,
  `template_sales`: RLS 비활성화 + anon `SELECT/INSERT/UPDATE/DELETE`
- `template_sale_royalties`, `artist_royalty_rules`,
  `royalty_settlement_batches`, `template_sale_royalty_details`: RLS 비활성화 +
  anon `SELECT/INSERT/UPDATE/DELETE`
- `calculate_template_sale_royalty`, `recalculate_royalty_settlement_batch`:
  anon `EXECUTE`

따라서 키를 브라우저에서 숨기는 것만으로는 충분하지 않다. Publishable key는
저권한 공개키로 간주해야 하며, 원격 전환 전 앱 전체 API route를 권한 등급별로
분류하고 민감 테이블·함수의 `PUBLIC`/`anon`/`authenticated` 권한을 회수해야
한다. 현재 Publishable client를 사용하는 서버 route 가운데 합법적인 쓰기
경로는 인증·소유권 검사를 재확인한 뒤 Secret client로 전환해야 한다.

## 검증

- `npm run check:supabase-key-boundary`
- `npx tsc --noEmit --pretty false --incremental false`
- `npm run lint`
- 로컬 Supabase 새 키를 주입한 `npm run build`
- production build의 브라우저 정적 asset에서 Publishable/Secret key가 없는지
  확인
- `GET /api/shop/templates`와 상세 API `200`(로컬 데이터 10건)
- `check:template-hub:api` 30건, `check:admin-catalog-writes`,
  `check:pilot-e2e` 통과
