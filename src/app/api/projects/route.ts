import { NextResponse } from "next/server";
import { z } from "zod";
import { project } from "@/lib/demo-data";

const projectInput = z.object({ name: z.string().trim().min(2).max(80), description: z.string().max(1000).default("") });
export async function GET() { return NextResponse.json({ data: [project] }); }
export async function POST(request: Request) {
  const parsed = projectInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid project", details: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ data: { id: crypto.randomUUID(), ...parsed.data, status: "ACTIVE" } }, { status: 201 });
}
