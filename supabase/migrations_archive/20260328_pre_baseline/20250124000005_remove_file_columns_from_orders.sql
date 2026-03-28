-- custom_timetable_orders 테이블에서 파일 관련 컬럼 4개 제거
ALTER TABLE custom_timetable_orders 
DROP COLUMN IF EXISTS character_image_files,
DROP COLUMN IF EXISTS character_image_file_ids,
DROP COLUMN IF EXISTS reference_files,
DROP COLUMN IF EXISTS reference_file_ids;