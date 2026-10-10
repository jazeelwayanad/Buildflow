export const taskTransitions: Record<string, string[]> = {
  BACKLOG: ["READY"], READY: ["IN_PROGRESS"], IN_PROGRESS: ["CODE_REVIEW"],
  CODE_REVIEW: ["IN_PROGRESS", "QA"], QA: ["IN_PROGRESS", "DONE"], DONE: ["QA"],
};

export function canTransition(from: string, to: string, gates: { approvedSpec?: boolean; hasPullRequest?: boolean; testsPassed?: boolean; qaAccepted?: boolean } = {}) {
  if (!taskTransitions[from]?.includes(to)) return { ok: false, reason: "Invalid status transition" };
  if (to === "READY" && !gates.approvedSpec) return { ok: false, reason: "The specification must be approved" };
  if (to === "QA" && !gates.hasPullRequest) return { ok: false, reason: "A pull request is required" };
  if (to === "DONE" && (!gates.testsPassed || !gates.qaAccepted)) return { ok: false, reason: "Passing tests and QA acceptance are required" };
  return { ok: true };
}

export function canClaim(task: { status: string; assigneeId?: string | null; blockedReason?: string | null }, dependenciesDone: boolean) {
  if (task.status !== "READY") return { ok: false, reason: "Only ready tasks can be claimed" };
  if (task.assigneeId) return { ok: false, reason: "Task is already assigned" };
  if (task.blockedReason) return { ok: false, reason: "Blocked tasks cannot be claimed" };
  if (!dependenciesDone) return { ok: false, reason: "Dependencies are incomplete" };
  return { ok: true };
}
