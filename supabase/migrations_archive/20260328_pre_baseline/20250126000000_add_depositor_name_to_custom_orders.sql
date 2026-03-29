-- Add depositor_name column to custom_timetable_orders table
ALTER TABLE custom_timetable_orders
ADD COLUMN depositor_name TEXT;

-- Add comment for the new column
COMMENT ON COLUMN custom_timetable_orders.depositor_name IS '입금자명 (계좌 이체 시 사용하는 이름)';