BEGIN;

-- An incoming Retell webhook identifies the Retell agent, but not the SkyGem
-- storage schema. This control-plane table provides that first routing hop.
CREATE TABLE control_plane.retell_agent_routes (
    retell_agent_id             text PRIMARY KEY,
    tenant_id                   uuid NOT NULL
                                    REFERENCES control_plane.tenants(id)
                                    ON DELETE CASCADE,
    agent_configuration_id      uuid NOT NULL,
    is_active                   boolean NOT NULL DEFAULT true,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT retell_agent_routes_tenant_configuration_unique
        UNIQUE (tenant_id, agent_configuration_id)
);

CREATE INDEX retell_agent_routes_tenant_id_idx
    ON control_plane.retell_agent_routes (tenant_id);

-- Backfill the shared operational schema. Dedicated-schema agents will be
-- registered automatically by AgentConfigurationsRepository after deployment.
INSERT INTO control_plane.retell_agent_routes (
    retell_agent_id,
    tenant_id,
    agent_configuration_id,
    is_active
)
SELECT
    retell_agent_id,
    tenant_id,
    id,
    active
FROM shared.agent_configurations
ON CONFLICT (retell_agent_id) DO UPDATE
SET tenant_id = EXCLUDED.tenant_id,
    agent_configuration_id = EXCLUDED.agent_configuration_id,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Retell can retry lifecycle events. This table makes event processing
-- idempotent without retaining the webhook body or other sensitive content.
CREATE TABLE control_plane.retell_webhook_receipts (
    event_type                  text NOT NULL
                                    CHECK (event_type IN ('call_ended', 'call_analyzed')),
    external_call_id            text NOT NULL,
    tenant_id                   uuid NOT NULL
                                    REFERENCES control_plane.tenants(id)
                                    ON DELETE CASCADE,
    processed_at                timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT retell_webhook_receipts_pk
        PRIMARY KEY (event_type, external_call_id)
);

CREATE INDEX retell_webhook_receipts_tenant_processed_idx
    ON control_plane.retell_webhook_receipts (tenant_id, processed_at DESC);

COMMIT;
