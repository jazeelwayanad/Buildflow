# Module 03 — Application Script (Core Feature)

## Page: Script Explorer `/projects/:projectId/script`
Sections: module/page/section tree; create and reorder controls; search.
Actions: add/edit/reorder modules, pages and sections; open section editor.
Acceptance: hierarchy persists, stable IDs, permission checks, safe concurrent edits.

## Page: Section Detail `/projects/:projectId/script/sections/:sectionId`
Tabs: Script; Development; Testing; Activity.
Script fields: objective, UI layout, copy/assets, user actions, validation, business rules, data requirements, API contracts, states (loading/empty/error), accessibility, dependencies, acceptance criteria.
Actions: save draft; submit for review; approve revision; create development task; copy AI prompt.
Acceptance: only approved revisions create Ready tasks; revisions are traceable; approval permissions enforced.

## Page: Page Overview `/projects/:projectId/script/pages/:pageId`
Sections: page purpose, route, layout, navigation, ordered sections, page-wide behavior and dependencies.
Acceptance: links to all child sections; progress computed from accepted tasks.

## AI Prompt Composer
Combine project rules, task scope, approved section revision, dependencies, acceptance criteria and handoff format. Allow copying; never include credentials or secret values.
