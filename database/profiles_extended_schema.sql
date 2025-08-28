-- Extended profiles table schema to support legacy UserService interface
-- This adds additional fields needed for the frontend UserService compatibility

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS position TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'premium')),
ADD COLUMN IF NOT EXISTS plan_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_payment_due TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'past_due', 'canceled'));

-- Update existing profiles to have default values
UPDATE profiles 
SET 
  country = COALESCE(country, ''),
  timezone = COALESCE(timezone, 'UTC'),
  plan_type = COALESCE(plan_type, 'free'),
  is_active = COALESCE(is_active, true),
  stripe_customer_id = COALESCE(stripe_customer_id, ''),
  stripe_subscription_id = COALESCE(stripe_subscription_id, ''),
  payment_status = COALESCE(payment_status, 'pending')
WHERE country IS NULL 
   OR timezone IS NULL 
   OR plan_type IS NULL 
   OR is_active IS NULL 
   OR stripe_customer_id IS NULL 
   OR stripe_subscription_id IS NULL 
   OR payment_status IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_plan_type ON profiles(plan_type);
CREATE INDEX IF NOT EXISTS idx_profiles_payment_status ON profiles(payment_status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);

-- Update RLS policies to include new fields
-- Note: The existing policies should work, but we might want to be explicit about allowed fields

COMMENT ON TABLE profiles IS 'Extended user profiles table supporting both auth and legacy UserService interfaces';
COMMENT ON COLUMN profiles.country IS 'User country';
COMMENT ON COLUMN profiles.age IS 'User age';
COMMENT ON COLUMN profiles.position IS 'User playing position (for sports apps)';
COMMENT ON COLUMN profiles.timezone IS 'User timezone';
COMMENT ON COLUMN profiles.plan_type IS 'Subscription plan type';
COMMENT ON COLUMN profiles.plan_start_date IS 'Subscription start date';
COMMENT ON COLUMN profiles.plan_end_date IS 'Subscription end date';
COMMENT ON COLUMN profiles.trial_end_date IS 'Trial end date';
COMMENT ON COLUMN profiles.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN profiles.last_payment_date IS 'Last payment date';
COMMENT ON COLUMN profiles.next_payment_due IS 'Next payment due date';
COMMENT ON COLUMN profiles.payment_status IS 'Current payment status';
