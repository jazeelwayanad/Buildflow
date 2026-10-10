# BuildFlow — Project Specification

A script-first project manager for small AI-assisted SaaS development teams.

## Core workflow
Project → Module → Page → Section → Task → Pull Request → QA → Complete.

Each section is a complete specification, not just a task title. Developers can claim ready tasks independently, use AI coding assistants, and submit reviewed work.

## Documentation map
- `00-master-plan.md` — scope, principles, MVP
- `01-architecture.md` — technology and technical boundaries
- `02-roles-and-workflow.md` — team responsibilities and lifecycle
- `03-data-model.md` — entities and relationships
- `04-development-rules.md` — AI, Git, testing and security
- `modules/` — page-by-page functional scripts
- `tasks/` — initial implementation backlog

## Suggested implementation order
Foundation → Authentication → Projects → Script Editor → Task Board → QA → Dashboard → Settings.

Every task requires an approved specification, an owner, tests, review, and a documented handoff.

## Run the application

```bash
npm ci
docker compose up -d db
# Copy .env.example to .env and use the local database URL.
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`, create an account, then add modules, pages, sections, and tasks. All workspace data is stored in PostgreSQL. Sessions use HTTP-only cookies and stored token digests; project membership is checked on every data endpoint. The first account creates its own workspace and project. Team members must register before an owner adds them to a project.

### Vercel with Prisma Postgres

1. In Prisma Console, create a PostgreSQL database and obtain its **direct PostgreSQL connection string** (`postgresql://...`), including the provided TLS options.
2. Set `DATABASE_URL` in Vercel environment settings for the intended environments. Never use a `NEXT_PUBLIC_` variable for database credentials. Preview deployments should use a separate development database.
3. From a trusted machine, set the same connection through a secure environment variable and run `npm run db:migrate` to apply the checked-in migrations. This command preserves existing rows; review migrations before applying them to production.
4. Deploy this branch with build command `npm run build`. Prisma Client is generated during the build. Database migrations are intentionally separate from the build.
5. Open `/login` and create your account. `/projects` lists only projects you belong to. The old `/projects/buildflow/dashboard` demo URL is replaced by your actual project URL after sign-in.

Use a direct connection URL for this implementation; a `prisma+postgres://` Accelerate URL requires the Accelerate client extension and is not interchangeable with a direct migration URL.

To test persistence locally, run a development server on a disposable database, then `TEST_BASE_URL=http://127.0.0.1:3000 npm run test:db`. This creates test workspaces and records and never targets a remote host. It tests authentication, tenant isolation, revision conflict detection, concurrent claiming, stored QA gates, bugs, and logout.

Browser test: `npx playwright install chromium`, then `TEST_BASE_URL=http://localhost:3000 npm run test:ui`. To use an existing Chromium installation, also set `CHROMIUM_PATH=/path/to/chromium`. Use `localhost` when testing Next.js development mode to avoid its cross-origin resource restrictions. For deployment-like testing, build and start the production server before running the browser test.

Current limitations: password reset/email verification, invitation emails, attachments, and dependency editing are not implemented. Existing accounts can be added to projects by the owner. The database schema retains task dependencies; completion and claiming enforce any stored dependencies. Deploy behind HTTPS, and configure email/account recovery before wider use.

Quality checks: `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
