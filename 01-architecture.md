# Architecture

## Proposed stack
Next.js App Router + TypeScript; PostgreSQL; Prisma or Drizzle (choose one); Supabase Auth; Tailwind CSS + shadcn/ui; Tiptap editor.

## Application boundaries
- Server-side authorization on every project, section, task, attachment and bug request.
- All records scoped to an organization/project as appropriate.
- API contracts and validation schemas shared across server and client.
- Use transactions for task claiming and multi-record status transitions.
- Store attachment metadata in PostgreSQL and files in private object storage.
- Record important mutations in an immutable activity log.

## Deployment
Development, staging and production environments; CI runs typecheck, lint, unit and integration tests. Database migrations reviewed before deployment.

## API resource groups
`/api/projects`, `/api/projects/:id/members`, `/api/modules`, `/api/pages`, `/api/sections`, `/api/tasks`, `/api/bugs`, `/api/test-cases`, `/api/decisions`.

## Implementation note
This is a proposal; decide and freeze conventions before coding.
