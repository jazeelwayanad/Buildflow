# Roles and Workflow

## Roles
- Owner: project settings, membership, approval, priorities and release decisions.
- Developer: claim ready tasks, edit implementation notes, submit PR links.
- Designer/Content: contribute layouts, copy, assets, UX states.
- Finance: review financial business rules and calculations where applicable.
- QA/Security: test cases, bug tickets, security reviews and sign-off.

## Specification status
Draft → In Review → Approved → Superseded.

## Task status
Backlog → Ready → In Progress → Code Review → QA → Done.
Blocked is a separate flag/reason; rejected review returns task to In Progress.

## Rules
A task can become Ready only if specification is approved and dependencies are resolved. Claiming must be atomic. A task cannot become Done without required PR/review, passing checks, and QA acceptance. Changes to approved requirements create a revision and notify affected task owners.

## Handover
Record commit/PR URL, modified areas, migrations, test commands and results, open risks, and documentation updates.
