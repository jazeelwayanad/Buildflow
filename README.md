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
npm install
npm run dev
```

Open `http://localhost:3000`. The included demo workspace exercises the full interface without external services. For database-backed development, copy `.env.example` to `.env.local`, configure PostgreSQL, then run `npm run db:generate` and `npm run db:push`.

Quality checks: `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
