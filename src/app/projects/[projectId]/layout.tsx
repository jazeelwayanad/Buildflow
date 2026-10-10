import { AppShell } from "@/components/app-shell";
import { Suspense } from "react";
import { WorkspaceProvider } from "@/components/workspace-provider";
export default function ProjectLayout({children}:{children:React.ReactNode}) { return <Suspense fallback={<div/>}><WorkspaceProvider><AppShell>{children}</AppShell></WorkspaceProvider></Suspense> }
