-- 01단계 canonical fixture 생성 SQL.
-- local-only 예약 사용자/UUID만 사용한다. 반복 실행 전 cleanup SQL을 실행한다.
-- 전체 API·runtime·승인 검증은 check:user-template-ui:baseline가 생성 후 정리까지 수행한다.

BEGIN;

INSERT INTO public.users (id, created_at, updated_at, name, email, password, role)
VALUES
  (9190101, now(), now(), '[01 baseline] admin', 'user-template-ui-baseline-admin@temis.local', 'fixture-only', 'admin'),
  (9190102, now(), now(), '[01 baseline] buyer', 'user-template-ui-baseline-buyer@temis.local', 'fixture-only', 'user'),
  (9190103, now(), now(), '[01 baseline] artist', 'user-template-ui-baseline-artist@temis.local', 'fixture-only', 'user'),
  (9190104, now(), now(), '[01 baseline] no-access', 'user-template-ui-baseline-no-access@temis.local', 'fixture-only', 'user')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  updated_at = now();

INSERT INTO public.artists (id, name, slug, user_id, is_active)
VALUES
  ('f0101001-1001-1001-1001-010101010101', '[01 baseline] buyer artist', 'user-template-ui-baseline-buyer', 9190102, true),
  ('f0101002-1002-1002-1002-020202020202', '[01 baseline] linked artist', 'user-template-ui-baseline-artist', 9190103, true)
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
  ('f0100001-0101-0101-0101-010101010101', '[01 baseline] Legacy timetable', 'Legacy fixture', '', true, 'legacy', NULL, 'published', 9190103),
  ('f0100002-0102-0102-0202-020202020202', '[01 baseline] Studio timetable', 'Studio timetable fixture', '', true, 'studio', 'timetable', 'published', 9190103),
  ('f0100003-0103-0103-0303-030303030303', '[01 baseline] Studio thumbnail', 'Studio thumbnail fixture', '', true, 'studio', 'thumbnail', 'published', 9190103),
  ('f0100004-0104-0104-0404-040404040404', '[01 baseline] Studio thumbnail draft', 'Draft fixture', '', true, 'studio', 'thumbnail', 'draft', 9190103),
  ('f0100005-0105-0105-0505-050505050505', '[01 baseline] Studio timetable archived', 'Archived fixture', '', true, 'studio', 'timetable', 'archived', 9190103),
  ('f0100006-0106-0106-0606-060606060606', '[01 baseline] Artist linked timetable', 'Artist fixture', '', true, 'studio', 'timetable', 'published', 9190103)
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
    'f0100002-0102-0102-0202-020202020202', 1, 7,
    '{"schema":"studio_template_document","version":7,"metadata":{"editor":"template-studio","kind":"timetable","name":"[01 baseline] timetable"},"canvas":{"width":960,"height":640,"background":"transparent"},"graph":{"rootNodeIds":[],"nodes":{}},"inputs":{},"styles":{},"assets":{}}'::jsonb,
    '{"global":{},"days":{},"entries":{},"timetable":{"entriesByDay":{},"offlineMemoByDay":{}}}'::jsonb,
    'publish', 9190101
  ),
  (
    'f0100003-0103-0103-0303-030303030303', 1, 7,
    '{"schema":"studio_template_document","version":7,"metadata":{"editor":"template-studio","kind":"thumbnail","name":"[01 baseline] thumbnail"},"canvas":{"width":1200,"height":630,"background":"#ffffff"},"graph":{"rootNodeIds":[],"nodes":{}},"inputs":{},"styles":{},"assets":{},"domains":{"thumbnail":{"version":1,"export":{"defaultFormat":"png","transparentBackground":false}}}}'::jsonb,
    '{"global":{},"days":{},"entries":{},"timetable":{"entriesByDay":{},"offlineMemoByDay":{}}}'::jsonb,
    'publish', 9190101
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
    'f0100002-0102-0102-0202-020202020202', 7,
    '{"schema":"studio_template_document","version":7,"metadata":{"editor":"template-studio","kind":"timetable","name":"[01 baseline] timetable"},"canvas":{"width":960,"height":640,"background":"transparent"},"graph":{"rootNodeIds":[],"nodes":{}},"inputs":{},"styles":{},"assets":{}}'::jsonb,
    '{"global":{},"days":{},"entries":{},"timetable":{"entriesByDay":{},"offlineMemoByDay":{}}}'::jsonb,
    1
  ),
  (
    'f0100003-0103-0103-0303-030303030303', 7,
    '{"schema":"studio_template_document","version":7,"metadata":{"editor":"template-studio","kind":"thumbnail","name":"[01 baseline] thumbnail"},"canvas":{"width":1200,"height":630,"background":"#ffffff"},"graph":{"rootNodeIds":[],"nodes":{}},"inputs":{},"styles":{},"assets":{},"domains":{"thumbnail":{"version":1,"export":{"defaultFormat":"png","transparentBackground":false}}}}'::jsonb,
    '{"global":{},"days":{},"entries":{},"timetable":{"entriesByDay":{},"offlineMemoByDay":{}}}'::jsonb,
    1
  )
