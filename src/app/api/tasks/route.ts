import { z } from "zod";
import { api } from "@/lib/api";
import { ApiError, requireProject, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
export const GET = api(async request => {
  const user = await requireUser();
  const projectId = new URL(request.url).searchParams.get("projectId") ?? undefined;
  return Response.json({ data: await db.task.findMany({ where: { projectId, project: { members: { some: { userId: user.id } } } } }) });
});
export const POST = api(async request => {
  const input = z.object({
    projectId: z.string().min(1),
    sectionId: z.string().optional(),
    title: z.string().trim().min(3).max(160),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    status: z.enum(["BACKLOG", "READY", "IN_PROGRESS", "CODE_REVIEW", "QA", "DONE"]).optional(),
  }).parse(await request.json());
  const { user } = await requireProject(input.projectId, true);
  const section = input.sectionId ? await db.section.findFirst({ where: { id: input.sectionId, page: { module: { projectId: input.projectId } } } }) : null;
  if (input.sectionId && !section) throw new ApiError(404, "Section not found");
  const task = await db.$transaction(async tx => {
    const defaultStatus = section?.specStatus === "APPROVED" ? "READY" : "BACKLOG";
    const result = await tx.task.create({ data: { ...input, status: input.status ?? defaultStatus } });
    await tx.activityLog.create({ data: { projectId: input.projectId, actorId: user.id, action: `Created task: ${input.title}`, entityType: "task", entityId: result.id } });
    return result;
  });
  return Response.json({ data: task }, { status: 201 });
});
