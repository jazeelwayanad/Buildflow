# Initial Development Backlog

| ID | Task | Depends on | Completion evidence |
|---|---|---|---|
| CORE-001 | App scaffold, CI, conventions | — | CI passes |
| CORE-002 | Database schema and migrations | CORE-001 | Migration tests |
| AUTH-001 | Auth and roles | CORE-002 | Permission tests |
| PROJ-001 | Create/list projects | AUTH-001 | CRUD tests |
| SCRIPT-001 | Module/page/section tree | PROJ-001 | Reorder tests |
| SCRIPT-002 | Rich section editor | SCRIPT-001 | Save/version tests |
| SCRIPT-003 | Specification approval | SCRIPT-002 | Role/transition tests |
| TASK-001 | Task creation and board | SCRIPT-003 | Status tests |
| TASK-002 | Atomic claiming and dependencies | TASK-001 | Concurrency tests |
| TASK-003 | AI prompt composer | TASK-001 | Prompt snapshot tests |
| QA-001 | Test cases and QA queue | TASK-001 | Review gate tests |
| BUG-001 | Bug reports and retesting | QA-001 | Bug lifecycle tests |
| DASH-001 | Progress dashboard | TASK-001 | Aggregate tests |
| TEAM-001 | Team management | AUTH-001 | Invite/revoke tests |
| SET-001 | Settings and decisions | PROJ-001 | Permission tests |

Each ticket must link to its approved section specification before implementation.
