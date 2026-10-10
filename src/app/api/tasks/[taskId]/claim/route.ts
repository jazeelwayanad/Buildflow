import { api } from "@/lib/api";
import { ApiError, requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  return api(async () => {
    const task = await db.task.findUnique({ where: { id: taskId }, include: { dependencies: { include: { dependsOn: true } } } });
    if (!task) throw new ApiError(404, "Task not found");
    const { user, role } = await requireProject(task.projectId, true);
    if (!["OWNER", "DEVELOPER"].includes(role)) throw new ApiError(403, "Developer permission required");
    if (task.dependencies.some(d => d.dependsOn.status !== "DONE")) throw new ApiError(409, "Dependencies are incomplete");
    await db.$transaction(async tx => {
      const changed = await tx.task.updateMany({ where: { id: taskId, status: "READY", assigneeId: null, blockedReason: null }, data: { assigneeId: user.id, status: "IN_PROGRESS" } });
      if (!changed.count) throw new ApiError(409, "This task is blocked or already claimed");
      await tx.activityLog.create({ data: { projectId: task.projectId, actorId: user.id, action: `Claimed ${task.title}`, entityType: "task", entityId: taskId } });
    });
    return Response.json({ data: { id: taskId } });
  })(request);
}
