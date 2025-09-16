-- SAFE PRODUCTION DATABASE SCHEMA UPDATE
-- This handles existing users without passwords

-- 1. Add the password column as nullable first
ALTER TABLE users ADD COLUMN IF NOT EXISTS password varchar;

-- 2. Add other missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires timestamp;

-- 3. Update existing users with NULL passwords to have a temporary password
UPDATE users SET password = 'temp_password_needs_reset' WHERE password IS NULL;

-- 4. Now make password column NOT NULL (after all users have passwords)
ALTER TABLE users ALTER COLUMN password SET NOT NULL;

-- 5. Set proper constraints for other required columns
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;

-- 6. Set proper defaults
ALTER TABLE users ALTER COLUMN credits SET DEFAULT 0;
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;

-- 7. Drop old unused columns if they exist
ALTER TABLE users DROP COLUMN IF EXISTS profile_image_url;

-- 8. Remove any auto-increment default from id if it exists
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;