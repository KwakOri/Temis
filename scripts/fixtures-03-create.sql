-- 03단계 마이페이지 브라우저 smoke용 local-only fixture.
-- 비밀번호: temis-local-03 (bcrypt hash만 DB에 저장)
-- 실행 전 fixtures-03-cleanup.sql을 실행한다.

BEGIN;

-- 예약 ID가 이미 비-fixture 데이터에 사용된 경우 기존 데이터를 덮어쓰지 않는다.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.users
    WHERE id IN (9390300, 9390301, 9390302)
      AND (
        name NOT LIKE '[03 my-page]%'
        OR email NOT IN (
          'user-template-ui-03-admin@temis.local',
          'user-template-ui-03@temis.local',
          'user-template-ui-03-team@temis.local'
        )
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.users
    WHERE email IN (
      'user-template-ui-03-admin@temis.local',
      'user-template-ui-03@temis.local',
      'user-template-ui-03-team@temis.local'
    )
      AND id NOT IN (9390300, 9390301, 9390302)
  ) THEN
    RAISE EXCEPTION '03 fixture reserved user id or email is already used by non-fixture data';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.templates
    WHERE id IN (
      '06d6401a-1b2a-4e98-a5d2-363984b3bfbb',
      'f0300002-0202-0202-0202-020202020202',
      'f0300003-0303-0303-0303-030303030303'
    )
      AND name NOT LIKE '[03 my-page]%'
  ) THEN
    RAISE EXCEPTION '03 fixture template id is already used by a non-fixture template';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_templates
    WHERE id = 'f0305001-5001-5001-5001-010101010101'
      AND name NOT LIKE '[03 my-page]%'
  ) OR EXISTS (
    SELECT 1
    FROM public.teams
    WHERE id = 'f0304001-4001-4001-4001-010101010101'
      AND name NOT LIKE '[03 my-page]%'
  ) THEN
    RAISE EXCEPTION '03 fixture team id is already used by non-fixture data';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.relations_team_template_and_team
    WHERE id = 'f0306001-6001-6001-6001-010101010101'
      AND (
        team_id <> 'f0304001-4001-4001-4001-010101010101'
        OR team_template_id <> 'f0305001-5001-5001-5001-010101010101'
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE id = 'f0307001-7001-7001-7001-010101010101'
      AND (
        team_id <> 'f0304001-4001-4001-4001-010101010101'
        OR user_id <> 9390302
        OR role <> 'member'
      )
  ) THEN
    RAISE EXCEPTION '03 fixture team relation id is already used by non-fixture data';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.artists
    WHERE id = 'f0301001-1001-1001-1001-010101010101'
      AND (
        name NOT LIKE '[03 my-page]%'
        OR slug <> 'user-template-ui-03-buyer'
        OR user_id <> 9390301
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.artists
    WHERE slug = 'user-template-ui-03-buyer'
      AND id <> 'f0301001-1001-1001-1001-010101010101'
  ) THEN
    RAISE EXCEPTION '03 fixture artist id or slug is already used by non-fixture data';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.shop_templates
    WHERE id = 'f0302001-2001-2001-2001-010101010101'
      AND (
        template_id <> '06d6401a-1b2a-4e98-a5d2-363984b3bfbb'
        OR title NOT LIKE '[03 my-page]%'
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.template_plans
    WHERE id = 'f0303001-3001-3001-3001-010101010101'
      AND shop_template_id <> 'f0302001-2001-2001-2001-010101010101'
  ) THEN
    RAISE EXCEPTION '03 fixture product id is already used by non-fixture data';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.template_access
    WHERE id IN (
      'a0300001-0101-0101-0001-010101010101',
      'a0300002-0202-0202-0002-020202020202',
      'a0300003-0303-0303-0003-030303030303'
    )
      AND (
        user_id <> 9390301
        OR template_id NOT IN (
          '06d6401a-1b2a-4e98-a5d2-363984b3bfbb',
          'f0300002-0202-0202-0202-020202020202',
          'f0300003-0303-0303-0303-030303030303'
        )
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.template_artists
    WHERE id = 'b0300001-0202-0202-0002-020202020202'
      AND (
        template_id <> 'f0300002-0202-0202-0202-020202020202'
        OR artist_id <> 'f0301001-1001-1001-1001-010101010101'
      )
  ) THEN
    RAISE EXCEPTION '03 fixture access id is already used by non-fixture data';
  END IF;
END
$$;

