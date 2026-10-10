"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspace } from "./workspace-provider";
import { Bell, Bug, ChevronDown, Columns3, Command, LayoutDashboard, PanelLeft, ScrollText, Search, Settings, ShieldCheck, Users } from "./icons";

const nav = [
  ["Dashboard", "dashboard", LayoutDashboard], ["Application script", "script", ScrollText],
  ["Tasks", "tasks", Columns3], ["QA queue", "qa", ShieldCheck], ["Bugs", "bugs", Bug],
  ["Team", "team", Users], ["Settings", "settings", Settings],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useWorkspace();
  const projectId = data?.id ?? pathname.split("/")[2];
  const done = data?.tasks.filter(t => t.status === "DONE").length ?? 0;
  const total = data?.tasks.length ?? 0;
  const progress = total ? Math.round(done / total * 100) : 0;
  return <div className="app-frame">
    <aside className="sidebar">
      <Link href="/projects" className="brand"><span className="brand-mark"><Command size={19}/></span><span>BuildFlow</span></Link>
      <div className="workspace-switch"><span className="avatar small">BF</span><span><b>{data?.name ?? "Workspace"}</b><small>Product workspace</small></span><ChevronDown size={15}/></div>
      <nav>
        <p className="nav-label">Workspace</p>
        {nav.slice(0,5).map(([label, path, Icon]) => <Link key={path} className={pathname.includes(`/${path}`) ? "active" : ""} href={`/projects/${projectId}/${path}`}><Icon size={18}/><span>{label}</span>{path === "qa" && <em>{data?.tasks.filter(t => t.status === "QA").length ?? 0}</em>}</Link>)}
        <p className="nav-label space">Manage</p>
        {nav.slice(5).map(([label, path, Icon]) => <Link key={path} className={pathname.includes(`/${path}`) ? "active" : ""} href={`/projects/${projectId}/${path}`}><Icon size={18}/><span>{label}</span></Link>)}
      </nav>
      <div className="sidebar-card"><span>{progress}%</span><div><b>Project progress</b><small>{done} of {total} tasks done</small></div><div className="mini-progress"><i style={{width:`${progress}%`}}/></div></div>
      <div className="profile"><span className="avatar">{data?.viewer.name.slice(0,2).toUpperCase()}</span><span><b>{data?.viewer.name ?? "Loading…"}</b><small>{data?.viewer.role}</small></span><button aria-label="Sign out" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); }}>↪</button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu"><PanelLeft size={19}/></button><div className="search"><Search size={17}/><input aria-label="Search" placeholder="Search anything..."/><kbd>⌘ K</kbd></div><div className="top-actions"><button aria-label="Notifications"><Bell size={19}/><i/></button><span className="divider"/><span className="status-dot"/> <small>All systems operational</small></div></header>
      {children}
    </main>
  </div>
}
