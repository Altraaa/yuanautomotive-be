# Yuan Dewata Automotive — Backend (NestJS)

Production-oriented backend for the EV spareparts Company Profile + Catalog +
Leads + Pre-order platform. Built to the contract in `../automotive-fe`
(`lib/endpoint.ts`) so the FE only swaps its mock service for `apiClient`.

**Stack:** NestJS 10 · TypeScript (strict) · TypeORM · MySQL 8 · JWT (access+refresh)
· class-validator · Swagger · Terminus · Throttler · Pino.

> Architecture rules live in `../automotive-fe/CLAUDE.md` (single source of truth).
> ORM/DB follow CLAUDE.md (**TypeORM + MySQL**, JSON columns); the JSON wire shape
> follows the FE guide (`snake_case`, `price` as string, slug lookups, `meta` envelope).

## Quick start

```bash
cp .env.example .env          # then fill in secrets
npm install

# create the initial migration from the entities, then run it
npm run migration:generate -- src/database/migrations/InitialSchema
npm run migration:run

npm run seed                  # 1 super-admin + 3 categories
npm run start:dev             # http://localhost:3001  ·  Swagger at /docs
```

Local dev reaches VPS MySQL through an SSH tunnel:

```bash
ssh -L 3307:localhost:3306 user@vps   # then DB_HOST=127.0.0.1, DB_PORT=3307
```

## Conventions (must not drift from the FE contract)

- **No** global `/api` prefix and **no** version segment in routes (`GLOBAL_PREFIX=` empty).
- Public detail by **slug** (`/products/slug/:slug`); admin by **uuid**.
- Responses are `snake_case`; `price` and money are **strings**; dates are ISO.
- Lists return `{ items, meta: { total, page, limit, total_pages } }`.
- Errors use the NestJS default shape `{ statusCode, message, error }`.
- After every admin write the service fires the FE ISR webhook
  (`POST {FRONTEND_URL}/api/revalidate?tag=…&secret=…`) — fire-and-forget.

## Layout

```
src/
├── common/      BaseEntity, enums, guards, filters, decorators, dto, RevalidateService
├── config/      @nestjs/config + Joi schema
├── database/    DataSource, migrations, seeds
└── modules/     auth users categories products blog contacts orders media cms
                 notifications dashboard health
```

## Migrations

`synchronize` is **false** everywhere. Generate reversible migrations from entity
changes and run them explicitly:

```bash
npm run migration:generate -- src/database/migrations/<Name>
npm run migration:run
npm run migration:revert      # roll back the last one
```

## Docker

App runs in a container; **MySQL + Nginx + Certbot on the host**.

```bash
docker compose up -d --build
```

`.env` is injected via `env_file` (never baked into the image). `/health` backs the
container healthcheck.

## Auth roles

- `SUPERADMIN` — user management + destructive ops (bulk/hard deletes).
- `ADMIN` — content + leads/orders management.

Seed admin defaults come from `SEED_ADMIN_*` env keys.
