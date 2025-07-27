-- Add Twitter integration columns to users table
ALTER TABLE users 
ADD COLUMN twitter_access_token TEXT NULL,
ADD COLUMN twitter_access_token_secret TEXT NULL,
ADD COLUMN twitter_user_id TEXT NULL,
ADD COLUMN twitter_username TEXT NULL,
ADD COLUMN twitter_connected_at TIMESTAMP NULL;

-- Add indexes for performance
CREATE INDEX idx_users_twitter_user_id ON users(twitter_user_id);
CREATE INDEX idx_users_twitter_connected_at ON users(twitter_connected_at);

-- Comments for documentation
COMMENT ON COLUMN users.twitter_access_token IS 'Twitter OAuth 1.1 access token for API calls';
COMMENT ON COLUMN users.twitter_access_token_secret IS 'Twitter OAuth 1.1 access token secret';
COMMENT ON COLUMN users.twitter_user_id IS 'Twitter user ID for identification';
COMMENT ON COLUMN users.twitter_username IS 'Twitter username (handle) for display';
COMMENT ON COLUMN users.twitter_connected_at IS 'Timestamp when Twitter account was connected';