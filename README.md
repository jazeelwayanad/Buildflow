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
