-- 11단계 검토(P0): templates/shop_templates/template_plans/artists/
-- template_artists가 anon/authenticated에 INSERT/UPDATE/DELETE까지 열려
-- 있어, template_artists.artist_id -> artists.user_id를 변조하면
-- template_access 없이 published 템플릿 이용 권한을 얻을 수 있었다.
--
-- 이 5개 테이블은 상점 공개 카탈로그로 계속 anon SELECT를 허용하지만
-- (ShopService.getPublicTemplates 등 anon-key 브라우저 조회가 의도된
-- 공개 읽기 경로), 쓰기는 전부 서버 API route에서만 발생해야 한다.
--
-- 사전 조건: 이 다섯 테이블에 쓰는 모든 API route(관리자 templates/
-- shop-templates/template-plans/artists/template-artists/royalty-settings,
-- 그리고 사용자 본인 artist-profile PATCH)가 이미 anon-key 클라이언트에서
-- supabaseAdminServer로 전환되어 있다(같은 커밋에서 함께 처리).

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.templates
  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.shop_templates
  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.template_plans
  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.artists
  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.template_artists
  FROM anon, authenticated;

-- template_studio_preview_assets는 공개 카탈로그가 아니라 관리자 Studio
-- 에디터의 내부 프리뷰 자산 레지스트리다(24시간 만료, admin-only RLS
-- 정책 하나뿐). anon/authenticated가 읽거나 쓸 합당한 이유가 없으므로
-- 전체 권한을 회수한다.
REVOKE ALL ON TABLE public.template_studio_preview_assets
  FROM anon, authenticated;
