-- Tournament Expenses Table
-- This table stores expense planning and tracking data for tournaments

CREATE TABLE IF NOT EXISTS tournament_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id TEXT NOT NULL, -- References user_tournament_selections.tournament_id
  
  -- Flight Information
  departure_airport TEXT,
  arrival_airport TEXT,
  flight_price_estimate DECIMAL(10,2),
  flight_booking_reference TEXT,
  
  -- Accommodation
  hotel_name TEXT,
  hotel_price_per_night DECIMAL(10,2),
  nights_count INTEGER DEFAULT 1,
  hotel_booking_reference TEXT,
  
  -- Other Expenses
  tournament_entry_fee DECIMAL(10,2) DEFAULT 0,
  transportation_cost DECIMAL(10,2) DEFAULT 0,
  meals_budget DECIMAL(10,2) DEFAULT 0,
  other_expenses DECIMAL(10,2) DEFAULT 0,
  
  -- Totals and Status
  total_estimated_cost DECIMAL(10,2) DEFAULT 0,
  actual_spent DECIMAL(10,2) DEFAULT 0,
  is_booked BOOLEAN DEFAULT FALSE,
  planning_status TEXT DEFAULT 'planning' CHECK (planning_status IN ('planning', 'booked', 'completed')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_amounts CHECK (
    tournament_entry_fee >= 0 AND 
    transportation_cost >= 0 AND 
    meals_budget >= 0 AND 
    other_expenses >= 0 AND
    total_estimated_cost >= 0 AND
    actual_spent >= 0 AND
    nights_count > 0
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tournament_expenses_user_id ON tournament_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_expenses_tournament_id ON tournament_expenses(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_expenses_planning_status ON tournament_expenses(planning_status);
CREATE INDEX IF NOT EXISTS idx_tournament_expenses_created_at ON tournament_expenses(created_at);

-- Create unique constraint to prevent duplicate expenses for the same tournament
CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_expenses_unique 
ON tournament_expenses(user_id, tournament_id);

-- Enable Row Level Security (RLS)
ALTER TABLE tournament_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own expenses" ON tournament_expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON tournament_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON tournament_expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON tournament_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_tournament_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_tournament_expenses_updated_at
  BEFORE UPDATE ON tournament_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_tournament_expenses_updated_at();

-- Function to calculate total estimated cost automatically
CREATE OR REPLACE FUNCTION calculate_total_estimated_cost()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_estimated_cost = COALESCE(NEW.flight_price_estimate, 0) + 
                            COALESCE(NEW.hotel_price_per_night, 0) * COALESCE(NEW.nights_count, 1) +
                            COALESCE(NEW.tournament_entry_fee, 0) +
                            COALESCE(NEW.transportation_cost, 0) +
                            COALESCE(NEW.meals_budget, 0) +
                            COALESCE(NEW.other_expenses, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate total cost
CREATE TRIGGER trigger_calculate_total_estimated_cost
  BEFORE INSERT OR UPDATE ON tournament_expenses
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_estimated_cost();

-- View for expense summaries by user
CREATE OR REPLACE VIEW user_expense_summary AS
SELECT 
  user_id,
  COUNT(*) as total_tournaments,
  COUNT(CASE WHEN planning_status = 'planning' THEN 1 END) as planning_count,
  COUNT(CASE WHEN planning_status = 'booked' THEN 1 END) as booked_count,
  COUNT(CASE WHEN planning_status = 'completed' THEN 1 END) as completed_count,
  SUM(total_estimated_cost) as total_estimated,
  SUM(actual_spent) as total_actual,
  AVG(total_estimated_cost) as average_estimated_cost,
  MIN(created_at) as first_expense_date,
  MAX(updated_at) as last_updated
FROM tournament_expenses
GROUP BY user_id;

-- Grant permissions for the view
GRANT SELECT ON user_expense_summary TO authenticated;

-- Function to get monthly expense breakdown
CREATE OR REPLACE FUNCTION get_monthly_expense_breakdown(input_user_id UUID)
RETURNS TABLE(
  month TEXT,
  total_estimated DECIMAL,
  total_actual DECIMAL,
  tournament_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(created_at, 'YYYY-MM') as month,
    SUM(total_estimated_cost) as total_estimated,
    SUM(actual_spent) as total_actual,
    COUNT(*) as tournament_count
  FROM tournament_expenses
  WHERE user_id = input_user_id
  GROUP BY TO_CHAR(created_at, 'YYYY-MM')
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_monthly_expense_breakdown(UUID) TO authenticated;

-- Sample data (uncomment to insert test data)
/*
INSERT INTO tournament_expenses (
  user_id,
  tournament_id,
  departure_airport,
  arrival_airport,
  flight_price_estimate,
  hotel_name,
  hotel_price_per_night,
  nights_count,
  tournament_entry_fee,
  transportation_cost,
  meals_budget,
  other_expenses,
  planning_status
) VALUES (
  auth.uid(), -- This will need to be replaced with actual user ID
  'sample_tournament_123',
  'LIS',
  'MAD',
  150.00,
  'Hotel Madrid Central',
  89.00,
  2,
  75.00,
  30.00,
  100.00,
  50.00,
  'planning'
);
*/
