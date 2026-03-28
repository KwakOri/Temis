-- Add deadline column to custom_timetable_orders table
ALTER TABLE custom_timetable_orders 
ADD COLUMN deadline DATE;

-- Add comment to describe the new column
COMMENT ON COLUMN custom_timetable_orders.deadline IS 'Expected completion date for the custom timetable order';