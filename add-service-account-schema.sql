-- Add service account support using realm-based grouping
-- This allows one connection per QuickBooks realm to be designated as the service account
-- All users connecting to the same realm will automatically use the service account

-- Add service account flag
ALTER TABLE quickbooks_connections 
ADD COLUMN IF NOT EXISTS is_service_account BOOLEAN DEFAULT FALSE;

-- Add display name for better UX
ALTER TABLE quickbooks_connections 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Create index for service account lookups by realm
CREATE INDEX IF NOT EXISTS idx_service_account_by_realm 
ON quickbooks_connections(realm_id, is_service_account) 
WHERE is_service_account = TRUE AND is_active = TRUE;

-- Ensure only one service account per realm (QuickBooks company)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_service_account_per_realm 
ON quickbooks_connections(realm_id) 
WHERE is_service_account = TRUE AND is_active = TRUE;

-- Example: Set Adam's connection as the service account for the demo realm
-- (Replace the realm_id with the actual one from your QuickBooks sandbox)
-- UPDATE quickbooks_connections 
-- SET is_service_account = TRUE, 
--     display_name = 'Demo Company (Service Account)',
--     is_shared = TRUE
-- WHERE realm_id = 'YOUR_DEMO_REALM_ID' AND user_id = 'adamcroft_user_id';