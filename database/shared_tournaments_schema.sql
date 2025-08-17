-- Table for storing shared tournament data with short URLs
CREATE TABLE IF NOT EXISTS shared_tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id VARCHAR(16) UNIQUE NOT NULL, -- Short hash for the URL
  tournament_data JSONB NOT NULL, -- Array of tournament objects
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  access_count INTEGER DEFAULT 0 -- Track how many times it's been accessed
);

-- Index for faster lookups by share_id
CREATE INDEX IF NOT EXISTS idx_shared_tournaments_share_id ON shared_tournaments(share_id);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_shared_tournaments_expires_at ON shared_tournaments(expires_at);

-- Enable Row Level Security
ALTER TABLE shared_tournaments ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (no authentication required for shared tournaments)
CREATE POLICY "Allow public read access to shared tournaments" ON shared_tournaments
  FOR SELECT USING (expires_at > NOW());

CREATE POLICY "Allow public insert for creating shared tournaments" ON shared_tournaments
  FOR INSERT WITH CHECK (true);

-- Cleanup function to remove expired shared tournaments (can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_shared_tournaments()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM shared_tournaments 
  WHERE expires_at < NOW() - INTERVAL '7 days'; -- Keep expired ones for 7 days for debugging
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to cleanup expired entries (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-shared-tournaments', '0 2 * * *', 'SELECT cleanup_expired_shared_tournaments();');