ON CONFLICT (template_id) DO UPDATE SET
  document_version = EXCLUDED.document_version,
  document = EXCLUDED.document,
  runtime_values = EXCLUDED.runtime_values,
  published_revision_no = EXCLUDED.published_revision_no;

INSERT INTO public.template_studio_document_drafts (
  template_id, user_id, document_version, document, runtime_values, base_revision_no, is_autosave
)
VALUES (
  'f0100002-0102-0102-0202-020202020202', 9190101, 7,
  '{"schema":"studio_template_document","version":7,"metadata":{"editor":"template-studio","kind":"timetable","name":"[01 baseline] timetable draft"},"canvas":{"width":960,"height":640,"background":"transparent"},"graph":{"rootNodeIds":[],"nodes":{}},"inputs":{},"styles":{},"assets":{}}'::jsonb,
  '{"global":{},"days":{},"entries":{},"timetable":{"entriesByDay":{},"offlineMemoByDay":{}}}'::jsonb,
  1, true
)
ON CONFLICT (template_id, user_id) DO UPDATE SET
  document_version = EXCLUDED.document_version,
  document = EXCLUDED.document,
  runtime_values = EXCLUDED.runtime_values,
  base_revision_no = EXCLUDED.base_revision_no,
  is_autosave = EXCLUDED.is_autosave;

INSERT INTO public.template_studio_assets (
  template_id, asset_id, storage_path, mime_type, width, height, byte_size, created_by
)
VALUES (
  'f0100003-0103-0103-0303-030303030303',
  'fixture-cover',
  'user-template-ui-baseline/fixture-cover.png',
  'image/png', 1, 1, 0, 9190101
)
ON CONFLICT (template_id, asset_id) DO UPDATE SET
  storage_path = EXCLUDED.storage_path,
  mime_type = EXCLUDED.mime_type,
  width = EXCLUDED.width,
  height = EXCLUDED.height,
  byte_size = EXCLUDED.byte_size,
  created_by = EXCLUDED.created_by;

INSERT INTO public.template_access (id, template_id, user_id, access_level, granted_by)
VALUES
  ('a0100001-0101-0101-0001-010101010101', 'f0100001-0101-0101-0101-010101010101', 9190102, 'read', 9190101),
  ('a0100002-0102-0102-0002-020202020202', 'f0100002-0102-0102-0202-020202020202', 9190102, 'read', 9190101),
  ('a0100003-0103-0103-0003-030303030303', 'f0100003-0103-0103-0303-030303030303', 9190102, 'read', 9190101),
  ('a0100004-0104-0104-0004-040404040404', 'f0100004-0104-0104-0404-040404040404', 9190102, 'read', 9190101),
  ('a0100005-0105-0105-0005-050505050505', 'f0100005-0105-0105-0505-050505050505', 9190102, 'read', 9190101)
ON CONFLICT (template_id, user_id) DO UPDATE SET
  access_level = EXCLUDED.access_level,
  granted_by = EXCLUDED.granted_by;

INSERT INTO public.template_artists (id, template_id, artist_id, role, is_primary)
VALUES
  ('b0100001-0101-0101-0001-010101010101', 'f0100002-0102-0102-0202-020202020202', 'f0101001-1001-1001-1001-010101010101', 'creator', true),
  ('b0100002-0102-0102-0002-020202020202', 'f0100006-0106-0106-0606-060606060606', 'f0101002-1002-1002-1002-020202020202', 'creator', true)
ON CONFLICT (template_id, artist_id) DO UPDATE SET
  role = EXCLUDED.role,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.shop_templates (id, template_id, title, is_shop_visible)
VALUES
  ('f0102001-2001-2001-2001-010101010101', 'f0100001-0101-0101-0101-010101010101', '[01 baseline] Legacy product', true),
  ('f0102002-2002-2002-2002-020202020202', 'f0100006-0106-0106-0606-060606060606', '[01 baseline] Artist product', true)
ON CONFLICT (id) DO UPDATE SET
  template_id = EXCLUDED.template_id,
  title = EXCLUDED.title,
  is_shop_visible = EXCLUDED.is_shop_visible;

INSERT INTO public.template_plans (id, shop_template_id, plan, price)
VALUES
  ('f0103001-3001-3001-3001-010101010101', 'f0102001-2001-2001-2001-010101010101', 'lite', 1000),
  ('f0103002-3002-3002-3002-020202020202', 'f0102002-2002-2002-2002-020202020202', 'pro', 5000)
ON CONFLICT (id) DO UPDATE SET
  shop_template_id = EXCLUDED.shop_template_id,
  plan = EXCLUDED.plan,
  price = EXCLUDED.price;

COMMIT;

SELECT '01 fixture users', COUNT(*)
FROM public.users
WHERE id IN (9190101, 9190102, 9190103, 9190104);
SELECT '01 fixture templates', COUNT(*)
FROM public.templates
WHERE id IN (
  'f0100001-0101-0101-0101-010101010101',
  'f0100002-0102-0102-0202-020202020202',
  'f0100003-0103-0103-0303-030303030303',
  'f0100004-0104-0104-0404-040404040404',
  'f0100005-0105-0105-0505-050505050505',
  'f0100006-0106-0106-0606-060606060606'
);
SELECT '01 fixture buyer access rows', COUNT(*)
FROM public.template_access
WHERE user_id = 9190102;
