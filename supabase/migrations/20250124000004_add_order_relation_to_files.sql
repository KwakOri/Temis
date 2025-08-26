-- files 테이블에 order_id와 file_category 컬럼 추가
ALTER TABLE files 
ADD COLUMN order_id UUID REFERENCES custom_timetable_orders(id) ON DELETE CASCADE,
ADD COLUMN file_category VARCHAR(20) CHECK (file_category IN ('character_image', 'reference'));

-- 인덱스 생성
CREATE INDEX idx_files_order_id ON files(order_id);
CREATE INDEX idx_files_order_id_category ON files(order_id, file_category);