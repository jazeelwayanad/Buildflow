# Data Model

## Core tables
- users(id, name, email)
- organizations(id, name, created_by)
- organization_members(id, organization_id, user_id, role)
- projects(id, organization_id, name, description, status)
- project_members(id, project_id, user_id, role)
- modules(id, project_id, name, position)
- pages(id, module_id, name, route, position)
- sections(id, page_id, title, position, specification_json, spec_status, version)
- features(id, section_id, title, description)
- tasks(id, project_id, section_id, title, status, blocked_reason, assignee_id, priority)
- task_dependencies(task_id, depends_on_task_id)
- test_cases(id, task_id, title, steps, expected_result)
- test_runs(id, test_case_id, status, tested_by, notes)
- bugs(id, project_id, task_id, title, severity, status, reproduction_steps)
- decisions(id, project_id, title, rationale, decided_by)
- comments(id, author_id, entity_type, entity_id, body)
- attachments(id, project_id, entity_type, entity_id, storage_key)
- activity_logs(id, project_id, actor_id, action, entity_type, entity_id, metadata, created_at)
- github_links(id, task_id, branch, pr_url, commit_sha)

## Constraints
Unique project/member pairs; ordered page/section positions; foreign keys and indexes for project and status queries; task dependencies cannot point to self; prevent cycles in application logic. Enforce tenant access in services and database policy where supported.

## Open decisions
Soft deletion and retention; rich-text JSON format; audit retention; full-text search strategy.
