-- 07단계 사용자 템플릿 전체 브라우저 E2E용 local-only fixture.
-- 기존 고정 Legacy route row는 보존하고, 구매자/admin과 Studio 두 템플릿만 만든다.
-- 비밀번호: temis-local-03 (bcrypt hash만 DB에 저장)

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.users
    WHERE id IN (9390700, 9390701)
      AND (
        name NOT LIKE '[07 browser-e2e]%'
        OR email NOT IN (
          'user-template-ui-07-admin@temis.local',
          'user-template-ui-07@temis.local'
        )
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.users
    WHERE email IN (
      'user-template-ui-07-admin@temis.local',
      'user-template-ui-07@temis.local'
    )
      AND id NOT IN (9390700, 9390701)
  ) THEN
    RAISE EXCEPTION '07 fixture reserved user id or email is already used by non-fixture data';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.templates
    WHERE id IN (
      'f0700002-0202-0202-0202-020202020202',
      'f0700003-0303-0303-0303-030303030303'
    )
      AND name NOT LIKE '[07 browser-e2e]%'
  ) THEN
    RAISE EXCEPTION '07 fixture template id is already used by a non-fixture template';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.shop_templates
    WHERE id IN (
      'f0702002-2002-2002-2002-070707070707',
      'f0702003-2003-2003-2003-070707070707'
    )
      AND title NOT LIKE '[07 browser-e2e]%'
  ) OR EXISTS (
    SELECT 1
    FROM public.template_plans
    WHERE id IN (
      'f0703002-3002-3002-3002-070707070707',
      'f0703003-3003-3003-3003-070707070707'
    )
      AND shop_template_id NOT IN (
        'f0702002-2002-2002-2002-070707070707',
        'f0702003-2003-2003-2003-070707070707'
      )
  ) THEN
    RAISE EXCEPTION '07 fixture product id is already used by non-fixture data';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.templates
    WHERE id = 'db8f0082-b6c4-4b8c-9dfc-ec336bea0566'
      AND template_engine = 'legacy'
      AND is_public = true
      AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'The fixed Legacy route template row is not available locally';
  END IF;
END
$$;

INSERT INTO public.users (id, created_at, updated_at, name, email, password, role)
VALUES
  (9390700, now(), now(), '[07 browser-e2e] admin', 'user-template-ui-07-admin@temis.local', '$2b$10$dsRbdn7WLPHmwNFV/tUqUuBwCZQ9bP2WOcdQXy64CtB2nJZ/QXmPq', 'admin'),
  (9390701, now(), now(), '[07 browser-e2e] buyer', 'user-template-ui-07@temis.local', '$2b$10$dsRbdn7WLPHmwNFV/tUqUuBwCZQ9bP2WOcdQXy64CtB2nJZ/QXmPq', 'user')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  updated_at = now();

INSERT INTO public.templates (
  id, name, description, thumbnail_url, is_public, template_engine, template_kind,
  status, created_by
)
VALUES
  (
    'f0700002-0202-0202-0202-020202020202',
    '[07 browser-e2e] Studio timetable',
    'Local browser E2E timetable fixture',
    '', true, 'studio', 'timetable', 'published', 9390700
  ),
  (
    'f0700003-0303-0303-0303-030303030303',
    '[07 browser-e2e] Studio thumbnail',
    'Local browser E2E thumbnail fixture',
    '', true, 'studio', 'thumbnail', 'published', 9390700
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  thumbnail_url = EXCLUDED.thumbnail_url,
  is_public = EXCLUDED.is_public,
  template_engine = EXCLUDED.template_engine,
  template_kind = EXCLUDED.template_kind,
  status = EXCLUDED.status,
  created_by = EXCLUDED.created_by;

INSERT INTO public.shop_templates (id, template_id, title, is_shop_visible)
VALUES
  (
    'f0702002-2002-2002-2002-070707070707',
    'f0700002-0202-0202-0202-020202020202',
    '[07 browser-e2e] Studio timetable product',
    true
  ),
  (
    'f0702003-2003-2003-2003-070707070707',
    'f0700003-0303-0303-0303-030303030303',
    '[07 browser-e2e] Studio thumbnail product',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  template_id = EXCLUDED.template_id,
  title = EXCLUDED.title,
  is_shop_visible = EXCLUDED.is_shop_visible;

INSERT INTO public.template_plans (id, shop_template_id, plan, price)
VALUES
  (
    'f0703002-3002-3002-3002-070707070707',
    'f0702002-2002-2002-2002-070707070707',
    'pro',
    7000
  ),
  (
    'f0703003-3003-3003-3003-070707070707',
    'f0702003-2003-2003-2003-070707070707',
    'pro',
    7000
  )
ON CONFLICT (id) DO UPDATE SET
  shop_template_id = EXCLUDED.shop_template_id,
  plan = EXCLUDED.plan,
  price = EXCLUDED.price;

COMMIT;

SELECT '07 fixture users', COUNT(*)
FROM public.users
WHERE id IN (9390700, 9390701);

SELECT '07 fixture templates', COUNT(*)
FROM public.templates
WHERE name LIKE '[07 browser-e2e]%';
