-- ============================================================================
-- PRODUCTION EMAIL OTP AUTHENTICATION SYSTEM MIGRATION FOR BILLKART ERP
-- Database: PostgreSQL 12+
-- Description: Adds tables and indexes for Email OTP, brute force tracking, and session security.
-- ============================================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Email OTP Storage Table
CREATE TABLE IF NOT EXISTS email_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resend_available_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INT DEFAULT 0,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON email_otps(expires_at);

-- 3. Ensure users table supports lockout and password resets
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE NULL;

-- 4. Stored Procedure for Brute Force Lockout
CREATE OR REPLACE FUNCTION check_brute_force_lockout(
    p_email VARCHAR,
    p_is_success BOOLEAN
) RETURNS TABLE (is_locked BOOLEAN, attempts_left INT, message TEXT) AS $$
DECLARE
    v_failed INT;
    v_locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT failed_login_attempts, locked_until 
    INTO v_failed, v_locked_until 
    FROM users WHERE email = p_email;

    -- Check if currently locked
    IF v_locked_until IS NOT NULL AND v_locked_until > CURRENT_TIMESTAMP THEN
        RETURN QUERY SELECT TRUE, 0, 'Account is locked for 15 minutes due to multiple failed OTP attempts.'::TEXT;
        RETURN;
    END IF;

    IF p_is_success THEN
        -- Reset counter on successful login
        UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = p_email;
        RETURN QUERY SELECT FALSE, 5, 'Login successful.'::TEXT;
    ELSE
        -- Increment failed count
        v_failed := COALESCE(v_failed, 0) + 1;
        IF v_failed >= 5 THEN
            -- Lock for 15 minutes
            UPDATE users SET failed_login_attempts = v_failed, locked_until = CURRENT_TIMESTAMP + INTERVAL '15 minutes' WHERE email = p_email;
            RETURN QUERY SELECT TRUE, 0, 'Account locked for 15 minutes due to 5 failed attempts.'::TEXT;
        ELSE
            UPDATE users SET failed_login_attempts = v_failed WHERE email = p_email;
            RETURN QUERY SELECT FALSE, (5 - v_failed), ('Invalid credentials. ' || (5 - v_failed) || ' attempts remaining.')::TEXT;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
