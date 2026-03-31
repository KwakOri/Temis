-- =====================================================
-- artists.user_id 추가: 작가 프로필과 회원 계정 1:1 연결
-- =====================================================

ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS user_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'artists_user_id_fkey'
  ) THEN
    ALTER TABLE public.artists
      ADD CONSTRAINT artists_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.artists.user_id IS '작가 프로필에 연결된 users.id (1:1)';

CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_user_id_unique
  ON public.artists(user_id)
  WHERE user_id IS NOT NULL;
