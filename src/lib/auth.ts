import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { id: digest(token), userId, expiresAt } });
  (await cookies()).set("buildflow_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}
export async function currentUser() {
  const token = (await cookies()).get("buildflow_session")?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: digest(token) }, include: { user: true } });
  return session && session.expiresAt > new Date() ? session.user : null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new ApiError(401, "Please sign in");
  return user;
}
export async function requireProject(projectId: string, write = false, ownerOnly = false) {
  const user = await requireUser();
  const membership = await db.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } });
  if (!membership) throw new ApiError(404, "Project not found");
  if (ownerOnly && membership.role !== "OWNER") throw new ApiError(403, "Owner permission required");
  if (write && membership.role === "FINANCE") throw new ApiError(403, "Editing is not allowed for this role");
  return { user, role: membership.role };
}
