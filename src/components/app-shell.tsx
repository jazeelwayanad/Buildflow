"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bug, ChevronDown, Columns3, Command, LayoutDashboard, PanelLeft, ScrollText, Search, Settings, ShieldCheck, Users } from "./icons";

const nav = [
  ["Dashboard", "dashboard", LayoutDashboard], ["Application script", "script", ScrollText],
  ["Tasks", "tasks", Columns3], ["QA queue", "qa", ShieldCheck], ["Bugs", "bugs", Bug],
  ["Team", "team", Users], ["Settings", "settings", Settings],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="app-frame">
    <aside className="sidebar">
      <Link href="/projects" className="brand"><span className="brand-mark"><Command size={19}/></span><span>BuildFlow</span></Link>
      <div className="workspace-switch"><span className="avatar small">BF</span><span><b>BuildFlow</b><small>Product workspace</small></span><ChevronDown size={15}/></div>
      <nav>
        <p className="nav-label">Workspace</p>
        {nav.slice(0,5).map(([label, path, Icon]) => <Link key={path} className={pathname.includes(`/${path}`) ? "active" : ""} href={`/projects/buildflow/${path}`}><Icon size={18}/><span>{label}</span>{path === "qa" && <em>3</em>}</Link>)}
        <p className="nav-label space">Manage</p>
        {nav.slice(5).map(([label, path, Icon]) => <Link key={path} className={pathname.includes(`/${path}`) ? "active" : ""} href={`/projects/buildflow/${path}`}><Icon size={18}/><span>{label}</span></Link>)}
      </nav>
      <div className="sidebar-card"><span>68%</span><div><b>Project progress</b><small>34 of 50 tasks done</small></div><div className="mini-progress"><i style={{width:"68%"}}/></div></div>
      <div className="profile"><span className="avatar">MC</span><span><b>Maya Chen</b><small>Project owner</small></span><ChevronDown size={14}/></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu"><PanelLeft size={19}/></button><div className="search"><Search size={17}/><input aria-label="Search" placeholder="Search anything..."/><kbd>⌘ K</kbd></div><div className="top-actions"><button aria-label="Notifications"><Bell size={19}/><i/></button><span className="divider"/><span className="status-dot"/> <small>All systems operational</small></div></header>
      {children}
    </main>
  </div>
}
