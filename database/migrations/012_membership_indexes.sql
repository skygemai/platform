BEGIN;

-- The existing unique (user_id, tenant_id) constraint supports user-first lookups.
-- This additional index supports tenant-first membership listing and access checks.
CREATE INDEX IF NOT EXISTS memberships_tenant_id_idx
    ON control_plane.memberships (tenant_id);

COMMIT;
