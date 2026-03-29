-- custom_timetable_orders 테이블에 옵션을 JSON으로 저장하는 컬럼 추가
ALTER TABLE custom_timetable_orders 
ADD COLUMN selected_options JSONB DEFAULT '[]'::jsonb;