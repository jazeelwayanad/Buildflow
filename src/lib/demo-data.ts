export const project = {
  id: "buildflow",
  name: "BuildFlow",
  description: "Script-first delivery for focused product teams.",
  progress: 68,
};

export const tasks = [
  { id: "BF-142", title: "Atomic task claiming", status: "Ready", priority: "High", owner: "Unassigned", module: "Tasks" },
  { id: "BF-137", title: "Section revision history", status: "In progress", priority: "High", owner: "Maya", module: "Script" },
  { id: "BF-131", title: "Project permissions", status: "Code review", priority: "Medium", owner: "Noah", module: "Projects" },
  { id: "BF-128", title: "Invitation acceptance", status: "QA", priority: "Medium", owner: "Ava", module: "Auth" },
  { id: "BF-119", title: "Workspace navigation", status: "Done", priority: "Low", owner: "Liam", module: "Core" },
  { id: "BF-146", title: "QA evidence upload", status: "Backlog", priority: "Medium", owner: "Unassigned", module: "QA" },
];

export const modules = [
  { name: "Authentication", progress: 92, pages: ["Login", "Invitations", "Account"] },
  { name: "Projects", progress: 78, pages: ["Project list", "Project overview"] },
  { name: "Application Script", progress: 64, pages: ["Script explorer", "Section detail", "Page overview"] },
  { name: "Development Tasks", progress: 55, pages: ["Task board", "Task detail"] },
  { name: "QA & Bugs", progress: 42, pages: ["QA queue", "Bugs"] },
  { name: "Team & Settings", progress: 70, pages: ["Team", "Settings", "Decisions"] },
];

export const activity = [
  { who: "Maya Chen", action: "submitted Section revision history for review", time: "12 min ago", color: "#8b5cf6" },
  { who: "Noah Williams", action: "linked pull request #84", time: "34 min ago", color: "#0ea5e9" },
  { who: "Ava Patel", action: "passed 6 test cases for BF-128", time: "1 hr ago", color: "#10b981" },
  { who: "Liam Davis", action: "approved the Workspace navigation spec", time: "3 hrs ago", color: "#f59e0b" },
];

export const team = [
  { name: "Maya Chen", email: "maya@buildflow.dev", role: "Owner", workload: 4, initials: "MC", color: "violet" },
  { name: "Noah Williams", email: "noah@buildflow.dev", role: "Developer", workload: 3, initials: "NW", color: "blue" },
  { name: "Ava Patel", email: "ava@buildflow.dev", role: "QA / Security", workload: 2, initials: "AP", color: "emerald" },
  { name: "Liam Davis", email: "liam@buildflow.dev", role: "Designer", workload: 2, initials: "LD", color: "amber" },
];
