import { z } from "zod";
import { api } from "@/lib/api";
import { ApiError, requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

const input = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("module"), name: z.string().trim().min(2).max(100) }),
  z.object({ kind: z.literal("page"), moduleId: z.string(), name: z.string().trim().min(2).max(100), route: z.string().max(200) }),
  z.object({ kind: z.literal("section"), pageId: z.string(), title: z.string().trim().min(2).max(160) }),
  z.object({
    kind: z.literal("spec"),
    id: z.string(),
    version: z.number().int(),
    objective: z.string().max(10000).optional().default(""),
    actions: z.string().max(10000).optional().default(""),
    rules: z.string().max(10000).optional().default(""),
    criteria: z.string().max(10000).optional().default(""),
    layout: z.string().max(10000).optional().default(""),
    dataReqs: z.string().max(10000).optional().default(""),
    apiContracts: z.string().max(10000).optional().default(""),
    accessibility: z.string().max(10000).optional().default(""),
    status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED"]),
  }),
  z.object({
    kind: z.literal("reorder"),
    itemType: z.enum(["module", "page", "section"]),
    id: z.string(),
    direction: z.enum(["up", "down"]),
  }),
  z.object({
    kind: z.literal("bug"),
    title: z.string().trim().min(3).max(160),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    reproductionSteps: z.string().min(3).max(10000),
    expectedResult: z.string().max(10000).optional().default(""),
    actualResult: z.string().max(10000).optional().default(""),
    taskId: z.string().optional(),
    sectionId: z.string().optional(),
    assigneeId: z.string().optional(),
  }),
  z.object({ kind: z.literal("bugStatus"), id: z.string(), status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "VERIFIED"]) }),
  z.object({
    kind: z.literal("bugUpdate"),
    id: z.string(),
    title: z.string().min(3).max(160).optional(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "VERIFIED"]).optional(),
    assigneeId: z.string().nullable().optional(),
    taskId: z.string().nullable().optional(),
    reproductionSteps: z.string().max(10000).optional(),
    expectedResult: z.string().max(10000).optional(),
    actualResult: z.string().max(10000).optional(),
  }),
  z.object({ kind: z.literal("member"), email: z.email(), role: z.enum(["OWNER", "DEVELOPER", "DESIGNER", "FINANCE", "QA"]) }),
  z.object({ kind: z.literal("changeRole"), memberId: z.string(), role: z.enum(["OWNER", "DEVELOPER", "DESIGNER", "FINANCE", "QA"]) }),
  z.object({ kind: z.literal("revokeMember"), memberId: z.string() }),
  z.object({
    kind: z.literal("invite"),
    email: z.email(),
    role: z.enum(["OWNER", "DEVELOPER", "DESIGNER", "FINANCE", "QA"]),
  }),
  z.object({ kind: z.literal("revokeInvite"), id: z.string() }),
  z.object({ kind: z.literal("decision"), title: z.string().trim().min(3).max(160), rationale: z.string().min(3).max(10000) }),
  z.object({ kind: z.literal("test"), taskId: z.string(), title: z.string().min(3).max(160), steps: z.string().max(10000), expectedResult: z.string().max(10000) }),
  z.object({ kind: z.literal("run"), id: z.string(), status: z.enum(["PASSED", "FAILED"]), notes: z.string().max(10000) }),
  z.object({ kind: z.literal("pr"), taskId: z.string(), prUrl: z.url(), branch: z.string().max(200) }),
  z.object({ kind: z.literal("accept"), taskId: z.string(), accepted: z.boolean() }),
  z.object({
    kind: z.literal("taskUpdate"),
    id: z.string(),
    title: z.string().min(2).max(160).optional(),
    description: z.string().max(10000).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    assigneeId: z.string().nullable().optional(),
    blockedReason: z.string().nullable().optional(),
    status: z.enum(["BACKLOG", "READY", "IN_PROGRESS", "CODE_REVIEW", "QA", "DONE"]).optional(),
  }),
  z.object({
    kind: z.literal("dependency"),
    taskId: z.string(),
    dependsOnTaskId: z.string(),
    action: z.enum(["add", "remove"]),
  }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return api(async req => {
    const data = input.parse(await req.json());
    const isOwnerAction = ["member", "changeRole", "revokeMember", "invite", "revokeInvite"].includes(data.kind);
    const { user, role } = await requireProject(projectId, true, isOwnerAction);

    const result = await db.$transaction(async tx => {
      let result: { id?: string; token?: string } = {};

      const taskInProject = async (id: string) => {
        const task = await tx.task.findFirst({ where: { id, projectId } });
        if (!task) throw new ApiError(404, "Task not found");
        return task;
      };

      switch (data.kind) {
        case "module": {
          result = await tx.module.create({
            data: {
              projectId,
              name: data.name,
              position: await tx.module.count({ where: { projectId } }),
            },
          });
          break;
        }

        case "page": {
          if (!(await tx.module.findFirst({ where: { id: data.moduleId, projectId } }))) {
            throw new ApiError(404, "Module not found");
          }
          result = await tx.page.create({
            data: {
              moduleId: data.moduleId,
              name: data.name,
              route: data.route,
              position: await tx.page.count({ where: { moduleId: data.moduleId } }),
            },
          });
          break;
        }

        case "section": {
          if (!(await tx.page.findFirst({ where: { id: data.pageId, module: { projectId } } }))) {
            throw new ApiError(404, "Page not found");
          }
          result = await tx.section.create({
            data: {
              pageId: data.pageId,
              title: data.title,
              specification: {
                objective: "",
                actions: "",
                rules: "",
                criteria: "",
                layout: "",
                dataReqs: "",
                apiContracts: "",
                accessibility: "",
              },
              position: await tx.section.count({ where: { pageId: data.pageId } }),
            },
          });
          break;
        }

        case "spec": {
          if (data.status === "APPROVED" && role !== "OWNER") {
            throw new ApiError(403, "Only owners can approve specifications");
          }
          const section = await tx.section.findFirst({ where: { id: data.id, page: { module: { projectId } } } });
          if (!section) throw new ApiError(404, "Section not found");

          await tx.sectionRevision.create({
            data: {
              sectionId: section.id,
              version: section.version,
              specification: section.specification ?? {},
              specStatus: section.specStatus,
            },
          });

          const newSpec = {
            objective: data.objective,
            actions: data.actions,
            rules: data.rules,
            criteria: data.criteria,
            layout: data.layout,
            dataReqs: data.dataReqs,
            apiContracts: data.apiContracts,
            accessibility: data.accessibility,
          };

          const changed = await tx.section.updateMany({
            where: { id: data.id, version: data.version },
            data: {
              specification: newSpec,
              version: { increment: 1 },
              specStatus: data.status,
            },
          });
          if (!changed.count) throw new ApiError(409, "Specification changed; reload before saving");
          result = { id: data.id };
          break;
        }

        case "reorder": {
          if (data.itemType === "module") {
            const list = await tx.module.findMany({ where: { projectId }, orderBy: { position: "asc" } });
            const idx = list.findIndex(m => m.id === data.id);
            if (idx === -1) throw new ApiError(404, "Item not found");
            const targetIdx = data.direction === "up" ? idx - 1 : idx + 1;
            if (targetIdx >= 0 && targetIdx < list.length) {
              const current = list[idx];
              const neighbor = list[targetIdx];
              await tx.module.update({ where: { id: current.id }, data: { position: -1 } });
              await tx.module.update({ where: { id: neighbor.id }, data: { position: current.position } });
              await tx.module.update({ where: { id: current.id }, data: { position: neighbor.position } });
            }
          } else if (data.itemType === "page") {
            const page = await tx.page.findFirst({ where: { id: data.id, module: { projectId } } });
            if (!page) throw new ApiError(404, "Page not found");
            const list = await tx.page.findMany({ where: { moduleId: page.moduleId }, orderBy: { position: "asc" } });
            const idx = list.findIndex(p => p.id === data.id);
            const targetIdx = data.direction === "up" ? idx - 1 : idx + 1;
            if (targetIdx >= 0 && targetIdx < list.length) {
              const current = list[idx];
              const neighbor = list[targetIdx];
              await tx.page.update({ where: { id: current.id }, data: { position: -1 } });
              await tx.page.update({ where: { id: neighbor.id }, data: { position: current.position } });
              await tx.page.update({ where: { id: current.id }, data: { position: neighbor.position } });
            }
          } else if (data.itemType === "section") {
            const section = await tx.section.findFirst({ where: { id: data.id, page: { module: { projectId } } } });
            if (!section) throw new ApiError(404, "Section not found");
            const list = await tx.section.findMany({ where: { pageId: section.pageId }, orderBy: { position: "asc" } });
            const idx = list.findIndex(s => s.id === data.id);
            const targetIdx = data.direction === "up" ? idx - 1 : idx + 1;
            if (targetIdx >= 0 && targetIdx < list.length) {
              const current = list[idx];
              const neighbor = list[targetIdx];
              await tx.section.update({ where: { id: current.id }, data: { position: -1 } });
              await tx.section.update({ where: { id: neighbor.id }, data: { position: current.position } });
              await tx.section.update({ where: { id: current.id }, data: { position: neighbor.position } });
            }
          }
          result = { id: data.id };
          break;
        }

        case "bug": {
          result = await tx.bug.create({
            data: {
              projectId,
              title: data.title,
              severity: data.severity,
              reproductionSteps: data.reproductionSteps,
              expectedResult: data.expectedResult,
              actualResult: data.actualResult,
              taskId: data.taskId || undefined,
              sectionId: data.sectionId || undefined,
              assigneeId: data.assigneeId || undefined,
            },
          });
          break;
        }

        case "bugStatus": {
          if (data.status === "VERIFIED" && !["OWNER", "QA"].includes(role)) {
            throw new ApiError(403, "QA permission required to verify bug");
          }
          const changed = await tx.bug.updateMany({ where: { id: data.id, projectId }, data: { status: data.status } });
          if (!changed.count) throw new ApiError(404, "Bug not found");
          result = { id: data.id };
          break;
        }

        case "bugUpdate": {
          const bug = await tx.bug.findFirst({ where: { id: data.id, projectId } });
          if (!bug) throw new ApiError(404, "Bug not found");
          if (data.status === "VERIFIED" && !["OWNER", "QA"].includes(role)) {
            throw new ApiError(403, "QA permission required to verify bug");
          }
          result = await tx.bug.update({
            where: { id: data.id },
            data: {
              ...(data.title ? { title: data.title } : {}),
              ...(data.severity ? { severity: data.severity } : {}),
              ...(data.status ? { status: data.status } : {}),
              ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
              ...(data.taskId !== undefined ? { taskId: data.taskId } : {}),
              ...(data.reproductionSteps ? { reproductionSteps: data.reproductionSteps } : {}),
              ...(data.expectedResult !== undefined ? { expectedResult: data.expectedResult } : {}),
              ...(data.actualResult !== undefined ? { actualResult: data.actualResult } : {}),
            },
          });
          break;
        }

        case "member": {
          const target = await tx.user.findUnique({ where: { email: data.email.toLowerCase() } });
          if (!target) throw new ApiError(404, "Ask this person to create an account first, or send an invitation link");
          const existing = await tx.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: target.id } } });
          if (existing?.role === "OWNER" && data.role !== "OWNER" && (await tx.projectMember.count({ where: { projectId, role: "OWNER" } })) === 1) {
            throw new ApiError(409, "Keep at least one project owner");
          }
          result = await tx.projectMember.upsert({
            where: { projectId_userId: { projectId, userId: target.id } },
            create: { projectId, userId: target.id, role: data.role },
            update: { role: data.role },
          });
          break;
        }

        case "changeRole": {
          const member = await tx.projectMember.findFirst({ where: { id: data.memberId, projectId } });
          if (!member) throw new ApiError(404, "Member not found");
          if (member.role === "OWNER" && data.role !== "OWNER" && (await tx.projectMember.count({ where: { projectId, role: "OWNER" } })) === 1) {
            throw new ApiError(409, "Keep at least one project owner");
          }
          result = await tx.projectMember.update({ where: { id: data.memberId }, data: { role: data.role } });
          break;
        }

        case "revokeMember": {
          const member = await tx.projectMember.findFirst({ where: { id: data.memberId, projectId } });
          if (!member) throw new ApiError(404, "Member not found");
          if (member.role === "OWNER" && (await tx.projectMember.count({ where: { projectId, role: "OWNER" } })) === 1) {
            throw new ApiError(409, "Cannot remove the only project owner");
          }
          await tx.projectMember.delete({ where: { id: data.memberId } });
          result = { id: data.memberId };
          break;
        }

        case "invite": {
          const token = crypto.randomBytes(24).toString("hex");
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
          const created = await tx.projectInvitation.create({
            data: {
              projectId,
              email: data.email.toLowerCase(),
              role: data.role,
              token,
              expiresAt,
            },
          });
          result = { id: created.id, token: created.token };
          break;
        }

        case "revokeInvite": {
          await tx.projectInvitation.deleteMany({ where: { id: data.id, projectId } });
          result = { id: data.id };
          break;
        }

        case "decision": {
          result = await tx.decision.create({
            data: {
              projectId,
              title: data.title,
              rationale: data.rationale,
              decidedBy: user.name,
            },
          });
          break;
        }

        case "test": {
          await taskInProject(data.taskId);
          if (!["OWNER", "QA"].includes(role)) throw new ApiError(403, "QA permission required");
          result = await tx.testCase.create({
            data: { taskId: data.taskId, title: data.title, steps: data.steps, expectedResult: data.expectedResult },
          });
          break;
        }

        case "run": {
          if (!["OWNER", "QA"].includes(role)) throw new ApiError(403, "QA permission required");
          const test = await tx.testCase.findFirst({ where: { id: data.id, task: { projectId } } });
          if (!test) throw new ApiError(404, "Test not found");
          result = await tx.testRun.create({
            data: { testCaseId: data.id, status: data.status, notes: data.notes, testedBy: user.id },
          });
          await tx.task.update({ where: { id: test.taskId }, data: { qaAccepted: false } });
          break;
        }

        case "pr": {
          const task = await taskInProject(data.taskId);
          if (role !== "OWNER" && task.assigneeId !== user.id) throw new ApiError(403, "Task owner permission required");
          if (!data.prUrl.startsWith("https://")) throw new ApiError(400, "Use an HTTPS pull request URL");
          result = await tx.githubLink.upsert({
            where: { taskId: data.taskId },
            create: { taskId: data.taskId, branch: data.branch, prUrl: data.prUrl },
            update: { branch: data.branch, prUrl: data.prUrl },
          });
          break;
        }

        case "accept": {
          const task = await taskInProject(data.taskId);
          if (!["OWNER", "QA"].includes(role)) throw new ApiError(403, "QA permission required");
          if (task.status !== "QA") throw new ApiError(409, "Task must be in QA");
          result = await tx.task.update({
            where: { id: data.taskId },
            data: { qaAccepted: data.accepted, ...(!data.accepted ? { status: "IN_PROGRESS" } : {}) },
          });
          break;
        }

        case "taskUpdate": {
          const task = await taskInProject(data.id);
          let newAssignee = data.assigneeId;
          if (data.status === "IN_PROGRESS" && !task.assigneeId && data.assigneeId === undefined) {
            newAssignee = user.id;
          }
          result = await tx.task.update({
            where: { id: data.id },
            data: {
              ...(data.title ? { title: data.title } : {}),
              ...(data.description !== undefined ? { description: data.description } : {}),
              ...(data.priority ? { priority: data.priority } : {}),
              ...(newAssignee !== undefined ? { assigneeId: newAssignee } : {}),
              ...(data.blockedReason !== undefined ? { blockedReason: data.blockedReason } : {}),
              ...(data.status ? { status: data.status } : {}),
            },
          });
          break;
        }

        case "dependency": {
          if (data.taskId === data.dependsOnTaskId) throw new ApiError(400, "Task cannot depend on itself");
          await taskInProject(data.taskId);
          await taskInProject(data.dependsOnTaskId);

          if (data.action === "add") {
            // Check for direct circular dependency
            const reverse = await tx.taskDependency.findUnique({
              where: {
                taskId_dependsOnTaskId: {
                  taskId: data.dependsOnTaskId,
                  dependsOnTaskId: data.taskId,
                },
              },
            });
            if (reverse) throw new ApiError(409, "Circular dependency detected");

            await tx.taskDependency.upsert({
              where: {
                taskId_dependsOnTaskId: {
                  taskId: data.taskId,
                  dependsOnTaskId: data.dependsOnTaskId,
                },
              },
              create: {
                taskId: data.taskId,
                dependsOnTaskId: data.dependsOnTaskId,
              },
              update: {},
            });
            result = { id: data.taskId };
          } else {
            await tx.taskDependency.deleteMany({
              where: {
                taskId: data.taskId,
                dependsOnTaskId: data.dependsOnTaskId,
              },
            });
            result = { id: data.taskId };
          }
          break;
        }
      }

      await tx.activityLog.create({
        data: {
          projectId,
          actorId: user.id,
          action: `Updated ${data.kind}`,
          entityType: data.kind,
          entityId: result.id ?? projectId,
        },
      });

      return result;
    });

    return Response.json({ data: result });
  })(request);
}
