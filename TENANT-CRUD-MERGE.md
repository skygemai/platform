# Tenant CRUD merge

This package contains the files needed to add local tenant management to the existing SkyGem platform.

## Apply

From the directory containing this extracted package, copy its `apps` folder over the matching `apps` folder in your SkyGem `platform` project. Review the changes with Git before committing.

No environment files, credentials, dependency manifests, database migrations, or generated build output are included in the merge overlay.

## Routes

- Portal page: `/tenants`
- Tenant API: `/api/tenants`

The API supports list, create, update, and delete. A tenant with memberships, storage configuration, Retell connections, or agents cannot be deleted; deactivate it instead.

## Validate in the complete platform project

```bash
npm run typecheck
npm run build
npm run dev:api
```

In another terminal:

```bash
npm run dev:portal
```

Open `http://localhost:5173/tenants`.

## Security boundary

The `/api/tenants` routes are intentionally unauthenticated for local development. Do not deploy them to AWS in this state. Move them behind the planned SkyGem administrator authentication and authorization middleware before deployment.
