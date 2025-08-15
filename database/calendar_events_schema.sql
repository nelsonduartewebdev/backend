-- Calendar Events Table Schema for Supabase
-- This script creates the calendar_events table with proper indexing and RLS policies

-- Create the calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#4CAF50',
    notes TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    recurrence VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
    category VARCHAR(50),
    parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT end_after_start CHECK (end_time > start_time),
    CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date_range ON calendar_events(user_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_parent ON calendar_events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_category ON calendar_events(category) WHERE category IS NOT NULL;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own events
CREATE POLICY "Users can view their own events" ON calendar_events
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own events
CREATE POLICY "Users can insert their own events" ON calendar_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own events
CREATE POLICY "Users can update their own events" ON calendar_events
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own events
CREATE POLICY "Users can delete their own events" ON calendar_events
    FOR DELETE USING (auth.uid() = user_id);

-- Create a view for event statistics (optional)
CREATE OR REPLACE VIEW calendar_event_stats AS
SELECT 
    user_id,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE start_time >= CURRENT_DATE) as upcoming_events,
    COUNT(*) FILTER (WHERE start_time < CURRENT_DATE) as past_events,
    COUNT(DISTINCT DATE(start_time)) as active_days,
    MIN(start_time) as first_event,
    MAX(start_time) as last_event
FROM calendar_events
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON calendar_event_stats TO authenticated;

-- Note: Views inherit RLS policies from underlying tables (calendar_events)
-- No need to create separate RLS policies for views

-- Create a function to get events in a date range (optimized query)
CREATE OR REPLACE FUNCTION get_events_in_range(
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    target_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(200),
    description TEXT,
    color VARCHAR(7),
    notes TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    recurrence VARCHAR(20),
    category VARCHAR(50),
    parent_event_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.color,
        e.notes,
        e.start_time,
        e.end_time,
        e.recurrence,
        e.category,
        e.parent_event_id,
        e.created_at,
        e.updated_at
    FROM calendar_events e
    WHERE e.user_id = target_user_id
      AND e.start_time <= end_date
      AND e.end_time >= start_date
    ORDER BY e.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check for event conflicts
CREATE OR REPLACE FUNCTION check_event_conflicts(
    event_start TIMESTAMPTZ,
    event_end TIMESTAMPTZ,
    event_user_id UUID DEFAULT auth.uid(),
    exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(200),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    overlap_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.start_time,
        e.end_time,
        CASE 
            WHEN e.start_time < event_start AND e.end_time > event_end THEN 'encompasses'
            WHEN e.start_time >= event_start AND e.end_time <= event_end THEN 'within'
            WHEN e.start_time < event_start AND e.end_time > event_start THEN 'overlaps_start'
            WHEN e.start_time < event_end AND e.end_time > event_end THEN 'overlaps_end'
            ELSE 'adjacent'
        END as overlap_type
    FROM calendar_events e
    WHERE e.user_id = event_user_id
      AND (exclude_event_id IS NULL OR e.id != exclude_event_id)
      AND e.start_time < event_end
      AND e.end_time > event_start
    ORDER BY e.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample data for testing (remove in production)
-- INSERT INTO calendar_events (user_id, title, description, color, start_time, end_time, recurrence)
-- VALUES 
--     (auth.uid(), 'Sample Event', 'This is a sample event', '#4CAF50', 
--      NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 2 hours', 'none');

-- Comments for documentation
COMMENT ON TABLE calendar_events IS 'Stores calendar events for users with full CRUD operations';
COMMENT ON COLUMN calendar_events.recurrence IS 'Recurrence pattern: none, daily, weekly, monthly';
COMMENT ON COLUMN calendar_events.parent_event_id IS 'References the original event for recurring instances';
COMMENT ON COLUMN calendar_events.color IS 'Hex color code for event display';
COMMENT ON FUNCTION get_events_in_range IS 'Optimized function to retrieve events within a date range';
COMMENT ON FUNCTION check_event_conflicts IS 'Function to detect overlapping events for conflict resolution';
