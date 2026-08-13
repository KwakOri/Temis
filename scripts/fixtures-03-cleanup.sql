-- 03단계 마이페이지 browser smoke fixture 정리.
-- 예약 사용자와 '[03 my-page]' prefix row만 제거한다.

BEGIN;

DELETE FROM public.relations_team_template_and_team
WHERE id = 'f0306001-6001-6001-6001-010101010101'
  AND team_id = 'f0304001-4001-4001-4001-010101010101'
  AND team_template_id = 'f0305001-5001-5001-5001-010101010101';

DELETE FROM public.team_members
WHERE id = 'f0307001-7001-7001-7001-010101010101'
  AND team_id = 'f0304001-4001-4001-4001-010101010101'
  AND user_id = 9390302
  AND role = 'member';

DELETE FROM public.teams
WHERE id = 'f0304001-4001-4001-4001-010101010101'
  AND name LIKE '[03 my-page]%';

DELETE FROM public.team_templates
WHERE id = 'f0305001-5001-5001-5001-010101010101'
  AND name LIKE '[03 my-page]%';

DELETE FROM public.template_sales
WHERE template_id IN (
  SELECT id FROM public.templates WHERE name LIKE '[03 my-page]%'
)
OR purchase_request_id IN (
  SELECT id
  FROM public.template_purchase_requests
  WHERE template_id IN (
    SELECT id FROM public.templates WHERE name LIKE '[03 my-page]%'
  )
);

DELETE FROM public.template_purchase_requests
WHERE template_id IN (
  SELECT id FROM public.templates WHERE name LIKE '[03 my-page]%'
);

DELETE FROM public.template_access
WHERE id IN (
  'a0300001-0101-0101-0001-010101010101',
  'a0300002-0202-0202-0002-020202020202',
  'a0300003-0303-0303-0003-030303030303'
)
OR template_id IN (
  SELECT id FROM public.templates WHERE name LIKE '[03 my-page]%'
);

DELETE FROM public.template_artists
WHERE artist_id = 'f0301001-1001-1001-1001-010101010101'
   OR template_id IN (
     SELECT id FROM public.templates WHERE name LIKE '[03 my-page]%'
   );

DELETE FROM public.template_studio_user_states
WHERE template_id IN (
  SELECT id FROM public.templates WHERE name LIKE '[03 my-page]%'
);

DELETE FROM public.template_studio_document_drafts
WHERE template_id IN (
  SELECT id FROM public.templates WHERE name LIKE '[03 my-page]%'
);

DELETE FROM public.template_studio_assets
WHERE template_id IN (
  SELECT id FROM public.templates WHERE name LIKE '[03 my-page]%'
);

DELETE FROM public.template_studio_document_revisions
WHERE template_id IN (
  SELECT id FROM public.templates WHERE name LIKE '[03 my-page]%'
);

DELETE FROM public.template_studio_documents
WHERE template_id IN (
  SELECT id FROM public.templates WHERE name LIKE '[03 my-page]%'
);

DELETE FROM public.template_plans
WHERE shop_template_id IN (
  SELECT id
  FROM public.shop_templates
  WHERE title LIKE '[03 my-page]%'
     OR template_id IN (
       SELECT id FROM public.templates WHERE name LIKE '[03 my-page]%'
     )
);

DELETE FROM public.shop_templates
WHERE title LIKE '[03 my-page]%'
   OR template_id IN (
     SELECT id FROM public.templates WHERE name LIKE '[03 my-page]%'
   );

DELETE FROM public.templates
WHERE name LIKE '[03 my-page]%';

DELETE FROM public.artists
WHERE id = 'f0301001-1001-1001-1001-010101010101'
  AND name LIKE '[03 my-page]%'
  AND slug = 'user-template-ui-03-buyer'
  AND user_id = 9390301;

DELETE FROM public.users
WHERE id IN (9390300, 9390301, 9390302)
  AND name LIKE '[03 my-page]%'
  AND email IN (
    'user-template-ui-03-admin@temis.local',
    'user-template-ui-03@temis.local',
    'user-template-ui-03-team@temis.local'
  );

COMMIT;

SELECT 'remaining_03_users', COUNT(*)
FROM public.users
WHERE id IN (9390300, 9390301, 9390302);

SELECT 'remaining_03_templates', COUNT(*)
FROM public.templates
WHERE name LIKE '[03 my-page]%';

SELECT 'remaining_03_team_rows',
  (SELECT COUNT(*) FROM public.teams WHERE id = 'f0304001-4001-4001-4001-010101010101'),
  (SELECT COUNT(*) FROM public.team_templates WHERE id = 'f0305001-5001-5001-5001-010101010101'),
  (SELECT COUNT(*) FROM public.team_members WHERE id = 'f0307001-7001-7001-7001-010101010101'),
  (SELECT COUNT(*) FROM public.relations_team_template_and_team WHERE id = 'f0306001-6001-6001-6001-010101010101');
