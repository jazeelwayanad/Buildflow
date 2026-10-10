"use client";
import { createContext, useContext } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
export type SectionData = { id: string; title: string; version: number; specStatus: string; specification: { objective?: string; actions?: string; rules?: string; criteria?: string } };
export type TaskData = { id: string; title: string; status: string; priority: string; assigneeId: string | null; qaAccepted: boolean; assignee: { id: string; name: string } | null; section: SectionData | null; githubLink: { prUrl: string } | null; testCases: { id: string; title: string; steps: string; expectedResult: string; runs: { status: string; notes: string }[] }[] };
export type Workspace = {
  id: string; name: string; description: string; stack: string; repositoryUrl: string | null; developmentRules: string;
  viewer: { id: string; name: string; role: string };
  tasks: TaskData[];
  modules: { id: string; name: string; pages: { id: string; name: string; route: string; sections: SectionData[] }[] }[];
  bugs: { id: string; title: string; severity: string; status: string; reproductionSteps: string }[];
  members: { id: string; role: string; user: { id: string; name: string; email: string } }[];
  activity: { id: string; action: string; createdAt: string; actor: { name: string } | null }[];
};
const Context = createContext<{ data: Workspace | null; error: string; reload: () => Promise<void>; mutate: (url: string, body: unknown, method?: string) => Promise<void> } | null>(null);
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { data, error, mutate: refresh } = useSWR<Workspace>(`/api/projects/${encodeURIComponent(projectId)}`, async url => {
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 401) { router.replace("/login"); throw new Error("Please sign in"); }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result.data;
  }, { shouldRetryOnError: false });
  const reload = async () => { await refresh(); };
  async function mutate(url: string, body: unknown, method = "POST") {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Save failed");
    await reload();
  }
  return <Context.Provider value={{ data: data ?? null, error: error?.message ?? "", reload, mutate }}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error("Workspace provider is required");
  return context;
}
