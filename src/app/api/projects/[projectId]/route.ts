import { z } from "zod";
import { api } from "@/lib/api";
import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, context: Context) {
  const { projectId } = await context.params;
  return api(async () => {
    const { user, role } = await requireProject(projectId);
    const project = await db.project.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        modules: {
          orderBy: { position: "asc" },
          include: {
            pages: {
              orderBy: { position: "asc" },
              include: {
                sections: {
                  orderBy: { position: "asc" },
                  include: {
                    revisions: { orderBy: { version: "desc" }, take: 10 },
                  },
                },
              },
            },
          },
        },
        tasks: {
          orderBy: { createdAt: "desc" },
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            section: true,
            githubLink: true,
            dependencies: {
              include: {
                dependsOn: { select: { id: true, title: true, status: true } },
              },
            },
            dependedOnBy: {
              include: {
                task: { select: { id: true, title: true, status: true } },
              },
            },
            testCases: {
              include: { runs: { orderBy: { createdAt: "desc" }, take: 5 } },
            },
          },
        },
        bugs: {
          orderBy: { createdAt: "desc" },
          include: {
            assignee: { select: { id: true, name: true } },
            task: { select: { id: true, title: true } },
            section: { select: { id: true, title: true } },
          },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        invitations: {
          orderBy: { createdAt: "desc" },
        },
        decisions: {
          orderBy: { createdAt: "desc" },
        },
        activity: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { actor: { select: { name: true } } },
        },
      },
    });
    return Response.json({
      data: {
        ...project,
        viewer: { id: user.id, name: user.name, email: user.email, role },
      },
    });
  })(request);
}

export async function PATCH(request: Request, context: Context) {
  const { projectId } = await context.params;
  return api(async req => {
    const { user } = await requireProject(projectId, true, true);
    const input = z
      .object({
        name: z.string().trim().min(2).max(80),
        description: z.string().max(2000),
        stack: z.string().max(500),
        repositoryUrl: z.union([z.url(), z.literal("")]),
        developmentRules: z.string().max(10000),
      })
      .parse(await req.json());

    const project = await db.$transaction(async tx => {
      const result = await tx.project.update({
        where: { id: projectId },
        data: input,
      });
      await tx.activityLog.create({
        data: {
          projectId,
          actorId: user.id,
          action: "Updated project settings",
          entityType: "project",
          entityId: projectId,
        },
      });
      return result;
    });
    return Response.json({ data: project });
  })(request);
}
