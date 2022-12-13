CREATE TABLE IF NOT EXISTS map_sessions (
    session_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiration timestamptz,
    session_token text NOT NULL,
    PRIMARY KEY(session_id)
);