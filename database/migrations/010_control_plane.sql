-- ============================================================
-- 010_control_plane.sql
--
-- Central control plane for the multi-tenant application.
--
-- Contains:
--   users
--   tenants
--   memberships
--   tenant_storage
--   retell_connections
--   agents
--
-- This schema remains centralized even when tenant application
-- data is moved into a dedicated schema or database.
-- ============================================================


SET SCHEMA 'shared';

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- USERS
--
-- Application-level identity.
--
-- Authentication credentials/tokens should be handled by the
-- authentication provider and should NOT be stored here.
-- ============================================================

CREATE TABLE users (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    email               text NOT NULL,
    display_name        text,

    is_active           boolean NOT NULL DEFAULT true,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unique
    ON users (lower(email));


-- ============================================================
-- TENANTS
--
-- A tenant represents an independent customer/account within
-- the application.
--
-- Slug is a URL friendly identifier for use in URLs, etc. An
-- example would be a acme_health for tenant Acme Health
-- ============================================================

CREATE TABLE tenants (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    name                text NOT NULL,
    slug                text NOT NULL,

    is_active           boolean NOT NULL DEFAULT true,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT tenants_slug_unique
        UNIQUE (slug)
);


-- ============================================================
-- MEMBERSHIPS
--
-- Many-to-many relationship between users and tenants.
--
-- A user can belong to multiple tenants.
-- A tenant can have multiple users.
--
-- The role applies ONLY within the associated tenant.
-- ============================================================

CREATE TABLE memberships (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id             uuid NOT NULL,
    tenant_id           uuid NOT NULL,

    role                text NOT NULL DEFAULT 'member',

    is_active           boolean NOT NULL DEFAULT true,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT memberships_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT memberships_tenant_fk
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE,

    CONSTRAINT memberships_user_tenant_unique
        UNIQUE (user_id, tenant_id),

    CONSTRAINT memberships_role_check
        CHECK (
            role IN (
                'owner',
                'admin',
                'member',
                'viewer'
            )
        )
);


-- ============================================================
-- TENANT STORAGE
--
-- Determines where tenant-specific operational data is stored.
--
-- storage_type:
--
--   shared
--       Tenant data lives in the common shared schema.
--
--   dedicated_schema
--       Tenant data lives in a tenant-specific PostgreSQL
--       schema.
--
--   dedicated_database
--       Tenant data lives in a separate PostgreSQL database.
--
-- IMPORTANT:
--   database_identifier is an opaque infrastructure identifier.
--   Do not store database credentials or connection strings here.
-- ============================================================

CREATE TABLE tenant_storage (
    tenant_id           uuid PRIMARY KEY,

    storage_type        text NOT NULL DEFAULT 'shared',

    schema_name         text,
    database_identifier text,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT tenant_storage_tenant_fk
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE,

    CONSTRAINT tenant_storage_type_check
        CHECK (
            storage_type IN (
                'shared',
                'dedicated_schema',
                'dedicated_database'
            )
        ),

    CONSTRAINT tenant_storage_location_check
        CHECK (
            (
                storage_type = 'shared'
                AND schema_name IS NULL
                AND database_identifier IS NULL
            )
            OR
            (
                storage_type = 'dedicated_schema'
                AND schema_name IS NOT NULL
                AND database_identifier IS NULL
            )
            OR
            (
                storage_type = 'dedicated_database'
                AND schema_name IS NULL
                AND database_identifier IS NOT NULL
            )
        )
);


-- ============================================================
-- RETELL CONNECTIONS
--
-- Represents the Retell account/connection associated with a
-- tenant.
--
-- A tenant may eventually have more than one Retell connection,
-- so this is intentionally a separate table rather than putting
-- Retell credentials directly on tenants.
--
-- DO NOT store the actual API secret in this table.
-- Store a reference to your secrets manager instead.
-- ============================================================

CREATE TABLE retell_connections (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id               uuid NOT NULL,

    name                    text NOT NULL DEFAULT 'Default',

    -- Opaque reference into your secrets manager.
    credentials_secret_ref  text NOT NULL,

    is_active               boolean NOT NULL DEFAULT true,

    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT retell_connections_tenant_fk
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE,

    CONSTRAINT retell_connections_tenant_name_unique
        UNIQUE (tenant_id, name)
);


CREATE INDEX retell_connections_tenant_id_idx
    ON retell_connections(tenant_id);


-- ============================================================
-- AGENTS
--
-- Maps our tenant-owned agent to the corresponding Retell
-- agent.
--
-- Agents remain in the central control plane because they are
-- needed to identify the tenant when processing Retell events.
-- ============================================================

CREATE TABLE agents (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id               uuid NOT NULL,
    retell_connection_id    uuid NOT NULL,

    retell_agent_id         text NOT NULL,

    name                    text,
    description             text,

    is_active               boolean NOT NULL DEFAULT true,

    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT agents_tenant_fk
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE,

    CONSTRAINT agents_retell_connection_fk
        FOREIGN KEY (retell_connection_id)
        REFERENCES retell_connections(id)
        ON DELETE RESTRICT,

    CONSTRAINT agents_tenant_retell_id_unique
        UNIQUE (tenant_id, retell_agent_id)
);


CREATE INDEX agents_tenant_id_idx
    ON agents(tenant_id);

CREATE INDEX agents_retell_connection_id_idx
    ON agents(retell_connection_id);


-- ============================================================
-- TRIGGER FUNCTION: updated_at
--
-- Keeps updated_at current whenever a row is modified.
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER tenants_set_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER memberships_set_updated_at
BEFORE UPDATE ON memberships
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER tenant_storage_set_updated_at
BEFORE UPDATE ON tenant_storage
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER retell_connections_set_updated_at
BEFORE UPDATE ON retell_connections
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER agents_set_updated_at
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE users IS
    'Application-level users. Authentication credentials are managed by the authentication provider.';

COMMENT ON TABLE tenants IS
    'Independent customer/account boundaries within the application.';

COMMENT ON TABLE memberships IS
    'Maps users to tenants and defines the user role within each tenant.';

COMMENT ON TABLE tenant_storage IS
    'Defines the physical storage strategy used for a tenant''s operational data.';

COMMENT ON TABLE retell_connections IS
    'Retell account/connection configuration associated with a tenant.';

COMMENT ON TABLE agents IS
    'Maps tenant-owned application agents to Retell agents.';

COMMENT ON COLUMN retell_connections.credentials_secret_ref IS
    'Opaque reference to credentials stored in an external secrets manager. Never store the actual secret here.';

COMMENT ON COLUMN tenant_storage.database_identifier IS
    'Opaque infrastructure identifier for the dedicated database. Never store credentials or connection strings here.';
