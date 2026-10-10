import { z } from "zod";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
export const GET = api(async () => {
  const user = await requireUser();
  return Response.json({ data: await db.project.findMany({ where: { members: { some: { userId: user.id } } }, orderBy: { createdAt: "desc" } }) });
});
export const POST = api(async request => {
  const user = await requireUser();
  const input = z.object({ name: z.string().trim().min(2).max(80), description: z.string().max(1000).default("") }).parse(await request.json());
  const organization = await db.organizationMember.findFirst({ where: { userId: user.id, role: "OWNER" } });
  if (!organization) return Response.json({ error: "Owner access required" }, { status: 403 });
  const project = await db.project.create({ data: { ...input, organizationId: organization.organizationId, members: { create: { userId: user.id, role: "OWNER" } } } });
  return Response.json({ data: project }, { status: 201 });
});
