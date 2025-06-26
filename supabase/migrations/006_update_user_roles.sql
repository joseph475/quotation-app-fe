-- Update existing 'user' roles to 'customer' roles
-- This migration handles the role change from 'user' to 'customer'

-- Update all users with role 'user' to role 'customer'
UPDATE users 
SET role = 'customer' 
WHERE role = 'user';

-- Add a comment to track this migration
COMMENT ON TABLE users IS 'Updated user roles: changed "user" to "customer" role for better separation of concerns';

-- Verify the update (this will show in the query results)
SELECT 
    role,
    COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY role;
