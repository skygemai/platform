BEGIN;

CREATE TABLE control_plane.user_invitations (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     uuid NOT NULL
                                    REFERENCES control_plane.users(id) ON DELETE CASCADE,
    tenant_id                   uuid NOT NULL
                                    REFERENCES control_plane.tenants(id) ON DELETE CASCADE,
    email                       text NOT NULL,
    role                        text NOT NULL
                                    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    status                      text NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'accepted', 'cancelled', 'failed')),
    cognito_username            text NOT NULL,
    invited_by_cognito_sub      text NOT NULL,
    attempt_count               integer NOT NULL DEFAULT 1
                                    CHECK (attempt_count > 0),
    last_sent_at                timestamptz,
    accepted_at                 timestamptz,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX user_invitations_one_pending_idx
    ON control_plane.user_invitations (user_id, tenant_id)
    WHERE status = 'pending';

CREATE INDEX user_invitations_tenant_status_idx
    ON control_plane.user_invitations (tenant_id, status, created_at DESC);

CREATE INDEX user_invitations_user_status_idx
    ON control_plane.user_invitations (user_id, status);

COMMIT;
