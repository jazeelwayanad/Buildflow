import { z } from "zod";
import { cookies } from "next/headers";
import { api } from "@/lib/api";
import { ApiError, createSession, digest, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  return api(async (req) => {
    if (action === "logout") {
      const jar = await cookies();
      const token = jar.get("buildflow_session")?.value;
      if (token) await db.session.deleteMany({ where: { id: digest(token) } });
      jar.delete("buildflow_session");
      return Response.json({ data: true });
    }
    if (!["login", "register"].includes(action)) throw new ApiError(404, "Unknown action");
    const input = z.object({ email: z.email().transform(v => v.toLowerCase()), password: z.string().min(10).max(128), name: z.string().trim().min(2).max(80).optional() }).parse(await req.json());
    const key = digest(`${action}:${input.email}`);
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const limited = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
      if (await tx.authAttempt.count({ where: { key, createdAt: { gt: cutoff } } }) >= 10) return true;
      await tx.authAttempt.create({ data: { key } });
      return false;
    });
    if (limited) throw new ApiError(429, "Too many attempts. Try again in 15 minutes.");
    let user;
    if (action === "register") {
      if (!input.name) throw new ApiError(400, "Name is required");
      user = await db.$transaction(async tx => {
        const created = await tx.user.create({ data: { name: input.name!, email: input.email, passwordHash: hashPassword(input.password) } });
        const organization = await tx.organization.create({ data: { name: `${input.name}'s workspace`, createdById: created.id, memberships: { create: { userId: created.id, role: "OWNER" } } } });
        await tx.project.create({ data: { organizationId: organization.id, name: "BuildFlow", description: "My product workspace", members: { create: { userId: created.id, role: "OWNER" } } } });
        return created;
      });
    } else {
      user = await db.user.findUnique({ where: { email: input.email } });
      const valid = verifyPassword(input.password, user?.passwordHash ?? hashPassword("invalid-password"));
      if (!user || !valid) throw new ApiError(401, "Incorrect email or password");
    }
    await createSession(user.id);
    const member = await db.projectMember.findFirst({ where: { userId: user.id }, orderBy: { id: "asc" } });
    return Response.json({ data: { projectId: member?.projectId } });
  })(request);
}
export const GET = api(async () => {
  const user = await requireUser();
  return Response.json({ data: { id: user.id, name: user.name, email: user.email } });
});
