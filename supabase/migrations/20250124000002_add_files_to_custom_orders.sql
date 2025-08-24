-- custom_orders 테이블에 파일 ID 배열 컬럼 추가
ALTER TABLE custom_orders 
ADD COLUMN character_image_file_ids UUID[] DEFAULT '{}',
ADD COLUMN reference_file_ids UUID[] DEFAULT '{}';