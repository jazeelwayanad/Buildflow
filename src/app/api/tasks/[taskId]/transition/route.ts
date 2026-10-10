import { z } from "zod";
import { api } from "@/lib/api";
import { ApiError, requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { canTransition } from "@/lib/workflow";
export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  return api(async req => {
    const input = z.object({ to: z.enum(["BACKLOG", "READY", "IN_PROGRESS", "CODE_REVIEW", "QA", "DONE"]) }).parse(await req.json());
    const existing = await db.task.findUnique({ where: { id: taskId } });
    if (!existing) throw new ApiError(404, "Task not found");
    const { user, role } = await requireProject(existing.projectId, true);
    return db.$transaction(async tx => {
      const task = await tx.task.findUniqueOrThrow({ where: { id: taskId }, include: { section: true, githubLink: true, dependencies: { include: { dependsOn: true } }, testCases: { include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } } } } });
      if (role !== "OWNER" && task.assigneeId !== user.id && role !== "QA") throw new ApiError(403, "Task owner or reviewer permission required");
      if (input.to === "DONE" && !["OWNER", "QA"].includes(role)) throw new ApiError(403, "QA permission required");
      const result = canTransition(task.status, input.to, { approvedSpec: task.section?.specStatus === "APPROVED", hasPullRequest: Boolean(task.githubLink?.prUrl), testsPassed: task.testCases.length > 0 && task.testCases.every(t => t.runs[0]?.status === "PASSED"), qaAccepted: task.qaAccepted });
      if (!result.ok) throw new ApiError(409, result.reason!);
      if (task.blockedReason || task.dependencies.some(d => d.dependsOn.status !== "DONE")) throw new ApiError(409, "Resolve blockers and dependencies first");
      const changed = await tx.task.updateMany({ where: { id: taskId, status: task.status }, data: { status: input.to } });
      if (!changed.count) throw new ApiError(409, "Task changed; reload and try again");
      await tx.activityLog.create({ data: { projectId: task.projectId, actorId: user.id, action: `${task.title}: ${input.to}`, entityType: "task", entityId: taskId } });
      return Response.json({ data: { id: taskId, status: input.to } });
    });
  })(request);
}
