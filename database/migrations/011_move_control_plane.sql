BEGIN;

CREATE SCHEMA IF NOT EXISTS control_plane;

ALTER TABLE shared.users
    SET SCHEMA control_plane;

ALTER TABLE shared.tenants
    SET SCHEMA control_plane;

ALTER TABLE shared.memberships
    SET SCHEMA control_plane;

ALTER TABLE shared.tenant_storage
    SET SCHEMA control_plane;

ALTER TABLE shared.retell_connections
    SET SCHEMA control_plane;

ALTER TABLE shared.agents
    SET SCHEMA control_plane;

ALTER FUNCTION shared.set_updated_at()
    SET SCHEMA control_plane;

COMMIT;