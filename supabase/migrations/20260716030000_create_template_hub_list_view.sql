-- Template Hub 개선 수정사항 03: readiness 필터 1,000건 상한 제거.
--
-- saleStatus=ready|blocked|unconfigured는 로열티까지 포함한 readiness 계산이
-- 필요해 SQL만으로 판정할 수 없었기 때문에, 서버가 필터 적용 전 최대 1,000건을
-- 읽어 애플리케이션에서 계산·필터링했다. 대상 템플릿이 1,000건을 넘으면
-- 1,001번째 이후 행이 검색 대상에서 사라지고 count/페이지네이션도 실제보다
-- 작게 나온다.
--
-- readiness 판정(`evaluateTemplateSaleReadiness()`,
-- src/services/server/templateHubSaleRules.ts)과 판매 상태 우선순위
-- (`resolveTemplateSaleStatus()`, src/types/template-hub.ts)를 SQL view로
-- 재구성해 DB가 필터·count·정렬·페이지네이션을 전담하게 한다.
--
-- 두 단계 view로 나눈 이유: readiness(`is_ready`) 표현식을 한 번만 적으면서
-- 그 값을 다시 참조해 `sale_status`의 CASE 분기를 만들기 위함이다(같은 SELECT
-- 목록 안에서 방금 계산한 컬럼을 그대로 재참조할 수 없다).

CREATE OR REPLACE VIEW public.template_hub_readiness AS
SELECT
  t.id,
  t.name,
  t.description,
  t.template_engine,
  t.status,
  t.is_public,
  t.created_at,
  t.updated_at,
  st.id AS shop_template_id,
  COALESCE(st.is_shop_visible, false) AS is_shop_visible,
  (st.id IS NOT NULL) AS has_product,
  (
    t.status = 'published'
    AND t.is_public
    AND st.id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.template_plans tp
      WHERE tp.shop_template_id = st.id
        AND tp.price IS NOT NULL
        AND tp.price >= 0
        AND tp.plan = ANY (ARRAY['lite', 'pro'])
    )
    AND EXISTS (
      SELECT 1 FROM public.template_artists ta WHERE ta.template_id = t.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.template_artists ta
      WHERE ta.template_id = t.id
        AND NOT EXISTS (
          SELECT 1 FROM public.artist_royalty_rules arr
          WHERE arr.artist_id = ta.artist_id
            AND (arr.template_id = t.id OR arr.template_id IS NULL)
        )
    )
  ) AS is_ready
FROM public.templates t
LEFT JOIN public.shop_templates st ON st.template_id = t.id;

COMMENT ON VIEW public.template_hub_readiness
IS 'Template Hub: evaluateTemplateSaleReadiness()와 동일한 조건을 SQL로 재구성한 템플릿별 readiness. template_hub_list의 기반.';

CREATE OR REPLACE VIEW public.template_hub_list AS
SELECT
  r.id,
  r.name,
  r.description,
  r.template_engine,
  r.status,
  r.is_public,
  r.created_at,
  r.updated_at,
  r.shop_template_id,
  r.is_shop_visible,
  r.has_product,
  r.is_ready,
  CASE
    WHEN r.is_shop_visible THEN 'selling'
    WHEN r.is_ready THEN 'ready'
    WHEN NOT r.has_product THEN 'unconfigured'
    ELSE 'blocked'
  END AS sale_status
FROM public.template_hub_readiness r;

COMMENT ON VIEW public.template_hub_list
IS 'Template Hub: resolveTemplateSaleStatus()와 동일한 우선순위를 SQL로 재구성한 sale_status. Hub 목록 필터/count/pagination이 이 view를 기준으로 동작한다.';

REVOKE ALL ON public.template_hub_readiness FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.template_hub_list FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.template_hub_readiness TO service_role;
GRANT SELECT ON public.template_hub_list TO service_role;
