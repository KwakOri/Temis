-- 07단계 사용자 템플릿 전체 브라우저 E2E용 local-only fixture 정리.
-- 고정 Legacy template row 자체는 삭제하지 않는다.

BEGIN;

DELETE FROM public.template_sales
WHERE purchase_request_id IN (
  SELECT id
  FROM public.template_purchase_requests
  WHERE user_id = 9390701
    AND message LIKE '[07 browser-e2e]%'
)
OR template_id IN (
  'f0700002-0202-0202-0202-020202020202',
  'f0700003-0303-0303-0303-030303030303'
);

DELETE FROM public.template_purchase_requests
WHERE user_id = 9390701
  AND message LIKE '[07 browser-e2e]%';

DELETE FROM public.template_access
WHERE user_id = 9390701
  AND template_id IN (
    'db8f0082-b6c4-4b8c-9dfc-ec336bea0566',
    'f0700002-0202-0202-0202-020202020202',
    'f0700003-0303-0303-0303-030303030303'
  );

DELETE FROM public.template_studio_user_states
WHERE user_id = 9390701
  AND template_id IN (
    'f0700002-0202-0202-0202-020202020202',
    'f0700003-0303-0303-0303-030303030303'
  );

DELETE FROM public.template_studio_document_drafts
WHERE template_id IN (
  'f0700002-0202-0202-0202-020202020202',
  'f0700003-0303-0303-0303-030303030303'
);

DELETE FROM public.template_studio_assets
WHERE template_id IN (
  'f0700002-0202-0202-0202-020202020202',
  'f0700003-0303-0303-0303-030303030303'
);

DELETE FROM public.template_studio_document_revisions
WHERE template_id IN (
  'f0700002-0202-0202-0202-020202020202',
  'f0700003-0303-0303-0303-030303030303'
);

DELETE FROM public.template_studio_documents
WHERE template_id IN (
  'f0700002-0202-0202-0202-020202020202',
  'f0700003-0303-0303-0303-030303030303'
);

DELETE FROM public.template_plans
WHERE id IN (
  'f0703001-3001-3001-3001-070707070707',
  'f0703002-3002-3002-3002-070707070707',
  'f0703003-3003-3003-3003-070707070707'
);

DELETE FROM public.shop_templates
WHERE id IN (
  'f0702001-2001-2001-2001-070707070707',
  'f0702002-2002-2002-2002-070707070707',
  'f0702003-2003-2003-2003-070707070707'
);

DELETE FROM public.templates
WHERE id IN (
  'f0700002-0202-0202-0202-020202020202',
  'f0700003-0303-0303-0303-030303030303'
)
  AND name LIKE '[07 browser-e2e]%';

DELETE FROM public.users
WHERE id IN (9390700, 9390701)
  AND name LIKE '[07 browser-e2e]%'
  AND email IN (
    'user-template-ui-07-admin@temis.local',
    'user-template-ui-07@temis.local'
  );

COMMIT;

SELECT 'remaining_07_users', COUNT(*)
FROM public.users
WHERE id IN (9390700, 9390701);

SELECT 'remaining_07_templates', COUNT(*)
FROM public.templates
WHERE id IN (
  'f0700002-0202-0202-0202-020202020202',
  'f0700003-0303-0303-0303-030303030303'
);
