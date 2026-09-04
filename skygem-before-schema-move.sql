--
-- PostgreSQL database dump
--

\restrict hdcDTmidHOqbkvGokIhEvtPex1t25n12ge1DTQftgqOQtJ7WJNjGGfsG0hOenHl

-- Dumped from database version 15.19 (Debian 15.19-1.pgdg13+2)
-- Dumped by pg_dump version 15.19 (Debian 15.19-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: control_plane; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA control_plane;


ALTER SCHEMA control_plane OWNER TO postgres;

--
-- Name: shared; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA shared;


ALTER SCHEMA shared OWNER TO postgres;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: shared; Owner: postgres
--

CREATE FUNCTION shared.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION shared.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agents; Type: TABLE; Schema: shared; Owner: postgres
--

CREATE TABLE shared.agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    retell_connection_id uuid NOT NULL,
    retell_agent_id text NOT NULL,
    name text,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE shared.agents OWNER TO postgres;

--
-- Name: TABLE agents; Type: COMMENT; Schema: shared; Owner: postgres
--

COMMENT ON TABLE shared.agents IS 'Maps tenant-owned application agents to Retell agents.';


--
-- Name: memberships; Type: TABLE; Schema: shared; Owner: postgres
--

CREATE TABLE shared.memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT memberships_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text, 'viewer'::text])))
);


ALTER TABLE shared.memberships OWNER TO postgres;

--
-- Name: TABLE memberships; Type: COMMENT; Schema: shared; Owner: postgres
--

COMMENT ON TABLE shared.memberships IS 'Maps users to tenants and defines the user role within each tenant.';


--
-- Name: retell_connections; Type: TABLE; Schema: shared; Owner: postgres
--

CREATE TABLE shared.retell_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text DEFAULT 'Default'::text NOT NULL,
    credentials_secret_ref text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE shared.retell_connections OWNER TO postgres;

--
-- Name: TABLE retell_connections; Type: COMMENT; Schema: shared; Owner: postgres
--

COMMENT ON TABLE shared.retell_connections IS 'Retell account/connection configuration associated with a tenant.';


--
-- Name: COLUMN retell_connections.credentials_secret_ref; Type: COMMENT; Schema: shared; Owner: postgres
--

COMMENT ON COLUMN shared.retell_connections.credentials_secret_ref IS 'Opaque reference to credentials stored in an external secrets manager. Never store the actual secret here.';


--
-- Name: tenant_storage; Type: TABLE; Schema: shared; Owner: postgres
--

CREATE TABLE shared.tenant_storage (
    tenant_id uuid NOT NULL,
    storage_type text DEFAULT 'shared'::text NOT NULL,
    schema_name text,
    database_identifier text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenant_storage_location_check CHECK ((((storage_type = 'shared'::text) AND (schema_name IS NULL) AND (database_identifier IS NULL)) OR ((storage_type = 'dedicated_schema'::text) AND (schema_name IS NOT NULL) AND (database_identifier IS NULL)) OR ((storage_type = 'dedicated_database'::text) AND (schema_name IS NULL) AND (database_identifier IS NOT NULL)))),
    CONSTRAINT tenant_storage_type_check CHECK ((storage_type = ANY (ARRAY['shared'::text, 'dedicated_schema'::text, 'dedicated_database'::text])))
);


ALTER TABLE shared.tenant_storage OWNER TO postgres;

--
-- Name: TABLE tenant_storage; Type: COMMENT; Schema: shared; Owner: postgres
--

COMMENT ON TABLE shared.tenant_storage IS 'Defines the physical storage strategy used for a tenant''s operational data.';


--
-- Name: COLUMN tenant_storage.database_identifier; Type: COMMENT; Schema: shared; Owner: postgres
--

COMMENT ON COLUMN shared.tenant_storage.database_identifier IS 'Opaque infrastructure identifier for the dedicated database. Never store credentials or connection strings here.';


--
-- Name: tenants; Type: TABLE; Schema: shared; Owner: postgres
--

CREATE TABLE shared.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE shared.tenants OWNER TO postgres;

--
-- Name: TABLE tenants; Type: COMMENT; Schema: shared; Owner: postgres
--

COMMENT ON TABLE shared.tenants IS 'Independent customer/account boundaries within the application.';


--
-- Name: users; Type: TABLE; Schema: shared; Owner: postgres
--

CREATE TABLE shared.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    display_name text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE shared.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: shared; Owner: postgres
--

COMMENT ON TABLE shared.users IS 'Application-level users. Authentication credentials are managed by the authentication provider.';


--
-- Data for Name: agents; Type: TABLE DATA; Schema: shared; Owner: postgres
--

