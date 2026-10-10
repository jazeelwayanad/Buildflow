# Module 04 — Development Tasks

## Page: Task Board `/projects/:projectId/tasks`
Views: Kanban and list; filters by owner, status, priority, module.
Actions: create task from approved section; claim available task; assign; change status; add dependency.
Acceptance: atomic claiming, blocked tasks not claimable, no unauthorized reassignment.

## Page: Task Detail `/projects/:projectId/tasks/:taskId`
Sections: linked specification revision, assignee, checklist, dependencies, comments, branch/PR links, implementation handoff.
Actions: claim, start, request review, send to QA, complete after gates, reopen.
Acceptance: status transition validation; activity history; required review and test gates.
