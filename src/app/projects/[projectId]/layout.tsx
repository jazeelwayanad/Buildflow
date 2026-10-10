import { AppShell } from "@/components/app-shell";
import { Suspense } from "react";
export default function ProjectLayout({children}:{children:React.ReactNode}) { return <Suspense fallback={<div/>}><AppShell>{children}</AppShell></Suspense> }
