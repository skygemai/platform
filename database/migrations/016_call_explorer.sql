BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS shared;

CREATE TABLE IF NOT EXISTS shared.agent_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES control_plane.tenants(id) ON DELETE CASCADE,
  retell_agent_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  action_key_hash TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS agent_configurations_tenant_id_idx
  ON shared.agent_configurations (tenant_id);

CREATE TABLE IF NOT EXISTS shared.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES control_plane.tenants(id) ON DELETE CASCADE,
  agent_configuration_id UUID,
  external_call_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT,
  to_number TEXT,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  summary TEXT,
  transcript TEXT,
  recording_object_key TEXT,
  sentiment TEXT,
  call_successful BOOLEAN,
  disconnection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, external_call_id),
  FOREIGN KEY (tenant_id, agent_configuration_id)
    REFERENCES shared.agent_configurations (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS calls_tenant_started_at_idx
  ON shared.calls (tenant_id, started_at DESC);

CREATE TABLE IF NOT EXISTS control_plane.tenant_data_locations (
  tenant_id UUID PRIMARY KEY REFERENCES control_plane.tenants(id) ON DELETE CASCADE,
  storage_type TEXT NOT NULL DEFAULT 'shared'
    CHECK (storage_type IN ('shared', 'dedicated_schema')),
  schema_name TEXT NOT NULL DEFAULT 'shared'
    CHECK (schema_name ~ '^[a-z][a-z0-9_]{0,62}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (storage_type = 'shared' AND schema_name = 'shared') OR
    (storage_type = 'dedicated_schema' AND schema_name <> 'shared')
  )
);

INSERT INTO control_plane.tenant_data_locations (tenant_id)
SELECT id FROM control_plane.tenants
ON CONFLICT (tenant_id) DO NOTHING;

CREATE OR REPLACE FUNCTION control_plane.create_default_tenant_data_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO control_plane.tenant_data_locations (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenants_default_data_location ON control_plane.tenants;
CREATE TRIGGER tenants_default_data_location
AFTER INSERT ON control_plane.tenants
FOR EACH ROW EXECUTE FUNCTION control_plane.create_default_tenant_data_location();

ALTER TABLE shared.calls
  ADD COLUMN IF NOT EXISTS sentiment TEXT,
  ADD COLUMN IF NOT EXISTS call_successful BOOLEAN,
  ADD COLUMN IF NOT EXISTS disconnection_reason TEXT;

CREATE INDEX IF NOT EXISTS calls_tenant_agent_started_idx
  ON shared.calls (tenant_id, agent_configuration_id, started_at DESC);

COMMIT;
