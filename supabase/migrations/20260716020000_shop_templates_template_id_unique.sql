-- Template Hub 개선 수정사항 06: 템플릿당 상품 1개 불변식 보장.
--
-- 애플리케이션은 한 템플릿에 shop_templates가 최대 한 행이라고 가정하지만
-- (Hub는 관계 배열의 첫 행만 선택하고, 상품 생성 API는 insert 전 조회로만
-- 중복을 막는다), DB에는 이를 강제하는 제약이 없어 동시 생성 요청 두 개가
-- 모두 "기존 상품 없음"을 확인한 뒤 각각 insert할 수 있었다.
--
-- 적용 전 원격·로컬 중복 감사 결과(2026-07-16, 로컬 복제 DB 기준):
--
--   select template_id, count(*)
--   from public.shop_templates
--   where template_id is not null
--   group by template_id
--   having count(*) > 1;
--
--   => 0 rows. 원격 Supabase는 이 migration을 적용하기 전 별도로 동일한
--   감사를 실행하고, 사용자 승인 후에만 적용한다.

CREATE UNIQUE INDEX IF NOT EXISTS shop_templates_template_id_unique
  ON public.shop_templates (template_id)
  WHERE template_id IS NOT NULL;

COMMENT ON INDEX public.shop_templates_template_id_unique
IS 'Template Hub: 템플릿당 상품 1개 불변식. NULL(고아 상품)은 제외.';
