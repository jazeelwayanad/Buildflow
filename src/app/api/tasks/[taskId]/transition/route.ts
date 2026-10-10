import { NextResponse } from "next/server";
import { z } from "zod";
import { canTransition } from "@/lib/workflow";
const input=z.object({from:z.string(),to:z.string(),approvedSpec:z.boolean().optional(),hasPullRequest:z.boolean().optional(),testsPassed:z.boolean().optional(),qaAccepted:z.boolean().optional()});
export async function POST(request:Request,{params}:{params:Promise<{taskId:string}>}){const body=input.safeParse(await request.json());if(!body.success)return NextResponse.json({error:"Invalid transition"},{status:400});const{id,...gates}={id:(await params).taskId,...body.data};const result=canTransition(gates.from,gates.to,gates);if(!result.ok)return NextResponse.json({error:result.reason},{status:409});return NextResponse.json({data:{id,status:gates.to}});}
