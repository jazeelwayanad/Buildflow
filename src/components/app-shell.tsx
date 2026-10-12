"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspace } from "./workspace-provider";
import {
  Bell,
  Bug,
  ChevronDown,
  Columns3,
  Command,
  LayoutDashboard,
  PanelLeft,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Users,
  BookMarked,
  UserCircle,
  LogOut,
  X,
} from "./icons";
import { ThemeToggle } from "./ui/theme-toggle";

const workspaceNav = [
  ["Dashboard", "dashboard", LayoutDashboard],
  ["Application script", "script", ScrollText],
  ["Tasks", "tasks", Columns3],
  ["QA queue", "qa", ShieldCheck],
  ["Bugs", "bugs", Bug],
] as const;

const manageNav = [
  ["Team", "team", Users],
  ["Decisions", "decisions", BookMarked],
  ["Settings", "settings", Settings],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);
  const projectId = data?.id ?? pathname.split("/")[2];
  const done = data?.tasks.filter(t => t.status === "DONE").length ?? 0;
  const total = data?.tasks.length ?? 0;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const qaCount = data?.tasks.filter(t => t.status === "QA").length ?? 0;
  const bugCount = data?.bugs.filter(b => b.status !== "VERIFIED").length ?? 0;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="app-frame">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${
          mobileOpen ? "flex !translate-x-0" : ""
        } transition-transform duration-200`}
        style={mobileOpen ? { display: "flex", transform: "translateX(0)" } : {}}
      >
        <div className="flex items-center justify-between">
          <Link href="/projects" className="brand">
            <span className="brand-mark">
              <Command size={19} />
            </span>
            <span>BuildFlow</span>
          </Link>
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground md:hidden"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <Link href="/projects" className="workspace-switch">
          <span className="avatar small">
            {data?.name.slice(0, 2).toUpperCase() ?? "BF"}
          </span>
          <span>
            <b>{data?.name ?? "Loading workspace…"}</b>
            <small>Active Project</small>
          </span>
          <ChevronDown size={14} className="text-muted-foreground" />
        </Link>

        <nav>
          <p className="nav-label">Workspace</p>
          {workspaceNav.map(([label, path, Icon]) => (
            <Link
              key={path}
              className={pathname.includes(`/${path}`) ? "active" : ""}
              href={`/projects/${projectId}/${path}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {path === "qa" && qaCount > 0 && <em>{qaCount}</em>}
              {path === "bugs" && bugCount > 0 && <em>{bugCount}</em>}
            </Link>
          ))}

          <p className="nav-label space">Manage</p>
          {manageNav.map(([label, path, Icon]) => (
            <Link
              key={path}
              className={pathname.includes(`/${path}`) ? "active" : ""}
              href={`/projects/${projectId}/${path}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>{progress}%</span>
          <div>
            <b>Sprint Progress</b>
            <small>
              {done} of {total} tasks completed
            </small>
          </div>
          <div className="mini-progress">
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="profile">
          <Link
            href="/account"
            className="flex items-center gap-2.5 flex-1 hover:opacity-80 transition-opacity"
            title="Account & Security"
          >
            <span className="avatar">
              {data?.viewer.name.slice(0, 2).toUpperCase() ?? "ME"}
            </span>
            <span>
              <b>{data?.viewer.name ?? "Loading…"}</b>
              <small>{data?.viewer.role}</small>
            </span>
          </Link>
          <button
            aria-label="Account settings"
            onClick={() => router.push("/account")}
            title="Account & Security"
          >
            <UserCircle size={15} />
          </button>
          <button
            aria-label="Sign out"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <PanelLeft size={19} />
          </button>
          <div className="search">
            <Search size={16} />
            <input aria-label="Search" placeholder="Search tasks, specs, bugs..." />
            <kbd>⌘ K</kbd>
          </div>
          <div className="top-actions">
            <Link
              href="/account"
              className="text-xs font-semibold hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <UserCircle size={15} />
              <span>Account</span>
            </Link>
            <span className="divider" />
            <button aria-label="Notifications" title="Notifications">
              <Bell size={18} />
              <i />
            </button>
            <span className="divider" />
            <ThemeToggle />
            <span className="divider" />
            <span className="status-dot" />
            <small>Live sync</small>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