COPY shared.agents (id, tenant_id, retell_connection_id, retell_agent_id, name, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: memberships; Type: TABLE DATA; Schema: shared; Owner: postgres
--

COPY shared.memberships (id, user_id, tenant_id, role, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: retell_connections; Type: TABLE DATA; Schema: shared; Owner: postgres
--

COPY shared.retell_connections (id, tenant_id, name, credentials_secret_ref, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tenant_storage; Type: TABLE DATA; Schema: shared; Owner: postgres
--

COPY shared.tenant_storage (tenant_id, storage_type, schema_name, database_identifier, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: shared; Owner: postgres
--

COPY shared.tenants (id, name, slug, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: shared; Owner: postgres
--

COPY shared.users (id, email, display_name, is_active, created_at, updated_at) FROM stdin;
63a00460-097b-4d37-9684-9f3669cbf5ed	howie@skygem.ai	Howie Leicht	t	2026-09-02 19:32:39.888017+00	2026-09-02 19:32:39.888017+00
43c7151b-418d-4b3a-9b0b-e345c6a8530a	leichtsteven@gmail.com	Steven Leicht	t	2026-09-02 19:36:35.267107+00	2026-09-02 19:36:35.267107+00
31698115-f114-483e-a78c-fc992249a6fa	davidsox14@gmail.com	David Leicht	t	2026-09-02 19:37:29.550544+00	2026-09-02 20:08:33.192135+00
\.


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: agents agents_tenant_retell_id_unique; Type: CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.agents
    ADD CONSTRAINT agents_tenant_retell_id_unique UNIQUE (tenant_id, retell_agent_id);


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_user_tenant_unique; Type: CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.memberships
    ADD CONSTRAINT memberships_user_tenant_unique UNIQUE (user_id, tenant_id);


--
-- Name: retell_connections retell_connections_pkey; Type: CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.retell_connections
    ADD CONSTRAINT retell_connections_pkey PRIMARY KEY (id);


--
-- Name: retell_connections retell_connections_tenant_name_unique; Type: CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.retell_connections
    ADD CONSTRAINT retell_connections_tenant_name_unique UNIQUE (tenant_id, name);


--
-- Name: tenant_storage tenant_storage_pkey; Type: CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.tenant_storage
    ADD CONSTRAINT tenant_storage_pkey PRIMARY KEY (tenant_id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_unique; Type: CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.tenants
    ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: agents_retell_connection_id_idx; Type: INDEX; Schema: shared; Owner: postgres
--

CREATE INDEX agents_retell_connection_id_idx ON shared.agents USING btree (retell_connection_id);


--
-- Name: agents_tenant_id_idx; Type: INDEX; Schema: shared; Owner: postgres
--

CREATE INDEX agents_tenant_id_idx ON shared.agents USING btree (tenant_id);


--
-- Name: retell_connections_tenant_id_idx; Type: INDEX; Schema: shared; Owner: postgres
--

CREATE INDEX retell_connections_tenant_id_idx ON shared.retell_connections USING btree (tenant_id);


--
-- Name: users_email_unique; Type: INDEX; Schema: shared; Owner: postgres
--

CREATE UNIQUE INDEX users_email_unique ON shared.users USING btree (lower(email));


--
-- Name: agents agents_set_updated_at; Type: TRIGGER; Schema: shared; Owner: postgres
--

CREATE TRIGGER agents_set_updated_at BEFORE UPDATE ON shared.agents FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();


--
-- Name: memberships memberships_set_updated_at; Type: TRIGGER; Schema: shared; Owner: postgres
--

CREATE TRIGGER memberships_set_updated_at BEFORE UPDATE ON shared.memberships FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();


--
-- Name: retell_connections retell_connections_set_updated_at; Type: TRIGGER; Schema: shared; Owner: postgres
--

CREATE TRIGGER retell_connections_set_updated_at BEFORE UPDATE ON shared.retell_connections FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();


--
-- Name: tenant_storage tenant_storage_set_updated_at; Type: TRIGGER; Schema: shared; Owner: postgres
--

CREATE TRIGGER tenant_storage_set_updated_at BEFORE UPDATE ON shared.tenant_storage FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();


--
-- Name: tenants tenants_set_updated_at; Type: TRIGGER; Schema: shared; Owner: postgres
--

CREATE TRIGGER tenants_set_updated_at BEFORE UPDATE ON shared.tenants FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();


--
-- Name: users users_set_updated_at; Type: TRIGGER; Schema: shared; Owner: postgres
--

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON shared.users FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();


--
-- Name: agents agents_retell_connection_fk; Type: FK CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.agents
    ADD CONSTRAINT agents_retell_connection_fk FOREIGN KEY (retell_connection_id) REFERENCES shared.retell_connections(id) ON DELETE RESTRICT;


--
-- Name: agents agents_tenant_fk; Type: FK CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.agents
    ADD CONSTRAINT agents_tenant_fk FOREIGN KEY (tenant_id) REFERENCES shared.tenants(id) ON DELETE CASCADE;


--
-- Name: memberships memberships_tenant_fk; Type: FK CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.memberships
    ADD CONSTRAINT memberships_tenant_fk FOREIGN KEY (tenant_id) REFERENCES shared.tenants(id) ON DELETE CASCADE;


--
-- Name: memberships memberships_user_fk; Type: FK CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.memberships
    ADD CONSTRAINT memberships_user_fk FOREIGN KEY (user_id) REFERENCES shared.users(id) ON DELETE CASCADE;


--
-- Name: retell_connections retell_connections_tenant_fk; Type: FK CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.retell_connections
    ADD CONSTRAINT retell_connections_tenant_fk FOREIGN KEY (tenant_id) REFERENCES shared.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_storage tenant_storage_tenant_fk; Type: FK CONSTRAINT; Schema: shared; Owner: postgres
--

ALTER TABLE ONLY shared.tenant_storage
    ADD CONSTRAINT tenant_storage_tenant_fk FOREIGN KEY (tenant_id) REFERENCES shared.tenants(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict hdcDTmidHOqbkvGokIhEvtPex1t25n12ge1DTQftgqOQtJ7WJNjGGfsG0hOenHl

