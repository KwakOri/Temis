-- Create thumbnails table with same structure as templates
CREATE TABLE IF NOT EXISTS public.thumbnails (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NOT NULL DEFAULT ''::text,
    thumbnail_url text NOT NULL DEFAULT ''::text,
    is_public boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    detailed_description text,
    is_shop_visible boolean NOT NULL DEFAULT false
);

COMMENT ON TABLE public.thumbnails IS 'Stores thumbnail template information';
COMMENT ON COLUMN public.thumbnails.detailed_description IS '썸네일 상세 설명 (HTML 포함 가능)';
COMMENT ON COLUMN public.thumbnails.is_shop_visible IS '상점에서 노출 여부 (공개 썸네일만 해당)';

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_thumbnails_is_public ON public.thumbnails(is_public);
CREATE INDEX IF NOT EXISTS idx_thumbnails_is_shop_visible ON public.thumbnails(is_shop_visible);
CREATE INDEX IF NOT EXISTS idx_thumbnails_created_at ON public.thumbnails(created_at DESC);
