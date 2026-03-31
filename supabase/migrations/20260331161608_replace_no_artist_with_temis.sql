-- =====================================================
-- "작가 없음" 연결 템플릿을 "테미스"로 일괄 전환
-- =====================================================

DO $$
DECLARE
  v_no_artist_id UUID;
  v_temis_id UUID;
BEGIN
  SELECT id
    INTO v_no_artist_id
  FROM public.artists
  WHERE slug = 'no-artist'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_no_artist_id IS NULL THEN
    RAISE EXCEPTION '"no-artist" 작가를 찾을 수 없습니다.';
  END IF;

  SELECT id
    INTO v_temis_id
  FROM public.artists
  WHERE slug = 'temis'
     OR name = '테미스'
  ORDER BY CASE WHEN slug = 'temis' THEN 0 ELSE 1 END, created_at ASC
  LIMIT 1;

  IF v_temis_id IS NULL THEN
    RAISE EXCEPTION '"테미스" 작가를 찾을 수 없습니다.';
  END IF;

  -- 이미 테미스가 연결된 템플릿은 no-artist 연결만 제거(중복/유니크 충돌 방지)
  CREATE TEMP TABLE _deleted_primary_templates (
    template_id UUID PRIMARY KEY
  ) ON COMMIT DROP;

  INSERT INTO _deleted_primary_templates (template_id)
  SELECT DISTINCT ta.template_id
  FROM public.template_artists ta
  WHERE ta.artist_id = v_no_artist_id
    AND ta.is_primary = true
    AND EXISTS (
      SELECT 1
      FROM public.template_artists t2
      WHERE t2.template_id = ta.template_id
        AND t2.artist_id = v_temis_id
    );

  DELETE FROM public.template_artists ta
  WHERE ta.artist_id = v_no_artist_id
    AND EXISTS (
      SELECT 1
      FROM public.template_artists t2
      WHERE t2.template_id = ta.template_id
        AND t2.artist_id = v_temis_id
    );

  -- no-artist가 대표였고 삭제된 템플릿 중 대표가 비어 있으면 테미스를 대표로 지정
  UPDATE public.template_artists ta
  SET is_primary = true
  WHERE ta.artist_id = v_temis_id
    AND ta.template_id IN (SELECT template_id FROM _deleted_primary_templates)
    AND NOT EXISTS (
      SELECT 1
      FROM public.template_artists t3
      WHERE t3.template_id = ta.template_id
        AND t3.is_primary = true
    );

  -- 남은 no-artist 연결을 테미스로 치환
  UPDATE public.template_artists
  SET artist_id = v_temis_id
  WHERE artist_id = v_no_artist_id;
END
$$;
