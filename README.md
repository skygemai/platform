# SkyGem Platform Starter

This repository contains a React client portal, a TypeScript/Express API, shared
types, a PostgreSQL migration, and deployment templates. It is intentionally a
starter: review every integration and security setting before production use.

## Generate and install

The generator already created this directory. To install dependencies manually:

```bash
npm install
npm run typecheck
npm test
```

Copy `.env.example` to a protected environment file outside the repository. On
EC2, `/etc/skygem/skygem-api.env` is a reasonable location:

```bash
sudo install -d -m 750 -o root -g ec2-user /etc/skygem
sudo install -m 640 -o root -g ec2-user .env.example /etc/skygem/skygem-api.env
sudoedit /etc/skygem/skygem-api.env
```

Do not put production secrets in the example file. Prefer retrieving API keys
from AWS Secrets Manager through the EC2 instance role.

Install the RDS trust bundle at the path configured by `RDS_CA_PATH`:

```bash
curl -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
sudo install -m 644 global-bundle.pem /etc/skygem/global-bundle.pem
```

## Database

Review the migration before applying it. Then use `psql` with your RDS connection:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f apps/api/src/database/migrations/001_initial.sql
```

The application enforces tenant scoping in repositories. Every new query that
touches client data must include `tenant_id` in its filter. Consider PostgreSQL
row-level security as an additional defense after defining your database roles
and connection-pooling strategy.

## Create an agent action key

Generate a different random key for every agent configuration:

```bash
openssl rand -hex 32
```

Store only its SHA-256 hash in `agent_configurations.action_key_hash`:

```bash
printf '%s' 'THE_RANDOM_KEY' | sha256sum
```

Place the original key in the Retell custom-function header
`x-agent-action-key`. The API looks up the owning tenant from the hash, so the
agent is never allowed to choose a tenant ID.

Example action body:

```json
{
  "to": "+19195551212",
  "message": "Your appointment is confirmed.",
  "idempotencyKey": "0d60bb37-ed4a-4aba-9c7c-51f62ec1759f"
}
```

POST it to `/v1/agent-actions/send-text`. The included console SMS provider does
not send a real text. Implement `SmsProvider` with your selected vendor and
change provider construction in `apps/api/src/server.ts` before production.

## Authentication

Portal routes expect a Cognito access token. The Cognito JWT is verified first;
then `tenant-access.ts` maps the token subject to an active `app_users` row.
For local development only, the API accepts `x-dev-user-sub` instead of a token.
That shortcut is disabled automatically when `NODE_ENV=production`.

The React token function in `apps/portal/src/auth/token.ts` is an explicit
integration point. Replace it with your Cognito sign-in library before deploying
the portal.

## Deploy carefully

1. Build with `npm run build`.
2. Confirm the Node binary path with `command -v node` and edit the systemd template.
3. Confirm certificate paths in the Nginx template.
4. Ensure the Nginx user can traverse `/opt/skygem` and read the portal `dist` directory.
5. Copy templates to their active locations.
6. Run `sudo nginx -t` before reloading Nginx.
7. Start the new systemd service only after the existing API is backed up and
   you have confirmed there is no service-name or port conflict.

The generator does not activate either template, modify your current service,
or run the database migration.
