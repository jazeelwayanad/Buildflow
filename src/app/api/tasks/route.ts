import { NextResponse } from "next/server";
import { z } from "zod";
import { tasks } from "@/lib/demo-data";
const input=z.object({projectId:z.string().min(1),sectionId:z.string().optional(),title:z.string().trim().min(3).max(160),priority:z.enum(["LOW","MEDIUM","HIGH","URGENT"]).default("MEDIUM")});
export async function GET(request:Request){const status=new URL(request.url).searchParams.get("status");return NextResponse.json({data:status?tasks.filter(t=>t.status.toLowerCase().replace(" ","_")===status.toLowerCase()):tasks});}
export async function POST(request:Request){const parsed=input.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid task",details:parsed.error.flatten()},{status:400});return NextResponse.json({data:{id:crypto.randomUUID(),...parsed.data,status:"BACKLOG"}},{status:201});}