INSERT INTO public.users (id, created_at, updated_at, name, email, password, role)
VALUES
  (9390300, now(), now(), '[03 my-page] admin', 'user-template-ui-03-admin@temis.local', '$2b$10$dsRbdn7WLPHmwNFV/tUqUuBwCZQ9bP2WOcdQXy64CtB2nJZ/QXmPq', 'admin'),
  (9390301, now(), now(), '[03 my-page] buyer artist', 'user-template-ui-03@temis.local', '$2b$10$dsRbdn7WLPHmwNFV/tUqUuBwCZQ9bP2WOcdQXy64CtB2nJZ/QXmPq', 'user'),
  (9390302, now(), now(), '[03 my-page] team member', 'user-template-ui-03-team@temis.local', '$2b$10$dsRbdn7WLPHmwNFV/tUqUuBwCZQ9bP2WOcdQXy64CtB2nJZ/QXmPq', 'user')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  updated_at = now();

INSERT INTO public.team_templates (id, name, descriptions)
VALUES (
  'f0305001-5001-5001-5001-010101010101',
  '[03 my-page] team template',
  '기존 팀 템플릿 카드와 이동 경로 회귀를 확인합니다.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  descriptions = EXCLUDED.descriptions,
  updated_at = now();

INSERT INTO public.teams (id, name, description, created_by, is_active)
VALUES (
  'f0304001-4001-4001-4001-010101010101',
  '[03 my-page] active team',
  '03단계 팀 템플릿 회귀 검증용 팀',
  9390300,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  created_by = EXCLUDED.created_by,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.relations_team_template_and_team (
  id, team_id, team_template_id
)
VALUES (
  'f0306001-6001-6001-6001-010101010101',
  'f0304001-4001-4001-4001-010101010101',
  'f0305001-5001-5001-5001-010101010101'
)
ON CONFLICT (id) DO UPDATE SET
  team_id = EXCLUDED.team_id,
  team_template_id = EXCLUDED.team_template_id;

INSERT INTO public.team_members (id, team_id, user_id, role)
VALUES (
  'f0307001-7001-7001-7001-010101010101',
  'f0304001-4001-4001-4001-010101010101',
  9390302,
  'member'
)
ON CONFLICT (id) DO UPDATE SET
  team_id = EXCLUDED.team_id,
  user_id = EXCLUDED.user_id,
  role = EXCLUDED.role,
  updated_at = now();

INSERT INTO public.artists (id, name, slug, user_id, is_active)
VALUES (
  'f0301001-1001-1001-1001-010101010101',
  '[03 my-page] buyer artist',
  'user-template-ui-03-buyer',
  9390301,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  user_id = EXCLUDED.user_id,
  is_active = EXCLUDED.is_active;

INSERT INTO public.templates (
  id, name, description, thumbnail_url, is_public, template_engine, template_kind,
  status, created_by
)
VALUES
  (
    '06d6401a-1b2a-4e98-a5d2-363984b3bfbb',
    '[03 my-page] Legacy timetable',
    '실제 고정 route가 존재하는 Legacy 시간표',
    '', true, 'legacy', NULL, 'published', 9390300
  ),
  (
    'f0300002-0202-0202-0202-020202020202',
    '[03 my-page] Studio timetable with missing cover',
    '404 대표 이미지 fallback과 구매·작가 중복 제거를 확인합니다.',
    '/03-fixture-missing-cover.png', true, 'studio', 'timetable', 'published', 9390300
  ),
  (
    'f0300003-0303-0303-0303-030303030303',
    '[03 my-page] 長いサムネイル名 Long thumbnail name 모바일 레이아웃 확인',
    '대표 이미지가 없는 맞춤 Studio 썸네일',
    '', false, 'studio', 'thumbnail', 'published', 9390300
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

INSERT INTO public.template_studio_document_revisions (
  template_id, revision_no, document_version, document, runtime_values, source, created_by
)
VALUES
  (
    'f0300002-0202-0202-0202-020202020202', 1, 7,
    '{"schema":"studio_template_document","version":7,"metadata":{"editor":"template-studio","kind":"timetable","name":"[03 my-page] timetable"},"canvas":{"width":960,"height":640,"background":"transparent"},"graph":{"rootNodeIds":[],"nodes":{}},"inputs":{},"styles":{},"assets":{}}'::jsonb,
    '{"global":{},"days":{},"entries":{},"timetable":{"entriesByDay":{},"offlineMemoByDay":{}}}'::jsonb,
    'publish', 9390300
  ),
  (
    'f0300003-0303-0303-0303-030303030303', 1, 7,
    '{"schema":"studio_template_document","version":7,"metadata":{"editor":"template-studio","kind":"thumbnail","name":"[03 my-page] thumbnail"},"canvas":{"width":1200,"height":630,"background":"#ffffff"},"graph":{"rootNodeIds":[],"nodes":{}},"inputs":{},"styles":{},"assets":{},"domains":{"thumbnail":{"version":1,"export":{"defaultFormat":"png","transparentBackground":false}}}}'::jsonb,
    '{"global":{},"days":{},"entries":{},"timetable":{"entriesByDay":{},"offlineMemoByDay":{}}}'::jsonb,
    'publish', 9390300
  )
ON CONFLICT (template_id, revision_no) DO UPDATE SET
  document_version = EXCLUDED.document_version,
  document = EXCLUDED.document,
  runtime_values = EXCLUDED.runtime_values,
  source = EXCLUDED.source,
  created_by = EXCLUDED.created_by;

INSERT INTO public.template_studio_documents (
  template_id, document_version, document, runtime_values, published_revision_no
)
VALUES
  (
    'f0300002-0202-0202-0202-020202020202', 7,
    '{"schema":"studio_template_document","version":7,"metadata":{"editor":"template-studio","kind":"timetable","name":"[03 my-page] timetable"},"canvas":{"width":960,"height":640,"background":"transparent"},"graph":{"rootNodeIds":[],"nodes":{}},"inputs":{},"styles":{},"assets":{}}'::jsonb,
    '{"global":{},"days":{},"entries":{},"timetable":{"entriesByDay":{},"offlineMemoByDay":{}}}'::jsonb,
    1
  ),
  (
    'f0300003-0303-0303-0303-030303030303', 7,
    '{"schema":"studio_template_document","version":7,"metadata":{"editor":"template-studio","kind":"thumbnail","name":"[03 my-page] thumbnail"},"canvas":{"width":1200,"height":630,"background":"#ffffff"},"graph":{"rootNodeIds":[],"nodes":{}},"inputs":{},"styles":{},"assets":{},"domains":{"thumbnail":{"version":1,"export":{"defaultFormat":"png","transparentBackground":false}}}}'::jsonb,
    '{"global":{},"days":{},"entries":{},"timetable":{"entriesByDay":{},"offlineMemoByDay":{}}}'::jsonb,
    1
  )
ON CONFLICT (template_id) DO UPDATE SET
  document_version = EXCLUDED.document_version,
  document = EXCLUDED.document,
  runtime_values = EXCLUDED.runtime_values,
  published_revision_no = EXCLUDED.published_revision_no;

INSERT INTO public.shop_templates (id, template_id, title, is_shop_visible)
VALUES (
  'f0302001-2001-2001-2001-010101010101',
  '06d6401a-1b2a-4e98-a5d2-363984b3bfbb',
  '[03 my-page] Legacy product',
  true
)
ON CONFLICT (id) DO UPDATE SET
  template_id = EXCLUDED.template_id,
  title = EXCLUDED.title,
  is_shop_visible = EXCLUDED.is_shop_visible;

INSERT INTO public.template_plans (id, shop_template_id, plan, price)
VALUES (
  'f0303001-3001-3001-3001-010101010101',
  'f0302001-2001-2001-2001-010101010101',
  'lite',
  1000
)
ON CONFLICT (id) DO UPDATE SET
  shop_template_id = EXCLUDED.shop_template_id,
  plan = EXCLUDED.plan,
  price = EXCLUDED.price;

INSERT INTO public.template_access (
  id, template_id, user_id, access_level, granted_by, template_plan_id
)
VALUES
  (
    'a0300001-0101-0101-0001-010101010101',
    '06d6401a-1b2a-4e98-a5d2-363984b3bfbb',
    9390301, 'read', 9390300,
    'f0303001-3001-3001-3001-010101010101'
  ),
  (
    'a0300002-0202-0202-0002-020202020202',
    'f0300002-0202-0202-0202-020202020202',
    9390301, 'read', 9390300, NULL
  ),
  (
    'a0300003-0303-0303-0003-030303030303',
    'f0300003-0303-0303-0303-030303030303',
    9390301, 'read', 9390300, NULL
  )
ON CONFLICT (template_id, user_id) DO UPDATE SET
  access_level = EXCLUDED.access_level,
  granted_by = EXCLUDED.granted_by,
  template_plan_id = EXCLUDED.template_plan_id;

INSERT INTO public.template_artists (id, template_id, artist_id, role, is_primary)
VALUES (
  'b0300001-0202-0202-0002-020202020202',
  'f0300002-0202-0202-0202-020202020202',
  'f0301001-1001-1001-1001-010101010101',
  'creator',
  true
)
ON CONFLICT (template_id, artist_id) DO UPDATE SET
  role = EXCLUDED.role,
  is_primary = EXCLUDED.is_primary;

COMMIT;

SELECT '03 fixture users', COUNT(*)
FROM public.users
WHERE id IN (9390300, 9390301, 9390302);

SELECT '03 fixture templates', COUNT(*)
FROM public.templates
WHERE name LIKE '[03 my-page]%';

SELECT '03 fixture team relations',
  (SELECT COUNT(*) FROM public.team_members WHERE user_id = 9390302),
  (SELECT COUNT(*) FROM public.relations_team_template_and_team WHERE team_id = 'f0304001-4001-4001-4001-010101010101');

SELECT '03 fixture buyer visible rows',
  (SELECT COUNT(*) FROM public.template_access WHERE user_id = 9390301),
  (SELECT COUNT(*) FROM public.template_artists WHERE artist_id = 'f0301001-1001-1001-1001-010101010101');
