-- =====================================================
-- no-artist 제거 + 기본 디폴트 작가를 테미스로 통일
-- =====================================================

DO $$
DECLARE
  v_temis_id UUID;
BEGIN
  -- 1) 테미스 시스템 작가 보장
  SELECT id
    INTO v_temis_id
  FROM public.artists
  WHERE slug = 'temis'
     OR name = '테미스'
  ORDER BY CASE WHEN slug = 'temis' THEN 0 ELSE 1 END, created_at ASC
  LIMIT 1;

  IF v_temis_id IS NULL THEN
    INSERT INTO public.artists (
      name,
      slug,
      bio,
      is_active
    )
    VALUES (
      '테미스',
      'temis',
      '기본 연결용 내부 작가',
      true
    )
    RETURNING id INTO v_temis_id;
  END IF;

  -- 2) 작가 미연결 템플릿은 테미스로 기본 연결
  INSERT INTO public.template_artists (
    template_id,
    artist_id,
    role,
    is_primary,
    display_order
  )
  SELECT
    t.id,
    v_temis_id,
    'creator',
    true,
    0
  FROM public.templates t
  LEFT JOIN public.template_artists ta
    ON ta.template_id = t.id
  GROUP BY t.id
  HAVING COUNT(ta.id) = 0
  ON CONFLICT (template_id, artist_id) DO NOTHING;

  -- 3) no-artist 계열 작가를 테미스로 치환
  CREATE TEMP TABLE _no_artist_ids ON COMMIT DROP AS
  SELECT id
  FROM public.artists
  WHERE slug = 'no-artist'
     OR name = '작가 없음';

  CREATE TEMP TABLE _primary_templates ON COMMIT DROP AS
  SELECT DISTINCT ta.template_id
  FROM public.template_artists ta
  WHERE ta.artist_id IN (SELECT id FROM _no_artist_ids)
    AND ta.is_primary = true;

  -- temis가 이미 연결된 템플릿은 no-artist 연결만 제거
  DELETE FROM public.template_artists ta
  WHERE ta.artist_id IN (SELECT id FROM _no_artist_ids)
    AND EXISTS (
      SELECT 1
      FROM public.template_artists t2
      WHERE t2.template_id = ta.template_id
        AND t2.artist_id = v_temis_id
    );

  -- 남은 no-artist 연결은 temis로 변경
  UPDATE public.template_artists ta
  SET artist_id = v_temis_id
  WHERE ta.artist_id IN (SELECT id FROM _no_artist_ids);

  -- no-artist가 대표였던 템플릿 중 대표가 비면 temis를 대표로 지정
  UPDATE public.template_artists ta
  SET is_primary = true
  WHERE ta.artist_id = v_temis_id
    AND ta.template_id IN (SELECT template_id FROM _primary_templates)
    AND NOT EXISTS (
      SELECT 1
      FROM public.template_artists t3
      WHERE t3.template_id = ta.template_id
        AND t3.is_primary = true
    );

  -- 4) no-artist 작가 레코드 제거
  DELETE FROM public.artists a
  WHERE a.id IN (SELECT id FROM _no_artist_ids);
END
$$;
