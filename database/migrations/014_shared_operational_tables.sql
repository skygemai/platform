BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS shared;

CREATE TABLE shared.agent_configurations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL
                            REFERENCES control_plane.tenants(id),

    retell_agent_id     text NOT NULL UNIQUE,
    display_name        text NOT NULL,
    action_key_hash     text NOT NULL UNIQUE,
    active              boolean NOT NULL DEFAULT true,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT agent_configurations_tenant_id_id_unique
        UNIQUE (tenant_id, id)
);

CREATE INDEX agent_configurations_tenant_id_idx
    ON shared.agent_configurations (tenant_id);


CREATE TABLE shared.calls (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   uuid NOT NULL
                                    REFERENCES control_plane.tenants(id),
    agent_configuration_id      uuid,

    external_call_id            text NOT NULL,
    started_at                  timestamptz NOT NULL,
    ended_at                    timestamptz,
    status                      text NOT NULL,
    direction                   text NOT NULL
                                    CHECK (direction IN ('inbound', 'outbound')),

    from_number                 text,
    to_number                   text,
    duration_seconds            integer
                                    CHECK (
                                        duration_seconds IS NULL
                                        OR duration_seconds >= 0
                                    ),

    summary                     text,
    transcript                  text,
    recording_object_key        text,

    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT calls_tenant_external_call_unique
        UNIQUE (tenant_id, external_call_id),

    CONSTRAINT calls_agent_configuration_tenant_fk
        FOREIGN KEY (tenant_id, agent_configuration_id)
        REFERENCES shared.agent_configurations (tenant_id, id)
);

CREATE INDEX calls_tenant_started_at_idx
    ON shared.calls (tenant_id, started_at DESC);

CREATE INDEX calls_agent_configuration_id_idx
    ON shared.calls (agent_configuration_id);


CREATE TABLE shared.messages (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   uuid NOT NULL
                                    REFERENCES control_plane.tenants(id),
    agent_configuration_id      uuid,

    to_number                   text NOT NULL,
    body                        text NOT NULL,
    status                      text NOT NULL
                                    CHECK (status IN ('queued', 'sent', 'failed')),
    source                      text NOT NULL
                                    CHECK (source IN ('portal', 'agent')),

    provider_message_id         text,
    failure_reason              text,
    idempotency_key             uuid NOT NULL,

    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT messages_tenant_idempotency_unique
        UNIQUE (tenant_id, idempotency_key),

    CONSTRAINT messages_agent_configuration_tenant_fk
        FOREIGN KEY (tenant_id, agent_configuration_id)
        REFERENCES shared.agent_configurations (tenant_id, id)
);

CREATE INDEX messages_tenant_created_at_idx
    ON shared.messages (tenant_id, created_at DESC);

CREATE INDEX messages_agent_configuration_id_idx
    ON shared.messages (agent_configuration_id);


CREATE TABLE shared.audit_events (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL
                            REFERENCES control_plane.tenants(id),

    action              text NOT NULL,
    actor_type          text NOT NULL
                            CHECK (actor_type IN ('user', 'agent', 'system')),
    actor_id            text NOT NULL,
    resource_type       text NOT NULL,
    resource_id         text NOT NULL,
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,

    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_tenant_created_at_idx
    ON shared.audit_events (tenant_id, created_at DESC);

COMMIT;