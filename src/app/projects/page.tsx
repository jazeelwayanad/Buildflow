"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, Plus, FolderKanban, ArrowRight, UserCircle, LogOut } from "@/components/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type ProjectSummary = {
  id: string;
  name: string;
  description: string;
};

export default function Projects() {
  const router = useRouter();
  const {
    data: projects = [],
    error: loadError,
    mutate: load,
  } = useSWR<ProjectSummary[]>(
    "/api/projects",
    async (url: string) => {
      const response = await fetch(url);
      if (response.status === 401) {
        router.replace("/login");
        return [];
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result.data;
    },
    { shouldRetryOnError: false }
  );

  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setName("");
      setDescription("");
      await load();
      router.push(`/projects/${result.data.id}/dashboard`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creation failed");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-lg">
            <span className="brand-mark">
              <Command size={19} />
            </span>
            <span>BuildFlow</span>
            <span className="text-muted-foreground text-sm font-normal">/ Workspaces</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/account">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <UserCircle size={15} />
                Account
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut size={14} />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto w-full p-6 md:p-10 flex-1 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Your Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select an active product workspace or create a new delivery script.
          </p>
        </div>

        {(error || loadError) && (
          <div className="p-3.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-sm font-medium">
            {error || loadError?.message}
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map(p => (
            <Link key={p.id} href={`/projects/${p.id}/dashboard`} className="group">
              <Card className="h-full hover:border-primary transition-all duration-150 hover:shadow-md cursor-pointer flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-accent text-primary">
                      <FolderKanban size={18} />
                    </span>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-semibold text-primary">
                      Open <ArrowRight size={12} />
                    </span>
                  </div>
                  <CardTitle className="text-base font-bold mt-3 group-hover:text-primary transition-colors">
                    {p.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {p.description || "Product workspace"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 text-[11px] font-mono text-muted-foreground">
                  ID: {p.id.slice(-8)}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Create Project Form */}
        <Card className="max-w-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-primary" />
              <CardTitle className="text-base">Create New Project</CardTitle>
            </div>
            <CardDescription>
              Start a new structured product script for your team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="field">
                <label htmlFor="pname">Project Name</label>
                <input
                  id="pname"
                  required
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. NextGen SaaS"
                />
              </div>
              <div className="field">
                <label htmlFor="pdesc">Description</label>
                <textarea
                  id="pdesc"
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Summary of the product goals and milestones…"
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create Project"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
