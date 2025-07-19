-- Fix for allowing multiple users to connect to the same QuickBooks account
-- This removes the unique constraint that's preventing your cofounder from connecting

-- 1. Drop the existing unique constraint
ALTER TABLE quickbooks_connections 
DROP CONSTRAINT IF EXISTS quickbooks_connections_user_id_company_id_realm_id_key;

-- 2. Add a new unique constraint that only prevents the same user from having duplicate connections
-- This allows different users to connect to the same QuickBooks account
ALTER TABLE quickbooks_connections 
ADD CONSTRAINT quickbooks_connections_user_id_realm_id_key 
UNIQUE(user_id, realm_id);

-- 3. Optional: If you want to ensure only one active connection per user per realm
-- You could add a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_connection_per_user_realm 
ON quickbooks_connections(user_id, realm_id) 
WHERE is_active = TRUE;