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

    if (action === "update-profile") {
      const user = await requireUser();
      const input = z.object({ name: z.string().trim().min(2).max(80), email: z.email().transform(v => v.toLowerCase()) }).parse(await req.json());
      const updated = await db.user.update({ where: { id: user.id }, data: { name: input.name, email: input.email } });
      return Response.json({ data: { id: updated.id, name: updated.name, email: updated.email } });
    }

    if (action === "change-password") {
      const user = await requireUser();
      const input = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(10).max(128) }).parse(await req.json());
      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      if (!dbUser || !verifyPassword(input.currentPassword, dbUser.passwordHash ?? "")) {
        throw new ApiError(400, "Current password is incorrect");
      }
      await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(input.newPassword) } });
      return Response.json({ data: true });
    }

    if (action === "revoke-session") {
      const user = await requireUser();
      const input = z.object({ sessionId: z.string() }).parse(await req.json());
      await db.session.deleteMany({ where: { id: input.sessionId, userId: user.id } });
      return Response.json({ data: true });
    }

    if (action === "accept-invite") {
      const user = await requireUser();
      const input = z.object({ token: z.string() }).parse(await req.json());
      const invite = await db.projectInvitation.findUnique({
        where: { token: input.token },
        include: { project: true },
      });
      if (!invite) throw new ApiError(404, "Invitation not found or expired");
      if (invite.expiresAt < new Date()) {
        await db.projectInvitation.delete({ where: { id: invite.id } });
        throw new ApiError(410, "This invitation link has expired");
      }

      await db.$transaction(async tx => {
        await tx.projectMember.upsert({
          where: { projectId_userId: { projectId: invite.projectId, userId: user.id } },
          create: { projectId: invite.projectId, userId: user.id, role: invite.role },
          update: { role: invite.role },
        });
        await tx.activityLog.create({
          data: {
            projectId: invite.projectId,
            actorId: user.id,
            action: `Joined project via invitation`,
            entityType: "member",
            entityId: user.id,
          },
        });
        await tx.projectInvitation.delete({ where: { id: invite.id } });
      });

      return Response.json({ data: { projectId: invite.projectId } });
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

export async function GET(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  return api(async (req) => {
    if (action === "account") {
      const user = await requireUser();
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        include: {
          sessions: { orderBy: { expiresAt: "desc" } },
          projectMemberships: { include: { project: true } },
        },
      });
      if (!dbUser) throw new ApiError(404, "User not found");
      const jar = await cookies();
      const currentTokenDigest = jar.get("buildflow_session")?.value ? digest(jar.get("buildflow_session")!.value) : null;

      return Response.json({
        data: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          createdAt: dbUser.createdAt,
          currentSessionId: currentTokenDigest,
          sessions: dbUser.sessions.map(s => ({
            id: s.id,
            expiresAt: s.expiresAt,
            isCurrent: s.id === currentTokenDigest,
          })),
          projects: dbUser.projectMemberships.map(pm => ({
            id: pm.projectId,
            name: pm.project.name,
            role: pm.role,
          })),
        },
      });
    }

    if (action === "invite") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (!token) throw new ApiError(400, "Token is required");
      const invite = await db.projectInvitation.findUnique({
        where: { token },
        include: { project: true },
      });
      if (!invite) throw new ApiError(404, "Invitation not found");
      const isExpired = invite.expiresAt < new Date();
      return Response.json({
        data: {
          token: invite.token,
          email: invite.email,
          role: invite.role,
          projectName: invite.project.name,
          projectId: invite.projectId,
          expiresAt: invite.expiresAt,
          isExpired,
        },
      });
    }

    const user = await requireUser();
    return Response.json({ data: { id: user.id, name: user.name, email: user.email } });
  })(request);
}
