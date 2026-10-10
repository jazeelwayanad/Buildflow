import { z } from "zod";
import { api } from "@/lib/api";
import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
type Context = { params: Promise<{ projectId: string }> };
export async function GET(request: Request, context: Context) {
  const { projectId } = await context.params;
  return api(async () => {
    const { user, role } = await requireProject(projectId);
    const project = await db.project.findUniqueOrThrow({ where: { id: projectId }, include: {
      modules: { orderBy: { position: "asc" }, include: { pages: { orderBy: { position: "asc" }, include: { sections: { orderBy: { position: "asc" } } } } } },
      tasks: { orderBy: { createdAt: "desc" }, include: { assignee: { select: { id: true, name: true } }, section: true, githubLink: true, testCases: { include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } } } } },
      bugs: { orderBy: { createdAt: "desc" } }, members: { include: { user: { select: { id: true, name: true, email: true } } } },
      activity: { orderBy: { createdAt: "desc" }, take: 20, include: { actor: { select: { name: true } } } }, decisions: true,
    } });
    return Response.json({ data: { ...project, viewer: { id: user.id, name: user.name, role } } });
  })(request);
}
export async function PATCH(request: Request, context: Context) {
  const { projectId } = await context.params;
  return api(async req => {
    const { user } = await requireProject(projectId, true, true);
    const input = z.object({ name: z.string().trim().min(2).max(80), description: z.string().max(2000), stack: z.string().max(500), repositoryUrl: z.union([z.url(), z.literal("")]), developmentRules: z.string().max(10000) }).parse(await req.json());
    const project = await db.$transaction(async tx => {
      const result = await tx.project.update({ where: { id: projectId }, data: input });
      await tx.activityLog.create({ data: { projectId, actorId: user.id, action: "Updated project settings", entityType: "project", entityId: projectId } });
      return result;
    });
    return Response.json({ data: project });
  })(request);
}
