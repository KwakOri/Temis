-- 구매 대기 중에는 같은 사용자가 같은 템플릿에 중복 신청할 수 없도록 한다.
-- API의 사전 조회만으로는 동시 요청 race를 막을 수 없으므로 DB가 최종 보장한다.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.template_purchase_requests
    WHERE status = 'pending'
    GROUP BY user_id, template_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot create pending purchase request uniqueness index while duplicate pending rows exist';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_template_purchase_requests_pending_user_template
  ON public.template_purchase_requests(user_id, template_id)
  WHERE status = 'pending';

COMMENT ON INDEX public.idx_template_purchase_requests_pending_user_template IS
  'Prevents duplicate pending purchase requests for the same user and template';
