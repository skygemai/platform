BEGIN;

ALTER TABLE control_plane.users
    ADD COLUMN IF NOT EXISTS cognito_sub text;

CREATE UNIQUE INDEX IF NOT EXISTS users_cognito_sub_unique
    ON control_plane.users (cognito_sub)
    WHERE cognito_sub IS NOT NULL;

COMMIT;
