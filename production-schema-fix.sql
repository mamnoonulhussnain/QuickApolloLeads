-- PRODUCTION DATABASE SCHEMA UPDATE
-- Execute this in your production database to match development schema
-- This will safely align production with development without data loss

BEGIN;

-- 1. Add missing columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS password varchar NOT NULL DEFAULT 'temp_password_needs_reset';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires timestamp;

-- 2. Set proper constraints for required columns
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;

-- 3. Set proper defaults for existing columns
ALTER TABLE users ALTER COLUMN credits SET DEFAULT 0;
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;

-- 4. Remove the temporary default from password after adding it
ALTER TABLE users ALTER COLUMN password DROP DEFAULT;

-- 5. Drop old unused columns if they exist
ALTER TABLE users DROP COLUMN IF EXISTS profile_image_url;

-- 6. Remove any auto-increment default from id if it exists
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;

COMMIT;