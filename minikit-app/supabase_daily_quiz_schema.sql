-- Table for tracking daily quiz streak and last attempt per user
CREATE TABLE IF NOT EXISTS daily_quiz_user_stats (
    id SERIAL PRIMARY KEY,
    user_fid BIGINT NOT NULL,
    last_completed_at TIMESTAMP NOT NULL,
    streak INTEGER NOT NULL DEFAULT 1,
    UNIQUE(user_fid)
);
