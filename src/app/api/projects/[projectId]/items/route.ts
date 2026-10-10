import { z } from "zod";
import { api } from "@/lib/api";
import { ApiError, requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
const input = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("module"), name: z.string().trim().min(2).max(100) }),
  z.object({ kind: z.literal("page"), moduleId: z.string(), name: z.string().trim().min(2).max(100), route: z.string().max(200) }),
  z.object({ kind: z.literal("section"), pageId: z.string(), title: z.string().trim().min(2).max(160) }),
  z.object({ kind: z.literal("spec"), id: z.string(), version: z.number().int(), objective: z.string().max(10000), actions: z.string().max(10000), rules: z.string().max(10000), criteria: z.string().max(10000), status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED"]) }),
  z.object({ kind: z.literal("bug"), title: z.string().trim().min(3).max(160), severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), reproductionSteps: z.string().min(3).max(10000) }),
  z.object({ kind: z.literal("bugStatus"), id: z.string(), status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "VERIFIED"]) }),
  z.object({ kind: z.literal("member"), email: z.email(), role: z.enum(["OWNER", "DEVELOPER", "DESIGNER", "FINANCE", "QA"]) }),
  z.object({ kind: z.literal("test"), taskId: z.string(), title: z.string().min(3).max(160), steps: z.string().max(10000), expectedResult: z.string().max(10000) }),
  z.object({ kind: z.literal("run"), id: z.string(), status: z.enum(["PASSED", "FAILED"]), notes: z.string().max(10000) }),
  z.object({ kind: z.literal("pr"), taskId: z.string(), prUrl: z.url(), branch: z.string().max(200) }),
  z.object({ kind: z.literal("accept"), taskId: z.string(), accepted: z.boolean() }),
]);
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return api(async req => {
    const data = input.parse(await req.json());
    const { user, role } = await requireProject(projectId, true, data.kind === "member");
    const result = await db.$transaction(async tx => {
      let result: { id?: string };
      const taskInProject = async (id: string) => {
        const task = await tx.task.findFirst({ where: { id, projectId } });
        if (!task) throw new ApiError(404, "Task not found");
        return task;
      };
      switch (data.kind) {
        case "module": result = await tx.module.create({ data: { projectId, name: data.name, position: await tx.module.count({ where: { projectId } }) } }); break;
        case "page": {
          if (!await tx.module.findFirst({ where: { id: data.moduleId, projectId } })) throw new ApiError(404, "Module not found");
          result = await tx.page.create({ data: { moduleId: data.moduleId, name: data.name, route: data.route, position: await tx.page.count({ where: { moduleId: data.moduleId } }) } }); break;
        }
        case "section": {
          if (!await tx.page.findFirst({ where: { id: data.pageId, module: { projectId } } })) throw new ApiError(404, "Page not found");
          result = await tx.section.create({ data: { pageId: data.pageId, title: data.title, specification: { objective: "", actions: "", rules: "", criteria: "" }, position: await tx.section.count({ where: { pageId: data.pageId } }) } }); break;
        }
        case "spec": {
          if (data.status === "APPROVED" && role !== "OWNER") throw new ApiError(403, "Only owners can approve specifications");
          const section = await tx.section.findFirst({ where: { id: data.id, page: { module: { projectId } } } });
          if (!section) throw new ApiError(404, "Section not found");
          await tx.sectionRevision.create({ data: { sectionId: section.id, version: section.version, specification: section.specification ?? {}, specStatus: section.specStatus } });
          const changed = await tx.section.updateMany({ where: { id: data.id, version: data.version }, data: { specification: { objective: data.objective, actions: data.actions, rules: data.rules, criteria: data.criteria }, version: { increment: 1 }, specStatus: data.status } });
          if (!changed.count) throw new ApiError(409, "Specification changed; reload before saving");
          result = { id: data.id }; break;
        }
        case "bug": result = await tx.bug.create({ data: { projectId, title: data.title, severity: data.severity, reproductionSteps: data.reproductionSteps } }); break;
        case "bugStatus": {
          if (data.status === "VERIFIED" && !["OWNER", "QA"].includes(role)) throw new ApiError(403, "QA permission required");
          const changed = await tx.bug.updateMany({ where: { id: data.id, projectId }, data: { status: data.status } });
          if (!changed.count) throw new ApiError(404, "Bug not found");
          result = { id: data.id }; break;
        }
        case "member": {
          const target = await tx.user.findUnique({ where: { email: data.email.toLowerCase() } });
          if (!target) throw new ApiError(404, "Ask this person to create an account first");
          const existing = await tx.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: target.id } } });
          if (existing?.role === "OWNER" && data.role !== "OWNER" && await tx.projectMember.count({ where: { projectId, role: "OWNER" } }) === 1) throw new ApiError(409, "Keep at least one project owner");
          result = await tx.projectMember.upsert({ where: { projectId_userId: { projectId, userId: target.id } }, create: { projectId, userId: target.id, role: data.role }, update: { role: data.role } }); break;
        }
        case "test": {
          await taskInProject(data.taskId);
          if (!["OWNER", "QA"].includes(role)) throw new ApiError(403, "QA permission required");
          result = await tx.testCase.create({ data: { taskId: data.taskId, title: data.title, steps: data.steps, expectedResult: data.expectedResult } }); break;
        }
        case "run": {
          if (!["OWNER", "QA"].includes(role)) throw new ApiError(403, "QA permission required");
          const test = await tx.testCase.findFirst({ where: { id: data.id, task: { projectId } } });
          if (!test) throw new ApiError(404, "Test not found");
          result = await tx.testRun.create({ data: { testCaseId: data.id, status: data.status, notes: data.notes, testedBy: user.id } });
          await tx.task.update({ where: { id: test.taskId }, data: { qaAccepted: false } }); break;
        }
        case "pr": {
          const task = await taskInProject(data.taskId);
          if (role !== "OWNER" && task.assigneeId !== user.id) throw new ApiError(403, "Task owner permission required");
          if (!data.prUrl.startsWith("https://")) throw new ApiError(400, "Use an HTTPS pull request URL");
          result = await tx.githubLink.upsert({ where: { taskId: data.taskId }, create: { taskId: data.taskId, branch: data.branch, prUrl: data.prUrl }, update: { branch: data.branch, prUrl: data.prUrl } }); break;
        }
        case "accept": {
          const task = await taskInProject(data.taskId);
          if (!["OWNER", "QA"].includes(role)) throw new ApiError(403, "QA permission required");
          if (task.status !== "QA") throw new ApiError(409, "Task must be in QA");
          result = await tx.task.update({ where: { id: data.taskId }, data: { qaAccepted: data.accepted, ...(!data.accepted ? { status: "IN_PROGRESS" } : {}) } }); break;
        }
      }
      await tx.activityLog.create({ data: { projectId, actorId: user.id, action: `Updated ${data.kind}`, entityType: data.kind, entityId: result.id ?? projectId } });
      return result;
    });
    return Response.json({ data: result });
  })(request);
}
