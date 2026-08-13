-- Template Hub 개선 수정사항 01: 판매 상태 변경의 원자성 보장.
--
-- 기존에는 애플리케이션이 "조회 -> 판정 -> UPDATE"를 별도 요청으로 수행해
-- 서로 다른 관리자의 동시 요청이 같은 이전 상태를 읽고 둘 다 통과할 수
-- 있었다. 최종 판정과 쓰기를 하나의 트랜잭션에서 수행하는 SECURITY DEFINER
-- 함수 두 개를 추가해 DB가 불변식의 최종 권위를 갖게 한다.
--
-- 오류는 표준 SQLSTATE와 충돌하지 않도록 Postgres 문서가 권장하는 접두사
-- (X0)를 사용한 커스텀 코드로 던진다. 서비스 레이어는 이 코드를 기존 API
-- 오류 계약(TEMPLATE_NOT_FOUND / SALE_MUST_STOP_FIRST / SALE_NOT_READY)으로
-- 변환한다.
--
--   X0001 template not found
--   X0002 sale must stop first (일반 판매 -> 맞춤 제작 전환 거부)
--   X0003 sale not ready (판매 시작 조건 미충족)

CREATE OR REPLACE FUNCTION public.template_hub_set_sales_type(
  p_template_id UUID,
  p_sales_type TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_public BOOLEAN;
  v_shop_template_id UUID;
  v_is_shop_visible BOOLEAN;
BEGIN
  IF p_sales_type NOT IN ('general', 'custom') THEN
    RAISE EXCEPTION 'invalid sales_type: %', p_sales_type;
  END IF;

  SELECT is_public INTO v_is_public
  FROM public.templates
  WHERE id = p_template_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'X0001', MESSAGE = 'template not found';
  END IF;

  SELECT id, is_shop_visible INTO v_shop_template_id, v_is_shop_visible
  FROM public.shop_templates
  WHERE template_id = p_template_id
  FOR UPDATE;

  IF p_sales_type = 'custom' AND COALESCE(v_is_shop_visible, false) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'X0002',
      MESSAGE = '맞춤 제작으로 변경하려면 먼저 판매를 중지해 주세요.';
  END IF;

  UPDATE public.templates
  SET is_public = (p_sales_type = 'general')
  WHERE id = p_template_id;
END;
$$;

COMMENT ON FUNCTION public.template_hub_set_sales_type(UUID, TEXT)
IS 'Template Hub: 일반 판매/맞춤 제작 전환을 판정과 같은 트랜잭션에서 수행한다. 판매 중(is_shop_visible=true)에는 맞춤 제작 전환을 거부한다(X0002).';

CREATE OR REPLACE FUNCTION public.template_hub_set_sale_visibility(
  p_template_id UUID,
  p_visible BOOLEAN
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status TEXT;
  v_is_public BOOLEAN;
  v_shop_template_id UUID;
  v_artist_ids UUID[];
  v_ready BOOLEAN;
BEGIN
  SELECT status, is_public INTO v_status, v_is_public
  FROM public.templates
  WHERE id = p_template_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'X0001', MESSAGE = 'template not found';
  END IF;

  SELECT id INTO v_shop_template_id
  FROM public.shop_templates
  WHERE template_id = p_template_id
  FOR UPDATE;

  -- 판매 중지는 readiness와 무관하게 항상 허용한다. 상품이 없으면 반영할
  -- 대상 자체가 없으므로 아무 것도 갱신하지 않는다.
  IF NOT p_visible THEN
    IF v_shop_template_id IS NOT NULL THEN
      UPDATE public.shop_templates
      SET is_shop_visible = false
      WHERE id = v_shop_template_id;
    END IF;
    RETURN;
  END IF;

  IF v_shop_template_id IS NOT NULL THEN
    SELECT array_agg(artist_id) INTO v_artist_ids
    FROM public.template_artists
    WHERE template_id = p_template_id;
  END IF;

  -- evaluateTemplateSaleReadiness()(src/services/server/templateHubService.ts)와
  -- 동일한 조건을 SQL로 재검증한다: 게시 여부, 일반 판매, 상품/plan 존재,
  -- 작가 연결, 작가별 로열티 규칙(템플릿 전용 우선, 없으면 작가 기본).
  v_ready := v_status = 'published'
    AND v_is_public
    AND v_shop_template_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.template_plans tp
      WHERE tp.shop_template_id = v_shop_template_id
        AND tp.price IS NOT NULL
        AND tp.price >= 0
        AND tp.plan = ANY (ARRAY['lite', 'pro'])
    )
    AND v_artist_ids IS NOT NULL
    AND array_length(v_artist_ids, 1) > 0
    AND NOT EXISTS (
      SELECT 1 FROM unnest(v_artist_ids) AS au(artist_id)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.artist_royalty_rules arr
        WHERE arr.artist_id = au.artist_id
          AND (arr.template_id = p_template_id OR arr.template_id IS NULL)
      )
    );

  IF NOT v_ready THEN
    RAISE EXCEPTION USING
      ERRCODE = 'X0003',
      MESSAGE = '판매를 시작하려면 먼저 아래 조건을 해결해 주세요.';
  END IF;

  UPDATE public.shop_templates
  SET is_shop_visible = true
  WHERE id = v_shop_template_id;
END;
$$;

COMMENT ON FUNCTION public.template_hub_set_sale_visibility(UUID, BOOLEAN)
IS 'Template Hub: 판매 시작/중지를 readiness 재검증과 같은 트랜잭션에서 수행한다. 중지는 항상 허용하고(X0002 대상 아님), 시작은 게시/일반판매/상품/plan/작가/로열티를 다시 확인한 뒤에만 허용한다(X0003).';

REVOKE ALL ON FUNCTION public.template_hub_set_sales_type(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.template_hub_set_sale_visibility(UUID, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.template_hub_set_sales_type(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.template_hub_set_sale_visibility(UUID, BOOLEAN) TO service_role;
