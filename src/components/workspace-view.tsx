"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  PageHeader,
  StatCard,
} from "./ui";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Drawer } from "./ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import {
  CircleCheck,
  Clock3,
  GitPullRequest,
  AlertTriangle,
  Plus,
  ChevronDown,
  ChevronUp,
  Layers3,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Link2 as LinkIcon,
  Trash2,
  Share2,
  Sun,
  Moon,
  Monitor,
  Kanban,
  Table,
  List,
  GripVertical,
  Search,
} from "./icons";
import { useTheme } from "./theme-provider";
import {
  SectionData,
  TaskData,
  BugData,
  Workspace,
  useWorkspace,
} from "./workspace-provider";

const label = (value: string) =>
  value.toLowerCase().replaceAll("_", " ").replace(/^./, c => c.toUpperCase());

type Field = {
  name: string;
  label: string;
  options?: string[];
  optionLabels?: Record<string, string>;
  type?: string;
  value?: string;
  required?: boolean;
};

type FormSpec = {
  title: string;
  fields: Field[];
  submit: (values: Record<string, string>) => Promise<void>;
};

export function WorkspaceView({ view }: { view: string }) {
  const { data, error, reload, mutate } = useWorkspace();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [form, setForm] = useState<FormSpec | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [bugSeverityFilter, setBugSeverityFilter] = useState<string>("ALL");

  // Notion Tasks view states
  const [taskViewMode, setTaskViewMode] = useState<"board" | "table" | "list">("board");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<string>("ALL");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>("ALL");

  const taskId = searchParams.get("task");
  const bugId = searchParams.get("bug");
  const activeTaskDrawer = taskId && data ? data.tasks.find(t => t.id === taskId) ?? null : null;
  const activeBugDrawer = bugId && data ? data.bugs.find(b => b.id === bugId) ?? null : null;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage("Saved successfully");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const handleTaskDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);
    if (!id || !data) return;
    const task = data.tasks.find(t => t.id === id);
    if (!task || task.status === targetStatus) return;

    await run(async () => {
      if (task.status === "READY" && targetStatus === "IN_PROGRESS" && !task.assigneeId) {
        await mutate(`/api/tasks/${task.id}/claim`, {});
      } else {
        try {
          await mutate(`/api/tasks/${task.id}/transition`, { to: targetStatus });
        } catch (err) {
          if (data.viewer.role === "OWNER") {
            await mutate(`/api/projects/${data.id}/items`, { kind: "taskUpdate", id: task.id, status: targetStatus });
          } else {
            throw err;
          }
        }
      }
    });
  };

  if (!data) {
    return (
      <div className="content">
        <h1 className="text-xl font-bold">{error ? "Unable to load workspace" : "Loading workspace…"}</h1>
        {error && (
          <div className="space-y-4 mt-4">
            <p role="alert" className="text-destructive text-sm font-medium">
              {error}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => void reload()}>Retry</Button>
              <Link href="/projects">
                <Button variant="outline">Back to Projects</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  const p = data;
  const base = `/api/projects/${p.id}`;
  const items = (body: unknown) => mutate(`${base}/items`, body);

  const sections = p.modules.flatMap(m => m.pages.flatMap(page => page.sections));
  const activeSection = sections.find(s => s.id === selectedSectionId) ?? sections[0];

  const doneTasks = p.tasks.filter(t => t.status === "DONE").length;
  const progress = p.tasks.length ? Math.round((doneTasks / p.tasks.length) * 100) : 0;
  const blockedTasks = p.tasks.filter(
    t => Boolean(t.blockedReason) || t.dependencies.some(d => d.dependsOn.status !== "DONE")
  );

  const createTaskModal = (initialStatus?: string) =>
    setForm({
      title: initialStatus ? `Create Task in ${label(initialStatus)}` : "Create Task",
      fields: [
        { name: "title", label: "Task Title", required: true },
        {
          name: "sectionId",
          label: "Linked Specification",
          options: ["", ...sections.map(s => s.id)],
          optionLabels: {
            "": "No specification (Backlog only)",
            ...Object.fromEntries(
              sections.map(s => [s.id, `${s.title} (${label(s.specStatus)})`])
            ),
          },
        },
        {
          name: "priority",
          label: "Priority",
          options: ["MEDIUM", "HIGH", "URGENT", "LOW"],
        },
      ],
      submit: v =>
        mutate("/api/tasks", {
          projectId: p.id,
          ...v,
          sectionId: v.sectionId || undefined,
          status: initialStatus || undefined,
        }),
    });

  const pageHeaders: Record<string, [string, string]> = {
    dashboard: [
      `Welcome, ${p.viewer.name.split(" ")[0]}`,
      `Here is what is moving across ${p.name} today.`,
    ],
    tasks: ["Development Tasks", "Move approved specifications through implementation, review, and QA."],
    script: ["Application Script", "Design the product as an ordered, implementation-ready specification."],
    qa: ["QA Verification Queue", "Execute acceptance tests, log run evidence, and enforce QA release gates."],
    bugs: ["Issue & Bug Tracker", "Track issues from report through assigned resolution and verification."],
    team: ["Team & Invitations", "Manage workspace members, assign roles, and issue invitation links."],
    decisions: ["Decisions Log", "Record chronological architectural and product decisions with rationale."],
    settings: ["Project Settings", "Control metadata, AI development conventions, and repository links."],
  };

  return (
    <div className="content">
      <PageHeader
        eyebrow={p.name}
        title={pageHeaders[view]?.[0] ?? "Workspace"}
        description={pageHeaders[view]?.[1] ?? ""}
        actions={
          view === "tasks" || view === "dashboard" ? (
            <Button onClick={() => createTaskModal()} className="gap-2">
              <Plus size={15} />
              Create Task
            </Button>
          ) : view === "script" ? (
            <Button
              onClick={() =>
                setForm({
                  title: "New Module",
                  fields: [{ name: "name", label: "Module Name", required: true }],
                  submit: v => items({ kind: "module", ...v }),
                })
              }
              className="gap-2"
            >
              <Plus size={15} />
              New Module
            </Button>
          ) : view === "bugs" ? (
            <Button
              onClick={() =>
                setForm({
                  title: "Report Issue / Bug",
                  fields: [
                    { name: "title", label: "Issue Title", required: true },
                    {
                      name: "severity",
                      label: "Severity",
                      options: ["MEDIUM", "LOW", "HIGH", "CRITICAL"],
                    },
                    {
                      name: "taskId",
                      label: "Linked Task (Optional)",
                      options: ["", ...p.tasks.map(t => t.id)],
                      optionLabels: {
                        "": "None",
                        ...Object.fromEntries(p.tasks.map(t => [t.id, t.title])),
                      },
                    },
                    {
                      name: "reproductionSteps",
                      label: "Reproduction Steps",
                      type: "textarea",
                      required: true,
                    },
                    {
                      name: "expectedResult",
                      label: "Expected Result",
                      type: "textarea",
                    },
                    {
                      name: "actualResult",
                      label: "Actual Result",
                      type: "textarea",
                    },
                  ],
                  submit: v => items({ kind: "bug", ...v }),
                })
              }
              className="gap-2"
            >
              <Plus size={15} />
              Report Bug
            </Button>
          ) : view === "team" && p.viewer.role === "OWNER" ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setForm({
                    title: "Generate Invite Link",
                    fields: [
                      { name: "email", label: "Invited Email Address", type: "email", required: true },
                      {
                        name: "role",
                        label: "Assigned Role",
                        options: ["DEVELOPER", "QA", "DESIGNER", "FINANCE", "OWNER"],
                      },
                    ],
                    submit: async v => {
                      await items({ kind: "invite", ...v });
                    },
                  })
                }
                className="gap-2"
              >
                <Share2 size={15} />
                Create Invite Link
              </Button>
              <Button
                onClick={() =>
                  setForm({
                    title: "Add Existing Member",
                    fields: [
                      { name: "email", label: "Registered Email Address", type: "email", required: true },
                      {
                        name: "role",
                        label: "Role",
                        options: ["DEVELOPER", "QA", "DESIGNER", "FINANCE", "OWNER"],
                      },
                    ],
                    submit: v => items({ kind: "member", ...v }),
                  })
                }
                className="gap-2"
              >
                <Plus size={15} />
                Add Member
              </Button>
            </div>
          ) : view === "decisions" ? (
            <Button
              onClick={() =>
                setForm({
                  title: "Record Project Decision",
                  fields: [
                    { name: "title", label: "Decision Title", required: true },
                    {
                      name: "rationale",
                      label: "Rationale & Context",
                      type: "textarea",
                      required: true,
                    },
                  ],
                  submit: v => items({ kind: "decision", ...v }),
                })
              }
              className="gap-2"
            >
              <Plus size={15} />
              Record Decision
            </Button>
          ) : undefined
        }
      />

      {message && <div className="notice">{message}</div>}
      {error && <div className="p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">{error}</div>}

      {/* DASHBOARD VIEW */}
      {view === "dashboard" && (
        <div className="space-y-6">
          <section className="stats-grid">
            <StatCard
              label="Overall Progress"
              value={`${progress}%`}
              note={`${doneTasks} of ${p.tasks.length} tasks complete`}
              icon={<CircleCheck size={20} />}
            />
            <StatCard
              label="Active Implementation"
              value={String(p.tasks.filter(t => t.status === "IN_PROGRESS").length)}
              note="Currently in developer ownership"
              tone="blue"
              icon={<Clock3 size={20} />}
            />
            <StatCard
              label="Review & QA Gates"
              value={String(p.tasks.filter(t => ["CODE_REVIEW", "QA"].includes(t.status)).length)}
              note="Awaiting PR review or QA pass"
              tone="orange"
              icon={<GitPullRequest size={20} />}
            />
            <StatCard
              label="Open Issues & Bugs"
              value={String(p.bugs.filter(b => b.status !== "VERIFIED").length)}
              note="Pending verified resolution"
              tone="green"
              icon={<AlertTriangle size={20} />}
            />
          </section>

          {/* Blockers Alert if any */}
          {blockedTasks.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle size={18} />
                  <CardTitle className="text-sm font-bold text-destructive">
                    Blocked Tasks Requiring Attention ({blockedTasks.length})
                  </CardTitle>
                </div>
                <CardDescription>
                  These tasks cannot progress until their dependencies are completed or blocker flags are cleared.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {blockedTasks.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border border-border cursor-pointer hover:border-primary transition-colors"
                    onClick={() => router.push(`?task=${t.id}`)}
                  >
                    <div>
                      <span className="font-semibold text-xs">{t.title}</span>
                      <p className="text-[11px] text-destructive mt-0.5">
                        {t.blockedReason
                          ? `Reason: ${t.blockedReason}`
                          : `Incomplete dependencies: ${t.dependencies
                              .filter(d => d.dependsOn.status !== "DONE")
                              .map(d => d.dependsOn.title)
                              .join(", ")}`}
                      </p>
                    </div>
                    <Badge variant="destructive">Blocked</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="dashboard-grid">
            <article className="panel">
              <div className="panel-head">
                <h2>Module Specification Progress</h2>
                <Link href={`/projects/${p.id}/script`}>View Script Explorer →</Link>
              </div>
              <div className="progress-overview">
                {p.modules.length ? (
                  p.modules.map(m => {
                    const ids = m.pages.flatMap(page => page.sections.map(s => s.id));
                    const tasks = p.tasks.filter(t => t.section && ids.includes(t.section.id));
                    const percent = tasks.length
                      ? Math.round(
                          (tasks.filter(t => t.status === "DONE").length / tasks.length) * 100
                        )
                      : 0;
                    return (
                      <div className="module-row" key={m.id} style={{ marginBottom: 18 }}>
                        <b>{m.name}</b>
                        <div className="bar">
                          <i style={{ width: `${percent}%` }} />
                        </div>
                        <span>{percent}%</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground">Add your first module in Application Script.</p>
                )}
                <small className="text-[11px] text-muted-foreground block mt-4">
                  Progress = completed tasks ÷ all linked tasks in module.
                </small>
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h2>Recent Activity</h2>
              </div>
              <div className="activity-list">
                {p.activity.map(a => (
                  <div className="activity-item" key={a.id}>
                    <span className="avatar tiny">
                      {a.actor?.name.slice(0, 2).toUpperCase() ?? "BF"}
                    </span>
                    <p>
                      <b>{a.actor?.name ?? "System"}</b> {a.action}
                      <small>{new Date(a.createdAt).toLocaleString()}</small>
                    </p>
                  </div>
                ))}
                {!p.activity.length && (
                  <p className="text-xs text-muted-foreground py-4">No recent activity logged.</p>
                )}
              </div>
            </article>
          </div>
        </div>
      )}

      {/* TASKS VIEW */}
      {view === "tasks" && (() => {
        const TASK_COLUMNS = [
          { id: "BACKLOG", label: "Backlog", dot: "bg-muted-foreground", badgeBg: "bg-muted text-muted-foreground" },
          { id: "READY", label: "Ready", dot: "bg-[#0063fa]", badgeBg: "bg-[#0063fa]/10 text-[#0063fa]" },
          { id: "IN_PROGRESS", label: "In Progress", dot: "bg-[#7033ff]", badgeBg: "bg-[#7033ff]/10 text-[#7033ff]" },
          { id: "CODE_REVIEW", label: "In Review", dot: "bg-[#ff8229]", badgeBg: "bg-[#ff8229]/10 text-[#ff8229]" },
          { id: "QA", label: "QA Testing", dot: "bg-[#ff3136]", badgeBg: "bg-[#ff3136]/10 text-[#ff3136]" },
          { id: "DONE", label: "Completed", dot: "bg-[#31e183]", badgeBg: "bg-[#31e183]/15 text-[#0fa95d]" },
        ] as const;

        const filteredTasks = p.tasks.filter(t => {
          const matchesQuery =
            !query ||
            t.title.toLowerCase().includes(query.toLowerCase()) ||
            (t.section?.title && t.section.title.toLowerCase().includes(query.toLowerCase())) ||
            t.id.toLowerCase().includes(query.toLowerCase());
          const matchesAssignee =
            taskAssigneeFilter === "ALL"
              ? true
              : taskAssigneeFilter === "UNASSIGNED"
              ? !t.assigneeId
              : t.assigneeId === taskAssigneeFilter;
          const matchesPriority =
            taskPriorityFilter === "ALL" ? true : t.priority === taskPriorityFilter;
          return matchesQuery && matchesAssignee && matchesPriority;
        });

        return (
          <div className="space-y-5">
            {/* Notion Controls: View Switcher & Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/80">
              {/* View Switcher Tabs */}
              <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border border-border/60">
                <button
                  type="button"
                  className={`notion-view-btn ${taskViewMode === "board" ? "active" : ""}`}
                  onClick={() => setTaskViewMode("board")}
                >
                  <Kanban size={13} />
                  Board
                </button>
                <button
                  type="button"
                  className={`notion-view-btn ${taskViewMode === "table" ? "active" : ""}`}
                  onClick={() => setTaskViewMode("table")}
                >
                  <Table size={13} />
                  Table
                </button>
                <button
                  type="button"
                  className={`notion-view-btn ${taskViewMode === "list" ? "active" : ""}`}
                  onClick={() => setTaskViewMode("list")}
                >
                  <List size={13} />
                  List
                </button>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[200px]">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="Search tasks or specs…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-card border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>

                <select
                  value={taskPriorityFilter}
                  onChange={e => setTaskPriorityFilter(e.target.value)}
                  aria-label="Filter tasks by priority"
                  className="text-xs bg-card border border-input rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                <select
                  value={taskAssigneeFilter}
                  onChange={e => setTaskAssigneeFilter(e.target.value)}
                  aria-label="Filter tasks by assignee"
                  className="text-xs bg-card border border-input rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="ALL">All Assignees</option>
                  <option value="UNASSIGNED">Unassigned</option>
                  {p.members.map(m => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>

                {(query || taskPriorityFilter !== "ALL" || taskAssigneeFilter !== "ALL") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setQuery("");
                      setTaskPriorityFilter("ALL");
                      setTaskAssigneeFilter("ALL");
                    }}
                  >
                    Clear filters
                  </Button>
                )}

                <Button onClick={() => createTaskModal()} size="sm" className="gap-1.5 whitespace-nowrap h-8">
                  <Plus size={14} /> New Task
                </Button>
              </div>
            </div>

            {/* 1. NOTION DRAGGABLE BOARD VIEW */}
            {taskViewMode === "board" && (
              <div className="board">
                {TASK_COLUMNS.map(col => {
                  const columnTasks = filteredTasks.filter(t => t.status === col.id);
                  const isDropTarget = dragOverColumn === col.id;

                  return (
                    <section
                      className={`column ${isDropTarget ? "drag-over" : ""}`}
                      key={col.id}
                      onDragOver={e => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverColumn !== col.id) {
                          setDragOverColumn(col.id);
                        }
                      }}
                      onDragLeave={e => {
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                        setDragOverColumn(null);
                      }}
                      onDrop={e => {
                        void handleTaskDrop(e, col.id);
                      }}
                    >
                      {/* Column Header */}
                      <div className="column-head justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                          <span>{col.label}</span>
                          <span>{columnTasks.length}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => createTaskModal(col.id)}
                          title={`Add task in ${col.label}`}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Drop indicator placeholder */}
                      {isDropTarget && (
                        <div className="notion-drop-indicator animate-pulse">
                          <Plus size={13} className="inline mr-1" /> Drop task here
                        </div>
                      )}

                      {/* Cards */}
                      <div className="flex flex-col gap-2.5 flex-1">
                        {columnTasks.map(t => {
                          const isBlocked =
                            Boolean(t.blockedReason) ||
                            t.dependencies.some(d => d.dependsOn.status !== "DONE");

                          return (
                            <article
                              className={`task-card cursor-pointer group ${
                                draggedTaskId === t.id ? "is-dragging" : ""
                              }`}
                              key={t.id}
                              draggable={true}
                              onDragStart={e => {
                                setDraggedTaskId(t.id);
                                e.dataTransfer.setData("text/plain", t.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => {
                                setDraggedTaskId(null);
                                setDragOverColumn(null);
                              }}
                              onClick={() => router.push(`?task=${t.id}`)}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span title="Drag to change status" className="inline-flex items-center">
                                    <GripVertical
                                      size={13}
                                      className="text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab"
                                    />
                                  </span>
                                  <span className="id truncate">
                                    {t.id.slice(-6)} · {t.section?.title ?? "Backlog"}
                                  </span>
                                </div>
                                {isBlocked && (
                                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 shrink-0">
                                    Blocked
                                  </Badge>
                                )}
                              </div>

                              <h3 className="line-clamp-2 my-2 font-semibold text-[13px] text-foreground">
                                {t.title}
                              </h3>

                              <div className="task-meta">
                                <span className={`priority ${t.priority.toLowerCase()}`}>
                                  {t.priority}
                                </span>
                                {t.dependencies.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                                    <LinkIcon size={10} />
                                    {t.dependencies.length} deps
                                  </span>
                                )}
                                {t.githubLink && (
                                  <span className="text-[10px] text-primary flex items-center gap-1 font-mono">
                                    <GitPullRequest size={10} />
                                    PR
                                  </span>
                                )}
                                <span
                                  className="avatar tiny ml-auto"
                                  title={t.assignee?.name ?? "Unassigned"}
                                >
                                  {t.assignee?.name ? t.assignee.name.slice(0, 2).toUpperCase() : "–"}
                                </span>
                              </div>

                              {/* Quick Action Button */}
                              <div
                                className="mt-3 pt-2 border-t border-border flex flex-col gap-1.5"
                                onClick={e => e.stopPropagation()}
                              >
                                {col.id === "READY" && !t.assigneeId && !isBlocked && (
                                  <Button
                                    size="sm"
                                    disabled={busy}
                                    onClick={() =>
                                      void run(() => mutate(`/api/tasks/${t.id}/claim`, {}))
                                    }
                                  >
                                    Claim Task
                                  </Button>
                                )}
                                {col.id === "BACKLOG" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      void run(() =>
                                        mutate(`/api/tasks/${t.id}/transition`, { to: "READY" })
                                      )
                                    }
                                  >
                                    Mark Ready
                                  </Button>
                                )}
                                {col.id === "IN_PROGRESS" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      void run(() =>
                                        mutate(`/api/tasks/${t.id}/transition`, { to: "CODE_REVIEW" })
                                      )
                                    }
                                  >
                                    Request Review
                                  </Button>
                                )}
                                {col.id === "CODE_REVIEW" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      void run(() =>
                                        mutate(`/api/tasks/${t.id}/transition`, { to: "QA" })
                                      )
                                    }
                                  >
                                    Send to QA
                                  </Button>
                                )}
                                {col.id === "QA" && (
                                  <Button
                                    size="sm"
                                    className="bg-[#31e183]/20 text-[#0fa95d] hover:bg-[#31e183]/30"
                                    onClick={() =>
                                      void run(() =>
                                        mutate(`/api/tasks/${t.id}/transition`, { to: "DONE" })
                                      )
                                    }
                                  >
                                    Complete
                                  </Button>
                                )}
                                {!["DONE", "BACKLOG", "READY"].includes(col.id) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-[11px]"
                                    onClick={() =>
                                      setForm({
                                        title: "Link Pull Request",
                                        fields: [
                                          {
                                            name: "prUrl",
                                            label: "Pull Request URL (HTTPS)",
                                            type: "url",
                                            value: t.githubLink?.prUrl,
                                            required: true,
                                          },
                                          {
                                            name: "branch",
                                            label: "Branch Name",
                                            value: t.githubLink?.branch ?? "feature/implementation",
                                            required: true,
                                          },
                                        ],
                                        submit: v => items({ kind: "pr", taskId: t.id, ...v }),
                                      })
                                    }
                                  >
                                    <GitPullRequest size={12} /> {t.githubLink ? "Update PR" : "Link PR"}
                                  </Button>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      {/* Column Footer: Quick Add */}
                      <button
                        type="button"
                        onClick={() => createTaskModal(col.id)}
                        className="w-full text-left py-2 px-2.5 rounded-lg text-xs text-muted-foreground hover:bg-card hover:text-foreground flex items-center gap-1.5 transition-colors mt-2 border border-dashed border-transparent hover:border-border cursor-pointer"
                      >
                        <Plus size={13} /> New
                      </button>
                    </section>
                  );
                })}
              </div>
            )}

            {/* 2. NOTION TABLE VIEW */}
            {taskViewMode === "table" && (
              <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Task Name</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Assignee</th>
                      <th className="py-2.5 px-3">Specification</th>
                      <th className="py-2.5 px-3">Dependencies</th>
                      <th className="py-2.5 px-3">PR</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground">
                          No tasks match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map(t => {
                        const col = TASK_COLUMNS.find(c => c.id === t.status) ?? TASK_COLUMNS[0];
                        const isBlocked =
                          Boolean(t.blockedReason) ||
                          t.dependencies.some(d => d.dependsOn.status !== "DONE");

                        return (
                          <tr
                            key={t.id}
                            className="hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => router.push(`?task=${t.id}`)}
                          >
                            <td className="py-3 px-3 font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  #{t.id.slice(-6)}
                                </span>
                                <span>{t.title}</span>
                                {isBlocked && (
                                  <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                                    Blocked
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${col.badgeBg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                                {col.label}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`priority ${t.priority.toLowerCase()}`}>
                                {t.priority}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="avatar tiny">
                                  {t.assignee?.name ? t.assignee.name.slice(0, 2).toUpperCase() : "–"}
                                </span>
                                <span className="text-muted-foreground truncate max-w-[100px]">
                                  {t.assignee?.name ?? "Unassigned"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-muted-foreground">
                              {t.section?.title ? (
                                <span className="truncate max-w-[120px] inline-block font-mono text-[11px]">
                                  {t.section.title}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/60">–</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {t.dependencies.length > 0 ? (
                                <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                                  <LinkIcon size={11} /> {t.dependencies.length}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/60">–</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {t.githubLink ? (
                                <a
                                  href={t.githubLink.prUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-primary hover:underline font-mono text-[11px] inline-flex items-center gap-1"
                                >
                                  <GitPullRequest size={11} /> PR
                                </a>
                              ) : (
                                <span className="text-muted-foreground/60">–</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {t.status === "READY" && !t.assigneeId && !isBlocked && (
                                  <Button
                                    size="sm"
                                    onClick={() => void run(() => mutate(`/api/tasks/${t.id}/claim`, {}))}
                                  >
                                    Claim
                                  </Button>
                                )}
                                {t.status === "BACKLOG" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      void run(() => mutate(`/api/tasks/${t.id}/transition`, { to: "READY" }))
                                    }
                                  >
                                    Ready
                                  </Button>
                                )}
                                {t.status === "IN_PROGRESS" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      void run(() => mutate(`/api/tasks/${t.id}/transition`, { to: "CODE_REVIEW" }))
                                    }
                                  >
                                    Review
                                  </Button>
                                )}
                                {t.status === "CODE_REVIEW" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      void run(() => mutate(`/api/tasks/${t.id}/transition`, { to: "QA" }))
                                    }
                                  >
                                    QA
                                  </Button>
                                )}
                                {t.status === "QA" && (
                                  <Button
                                    size="sm"
                                    className="bg-[#31e183]/20 text-[#0fa95d] hover:bg-[#31e183]/30"
                                    onClick={() =>
                                      void run(() => mutate(`/api/tasks/${t.id}/transition`, { to: "DONE" }))
                                    }
                                  >
                                    Done
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. NOTION LIST VIEW */}
            {taskViewMode === "list" && (
              <div className="space-y-4">
                {TASK_COLUMNS.map(col => {
                  const groupTasks = filteredTasks.filter(t => t.status === col.id);
                  return (
                    <div key={col.id} className="rounded-xl border border-border bg-card p-4 shadow-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-border/60">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                          <span>{col.label}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                            {groupTasks.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => createTaskModal(col.id)}
                          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Plus size={13} /> Add task
                        </button>
                      </div>
                      {groupTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 italic">No tasks in {col.label.toLowerCase()}.</p>
                      ) : (
                        <div className="divide-y divide-border/40 mt-1">
                          {groupTasks.map(t => {
                            const isBlocked =
                              Boolean(t.blockedReason) ||
                              t.dependencies.some(d => d.dependsOn.status !== "DONE");

                            return (
                              <div
                                key={t.id}
                                className="py-2.5 px-2 flex items-center justify-between hover:bg-muted/30 rounded-lg cursor-pointer transition-colors group"
                                onClick={() => router.push(`?task=${t.id}`)}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                                    #{t.id.slice(-6)}
                                  </span>
                                  <span className="text-xs font-semibold text-foreground truncate max-w-[260px] md:max-w-md">
                                    {t.title}
                                  </span>
                                  {isBlocked && (
                                    <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                                      Blocked
                                    </Badge>
                                  )}
                                  {t.section?.title && (
                                    <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded truncate max-w-[120px] hidden sm:inline-block">
                                      {t.section.title}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                                  <span className={`priority ${t.priority.toLowerCase()}`}>
                                    {t.priority}
                                  </span>
                                  <span
                                    className="avatar tiny"
                                    title={t.assignee?.name ?? "Unassigned"}
                                  >
                                    {t.assignee?.name ? t.assignee.name.slice(0, 2).toUpperCase() : "–"}
                                  </span>
                                  {t.status === "READY" && !t.assigneeId && !isBlocked && (
                                    <Button
                                      size="sm"
                                      onClick={() => void run(() => mutate(`/api/tasks/${t.id}/claim`, {}))}
                                    >
                                      Claim
                                    </Button>
                                  )}
                                  {t.status === "BACKLOG" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        void run(() => mutate(`/api/tasks/${t.id}/transition`, { to: "READY" }))
                                      }
                                    >
                                      Ready
                                    </Button>
                                  )}
                                  {t.status === "IN_PROGRESS" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        void run(() => mutate(`/api/tasks/${t.id}/transition`, { to: "CODE_REVIEW" }))
                                      }
                                    >
                                      Review
                                    </Button>
                                  )}
                                  {t.status === "CODE_REVIEW" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        void run(() => mutate(`/api/tasks/${t.id}/transition`, { to: "QA" }))
                                      }
                                    >
                                      QA
                                    </Button>
                                  )}
                                  {t.status === "QA" && (
                                    <Button
                                      size="sm"
                                      className="bg-[#31e183]/20 text-[#0fa95d] hover:bg-[#31e183]/30"
                                      onClick={() =>
                                        void run(() => mutate(`/api/tasks/${t.id}/transition`, { to: "DONE" }))
                                      }
                                    >
                                      Done
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* SCRIPT EXPLORER VIEW */}
      {view === "script" && (
        <div className="script-layout">
          <aside className="panel">
            <div className="panel-head">
              <h2>Specification Tree</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setForm({
                    title: "New Module",
                    fields: [{ name: "name", label: "Module Name", required: true }],
                    submit: v => items({ kind: "module", ...v }),
                  })
                }
              >
                + Module
              </Button>
            </div>
            <div className="tree">
              {p.modules.map(m => (
                <div key={m.id} className="mb-3">
                  <div className="tree-title flex items-center justify-between bg-muted/50">
                    <span className="flex items-center gap-2 font-bold text-xs">
                      <Layers3 size={14} className="text-primary" />
                      {m.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          void run(() =>
                            items({ kind: "reorder", itemType: "module", id: m.id, direction: "up" })
                          )
                        }
                        className="p-1 hover:bg-card rounded"
                        title="Move Up"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={() =>
                          void run(() =>
                            items({ kind: "reorder", itemType: "module", id: m.id, direction: "down" })
                          )
                        }
                        className="p-1 hover:bg-card rounded"
                        title="Move Down"
                      >
                        <ChevronDown size={12} />
                      </button>
                      <button
                        onClick={() =>
                          setForm({
                            title: `New Page in ${m.name}`,
                            fields: [
                              { name: "name", label: "Page Name", required: true },
                              { name: "route", label: "Route Path (e.g. /dashboard)", value: "/", required: true },
                            ],
                            submit: v => items({ kind: "page", moduleId: m.id, ...v }),
                          })
                        }
                        className="p-1 text-primary hover:bg-card rounded font-bold"
                        title="Add Page"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {m.pages.map(page => (
                    <div className="tree-pages mt-1" key={page.id}>
                      <div className="flex items-center justify-between py-1 text-xs font-semibold text-muted-foreground">
                        <span>{page.name} <small className="font-mono text-[10px]">({page.route})</small></span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              void run(() =>
                                items({ kind: "reorder", itemType: "page", id: page.id, direction: "up" })
                              )
                            }
                            className="p-0.5 hover:bg-muted rounded"
                            title="Move Up"
                          >
                            <ChevronUp size={11} />
                          </button>
                          <button
                            onClick={() =>
                              void run(() =>
                                items({ kind: "reorder", itemType: "page", id: page.id, direction: "down" })
                              )
                            }
                            className="p-0.5 hover:bg-muted rounded"
                            title="Move Down"
                          >
                            <ChevronDown size={11} />
                          </button>
                        </div>
                      </div>

                      {page.sections.map(s => (
                        <div
                          key={s.id}
                          className={`flex items-center justify-between rounded-md my-0.5 ${
                            activeSection?.id === s.id ? "bg-accent text-accent-foreground font-bold" : "hover:bg-muted/60"
                          }`}
                        >
                          <button
                            className="tree-page flex-1 text-left"
                            onClick={() => setSelectedSectionId(s.id)}
                          >
                            {s.title}
                          </button>
                          <div className="flex items-center gap-0.5 pr-1 opacity-70 hover:opacity-100">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                void run(() =>
                                  items({ kind: "reorder", itemType: "section", id: s.id, direction: "up" })
                                );
                              }}
                              className="p-0.5"
                              title="Move Up"
                            >
                              <ChevronUp size={10} />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                void run(() =>
                                  items({ kind: "reorder", itemType: "section", id: s.id, direction: "down" })
                                );
                              }}
                              className="p-0.5"
                              title="Move Down"
                            >
                              <ChevronDown size={10} />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        className="text-[11px] text-primary font-semibold hover:underline mt-1.5 block"
                        onClick={() =>
                          setForm({
                            title: `New Section in ${page.name}`,
                            fields: [{ name: "title", label: "Section Title", required: true }],
                            submit: v => items({ kind: "section", pageId: page.id, ...v }),
                          })
                        }
                      >
                        + Add Section
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </aside>

          <article className="panel editor">
            {activeSection ? (
              <SpecEditor
                key={`${activeSection.id}-${activeSection.version}`}
                section={activeSection}
                project={p}
                role={p.viewer.role}
                save={values =>
                  run(() =>
                    items({
                      kind: "spec",
                      id: activeSection.id,
                      version: activeSection.version,
                      ...values,
                    })
                  )
                }
                createTask={() =>
                  setForm({
                    title: "Create Linked Task",
                    fields: [
                      { name: "title", label: "Task Title", value: activeSection.title, required: true },
                      {
                        name: "priority",
                        label: "Priority",
                        options: ["MEDIUM", "HIGH", "LOW", "URGENT"],
                      },
                    ],
                    submit: v =>
                      mutate("/api/tasks", {
                        projectId: p.id,
                        sectionId: activeSection.id,
                        ...v,
                      }),
                  })
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Create a module, page, and section in the tree to begin your specification.
              </p>
            )}
          </article>
        </div>
      )}

      {/* QA QUEUE VIEW */}
      {view === "qa" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold">Awaiting Verification & Gates</h2>
              <p className="text-xs text-muted-foreground">
                Review code deliverables, run test suites, record evidence, and accept or reject.
              </p>
            </div>
          </div>

          {p.tasks.filter(t => ["CODE_REVIEW", "QA", "IN_PROGRESS"].includes(t.status)).map(t => (
            <article className="panel editor" key={t.id}>
              <div className="editor-top flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{t.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.testCases.length} Test cases · {t.qaAccepted ? "QA Accepted" : "Pending Acceptance"}
                    {t.githubLink?.prUrl && (
                      <span className="ml-3 font-mono text-primary">
                        <a href={t.githubLink.prUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                          PR Link <ExternalLink size={12} />
                        </a>
                      </span>
                    )}
                  </p>
                </div>
                <Badge variant={t.status === "QA" ? "warning" : "secondary"}>
                  {label(t.status)}
                </Badge>
              </div>

              {/* Test Cases Checklist */}
              <div className="space-y-3 mt-4">
                {t.testCases.map(test => {
                  const lastRun = test.runs[0];
                  return (
                    <div
                      className="p-3.5 rounded-lg border border-border bg-card flex items-start justify-between gap-4"
                      key={test.id}
                    >
                      <div className="space-y-1">
                        <b className="text-xs">{test.title}</b>
                        <p className="text-[11px] text-muted-foreground">Steps: {test.steps}</p>
                        <p className="text-[11px] text-foreground font-medium">Expected: {test.expectedResult}</p>
                        {lastRun && (
                          <div className="text-[10px] text-muted-foreground pt-1">
                            Last Run: <Badge variant={lastRun.status === "PASSED" ? "success" : "destructive"}>{lastRun.status}</Badge>
                            {lastRun.notes && <span className="ml-2 italic font-mono">&ldquo;{lastRun.notes}&rdquo;</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-[#31e183]/10 text-[#0fa95d] hover:bg-[#31e183]/20"
                          onClick={() =>
                            setForm({
                              title: `Record Passed Result: ${test.title}`,
                              fields: [{ name: "notes", label: "Evidence / Test Notes", type: "textarea" }],
                              submit: v => items({ kind: "run", id: test.id, status: "PASSED", ...v }),
                            })
                          }
                        >
                          Pass
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                          onClick={() =>
                            setForm({
                              title: `Record Failed Result: ${test.title}`,
                              fields: [{ name: "notes", label: "Failure Notes / Reproduction", type: "textarea", required: true }],
                              submit: v => items({ kind: "run", id: test.id, status: "FAILED", ...v }),
                            })
                          }
                        >
                          Fail
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* QA Gate Actions */}
              <div className="header-actions mt-5 pt-4 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      title: "Add Test Case",
                      fields: [
                        { name: "title", label: "Test Case Title", required: true },
                        { name: "steps", label: "Execution Steps", type: "textarea", required: true },
                        { name: "expectedResult", label: "Expected Result", type: "textarea", required: true },
                      ],
                      submit: v => items({ kind: "test", taskId: t.id, ...v }),
                    })
                  }
                >
                  + Add Test Case
                </Button>
                {t.status === "QA" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => void run(() => items({ kind: "accept", taskId: t.id, accepted: true }))}
                    >
                      <ShieldCheck size={14} /> Accept QA
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void run(() => items({ kind: "accept", taskId: t.id, accepted: false }))}
                    >
                      Return to Implementation
                    </Button>
                  </>
                )}
              </div>
            </article>
          ))}

          {!p.tasks.some(t => ["CODE_REVIEW", "QA", "IN_PROGRESS"].includes(t.status)) && (
            <p className="text-xs text-muted-foreground py-6">No tasks currently awaiting verification.</p>
          )}
        </div>
      )}

      {/* BUGS VIEW */}
      {view === "bugs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(sev => (
                <Button
                  key={sev}
                  size="sm"
                  variant={bugSeverityFilter === sev ? "default" : "outline"}
                  onClick={() => setBugSeverityFilter(sev)}
                >
                  {sev}
                </Button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground font-semibold">
              {p.bugs.filter(b => b.status !== "VERIFIED").length} Open Issues
            </div>
          </div>

          <article className="panel">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Issue Title</th>
                  <th>Severity</th>
                  <th>Linked Task / Section</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {p.bugs
                  .filter(b => bugSeverityFilter === "ALL" || b.severity === bugSeverityFilter)
                  .map(b => (
                    <tr
                      key={b.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => router.push(`?bug=${b.id}`)}
                    >
                      <td>
                        <b>{b.title}</b>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{b.reproductionSteps}</p>
                      </td>
                      <td>
                        <Badge
                          variant={
                            b.severity === "CRITICAL"
                              ? "destructive"
                              : b.severity === "HIGH"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {b.severity}
                        </Badge>
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {b.task?.title ?? b.section?.title ?? "Unlinked"}
                      </td>
                      <td>
                        <Badge variant={b.status === "VERIFIED" ? "success" : "outline"}>
                          {label(b.status)}
                        </Badge>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <select
                          aria-label="Bug Status"
                          value={b.status}
                          onChange={e =>
                            void run(() => items({ kind: "bugStatus", id: b.id, status: e.target.value }))
                          }
                          className="text-xs py-1 px-2"
                        >
                          {["OPEN", "IN_PROGRESS", "RESOLVED", "VERIFIED"].map(s => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!p.bugs.length && <p className="p-6 text-xs text-muted-foreground">No reported bugs.</p>}
          </article>
        </div>
      )}

      {/* TEAM VIEW */}
      {view === "team" && (
        <div className="space-y-6">
          <div className="team-grid">
            {p.members.map(m => (
              <article className="member-card" key={m.id}>
                <span className="avatar">
                  {m.user.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <b>{m.user.name}</b>
                  <small>{m.user.email}</small>
                </div>
                <div className="member-meta space-y-1">
                  {p.viewer.role === "OWNER" ? (
                    <select
                      value={m.role}
                      onChange={e =>
                        void run(() =>
                          items({ kind: "changeRole", memberId: m.id, role: e.target.value })
                        )
                      }
                      className="text-xs py-1"
                    >
                      {["DEVELOPER", "QA", "DESIGNER", "FINANCE", "OWNER"].map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant="accent">{label(m.role)}</Badge>
                  )}
                  <small className="block text-muted-foreground">
                    {p.tasks.filter(t => t.assigneeId === m.user.id).length} assigned tasks
                  </small>
                  {p.viewer.role === "OWNER" && m.user.id !== p.viewer.id && (
                    <button
                      onClick={() =>
                        void run(() => items({ kind: "revokeMember", memberId: m.id }))
                      }
                      className="text-[11px] text-destructive hover:underline mt-1 block"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* Pending Invitations List */}
          {p.invitations?.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Share2 size={16} className="text-primary" />
                  <CardTitle className="text-sm">Active Shareable Invitations</CardTitle>
                </div>
                <CardDescription>
                  Share these invite links with team members to let them join with the assigned role.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.invitations.map(inv => {
                  const inviteUrl = `${window.location.origin}/invite/${inv.token}`;
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs">{inv.email}</span>
                          <Badge variant="secondary">{inv.role}</Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => {
                            void navigator.clipboard.writeText(inviteUrl);
                            setMessage("Invitation link copied to clipboard");
                          }}
                        >
                          <Copy size={13} /> Copy Link
                        </Button>
                        {p.viewer.role === "OWNER" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void run(() => items({ kind: "revokeInvite", id: inv.id }))}
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* DECISIONS LOG VIEW */}
      {view === "decisions" && (
        <div className="space-y-6 max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Chronological Decisions Log</h2>
              <p className="text-xs text-muted-foreground">
                Immutable records of technical, architectural, and business choices made on this project.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() =>
                setForm({
                  title: "Record Project Decision",
                  fields: [
                    { name: "title", label: "Decision Title", required: true },
                    {
                      name: "rationale",
                      label: "Rationale & Context",
                      type: "textarea",
                      required: true,
                    },
                  ],
                  submit: v => items({ kind: "decision", ...v }),
                })
              }
            >
              + Record Decision
            </Button>
          </div>

          <div className="space-y-4">
            {p.decisions?.map(d => (
              <Card key={d.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">{d.title}</CardTitle>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <CardDescription>Decided by {d.decidedBy}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {d.rationale}
                  </p>
                </CardContent>
              </Card>
            ))}
            {!p.decisions?.length && (
              <p className="text-xs text-muted-foreground py-6">No decisions recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS VIEW */}
      {view === "settings" && (
        <Settings
          key={`${p.name}-${p.description}-${p.stack}-${p.developmentRules}`}
          project={p}
          save={v => run(() => mutate(base, v, "PATCH"))}
        />
      )}

      {/* TASK DETAIL DRAWER */}
      <Drawer
        isOpen={Boolean(activeTaskDrawer)}
        onClose={() => {
          router.push(window.location.pathname);
        }}
        title={activeTaskDrawer?.title}
        description={`Task ${activeTaskDrawer?.id.slice(-8)} · Status: ${label(
          activeTaskDrawer?.status ?? ""
        )}`}
      >
        {activeTaskDrawer && (
          <TaskDetailContent
            task={activeTaskDrawer}
            project={p}
            run={run}
            items={items}
          />
        )}
      </Drawer>

      {/* BUG DETAIL DRAWER */}
      <Drawer
        isOpen={Boolean(activeBugDrawer)}
        onClose={() => {
          router.push(window.location.pathname);
        }}
        title={activeBugDrawer?.title}
        description={`Bug ${activeBugDrawer?.id.slice(-8)} · Severity: ${activeBugDrawer?.severity}`}
      >
        {activeBugDrawer && (
          <BugDetailContent
            bug={activeBugDrawer}
            project={p}
            run={run}
            items={items}
          />
        )}
      </Drawer>

      {/* REUSABLE FORM MODAL */}
      {form && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={async e => {
              e.preventDefault();
              const values = Object.fromEntries(
                new FormData(e.currentTarget).entries()
              ) as Record<string, string>;
              setBusy(true);
              setMessage("");
              try {
                await form.submit(values);
                setForm(null);
                setMessage("Saved successfully");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Save failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2 className="text-lg font-bold mb-4">{form.title}</h2>
            {form.fields.map(f => (
              <div className="field" key={f.name}>
                <label htmlFor={f.name}>{f.label}</label>
                {f.options ? (
                  <select id={f.name} name={f.name} defaultValue={f.value}>
                    {f.options.map(o => (
                      <option key={o} value={o}>
                        {f.optionLabels?.[o] ?? o}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    id={f.name}
                    name={f.name}
                    defaultValue={f.value}
                    required={f.required}
                  />
                ) : (
                  <input
                    id={f.name}
                    name={f.name}
                    type={f.type ?? "text"}
                    defaultValue={f.value}
                    required={f.required}
                  />
                )}
              </div>
            ))}
            <div className="header-actions justify-end mt-6">
              <Button type="button" variant="outline" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                Save
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// 4-TAB SPECIFICATION EDITOR WITH AI PROMPT COMPOSER
function SpecEditor({
  section,
  project,
  role,
  save,
  createTask,
}: {
  section: SectionData;
  project: Workspace;
  role: string;
  save: (values: Record<string, string>) => Promise<void>;
  createTask: () => void;
}) {
  const [tab, setTab] = useState("script");
  const [copied, setCopied] = useState(false);

  const spec = section.specification ?? {};

  const handleCopyPrompt = () => {
    const aiPrompt = `# AI Development Task Specification

## Project Context
- **Project**: ${project.name}
- **Stack**: ${project.stack}
- **Repository**: ${project.repositoryUrl || "Not specified"}

## Development Rules & Conventions
${project.developmentRules || "Follow standard clean architecture and test coverage rules."}

## Target Section
- **Title**: ${section.title}
- **Approved Revision**: Version ${section.version} (${section.specStatus})

### 1. Objective & Scope
${spec.objective || "No objective documented."}

### 2. UI Layout & Visual Presentation
${spec.layout || "Standard responsive layout."}

### 3. User Actions & Behavior
${spec.actions || "No specific actions specified."}

### 4. Business Rules & Validation
${spec.rules || "No validation rules specified."}

### 5. API Contracts & Data Requirements
${spec.apiContracts || "Standard REST/Prisma contracts."}

### 6. Accessibility & Edge Cases
${spec.accessibility || "Follow WCAG standards."}

### 7. Acceptance Criteria
${spec.criteria || "Must pass all unit and regression tests."}

---
## Handoff Requirements
When creating the pull request, provide:
1. Files modified and any new migrations
2. Verification commands and test outcomes
3. Remaining risks or follow-up backlog tickets
`;
    void navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="editor-top flex items-center justify-between pb-4">
        <div>
          <h2>{section.title}</h2>
          <p>
            Revision {section.version} · Spec Status:{" "}
            <Badge variant={section.specStatus === "APPROVED" ? "success" : "secondary"}>
              {label(section.specStatus)}
            </Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCopyPrompt} className="gap-1.5">
            {copied ? <Check size={13} className="text-[#0fa95d]" /> : <Copy size={13} />}
            {copied ? "Prompt Copied!" : "Copy AI Prompt"}
          </Button>
          <Button size="sm" onClick={createTask}>
            Create Task
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="script">1. Specification</TabsTrigger>
          <TabsTrigger value="dev">2. Development & AI</TabsTrigger>
          <TabsTrigger value="testing">3. Testing & Acceptance</TabsTrigger>
          <TabsTrigger value="activity">4. Revision History</TabsTrigger>
        </TabsList>

        <form
          onSubmit={e => {
            e.preventDefault();
            void save(
              Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>
            );
          }}
          className="space-y-4 mt-4"
        >
          <TabsContent value="script" className="space-y-4">
            <div className="field">
              <label htmlFor="objective">Objective & User Purpose</label>
              <textarea
                id="objective"
                name="objective"
                defaultValue={spec.objective ?? ""}
                placeholder="What does this section accomplish for the user?"
              />
            </div>
            <div className="field">
              <label htmlFor="layout">UI Layout & UX Structure</label>
              <textarea
                id="layout"
                name="layout"
                defaultValue={spec.layout ?? ""}
                placeholder="Layout hierarchy, cards, grids, and visual components."
              />
            </div>
            <div className="field">
              <label htmlFor="actions">User Actions & Interactions</label>
              <textarea
                id="actions"
                name="actions"
                defaultValue={spec.actions ?? ""}
                placeholder="Buttons, inputs, form submits, and interactive flows."
              />
            </div>
            <div className="field">
              <label htmlFor="rules">Business Rules & Validation</label>
              <textarea
                id="rules"
                name="rules"
                defaultValue={spec.rules ?? ""}
                placeholder="Validation constraints, permissions, rate limits, edge rules."
              />
            </div>
          </TabsContent>

          <TabsContent value="dev" className="space-y-4">
            <div className="field">
              <label htmlFor="apiContracts">API Contracts & Endpoints</label>
              <textarea
                id="apiContracts"
                name="apiContracts"
                defaultValue={spec.apiContracts ?? ""}
                placeholder="Request / Response schemas, method, error status codes."
              />
            </div>
            <div className="field">
              <label htmlFor="dataReqs">Data Requirements & State</label>
              <textarea
                id="dataReqs"
                name="dataReqs"
                defaultValue={spec.dataReqs ?? ""}
                placeholder="Database models, fields, relations, and caching."
              />
            </div>
            <div className="field">
              <label htmlFor="accessibility">Accessibility & States</label>
              <textarea
                id="accessibility"
                name="accessibility"
                defaultValue={spec.accessibility ?? ""}
                placeholder="Loading, empty, error states and keyboard/screen-reader accessibility."
              />
            </div>
          </TabsContent>

          <TabsContent value="testing" className="space-y-4">
            <div className="field">
              <label htmlFor="criteria">Acceptance Criteria</label>
              <textarea
                id="criteria"
                name="criteria"
                defaultValue={spec.criteria ?? ""}
                placeholder="Verifiable criteria required for QA release sign-off."
              />
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase">Past Revisions</h3>
            {section.revisions?.map(rev => (
              <div
                key={rev.id}
                className="p-3 rounded-lg border border-border bg-card flex justify-between items-center"
              >
                <div>
                  <span className="font-bold text-xs">Version {rev.version}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(rev.createdAt).toLocaleString()} · {rev.specStatus}
                  </p>
                </div>
                <Badge variant={rev.specStatus === "APPROVED" ? "success" : "secondary"}>
                  {rev.specStatus}
                </Badge>
              </div>
            ))}
            {!section.revisions?.length && (
              <p className="text-xs text-muted-foreground">No prior revisions stored.</p>
            )}
          </TabsContent>

          {/* Form Actions footer */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold">Status:</label>
              <select
                name="status"
                defaultValue={section.specStatus}
                className="text-xs py-1 px-3"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                {role === "OWNER" && <option value="APPROVED">APPROVED</option>}
              </select>
            </div>
            <Button type="submit">Save Revision</Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
}

// SLIDE-OVER TASK DETAIL DRAWER CONTENT
function TaskDetailContent({
  task,
  project,
  run,
  items,
}: {
  task: TaskData;
  project: Workspace;
  run: (action: () => Promise<void>) => Promise<void>;
  items: (body: unknown) => Promise<void>;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || "");
  const [blockedReason, setBlockedReason] = useState(task.blockedReason || "");
  const [selectedDepId, setSelectedDepId] = useState("");

  const handleUpdate = () => {
    void run(() =>
      items({
        kind: "taskUpdate",
        id: task.id,
        title,
        description,
        priority,
        assigneeId: assigneeId || null,
        blockedReason: blockedReason || null,
      })
    );
  };

  const availableDependencyTasks = project.tasks.filter(
    t => t.id !== task.id && !task.dependencies.some(d => d.dependsOn.id === t.id)
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="field">
          <label>Task Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="field">
            <label>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Assignee</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {project.members.map(m => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name} ({m.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Blocked Reason (Leave empty if not blocked)</label>
          <input
            value={blockedReason}
            onChange={e => setBlockedReason(e.target.value)}
            placeholder="Reason this task is currently blocked..."
          />
        </div>

        <div className="field">
          <label>Description & Implementation Notes</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="Details, design specifications, checklist..."
          />
        </div>

        <Button onClick={handleUpdate}>Save Task Changes</Button>
      </div>

      {/* Task Dependencies Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Task Dependencies</CardTitle>
          <CardDescription>
            This task cannot be claimed or marked Ready until all prerequisite tasks are completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {task.dependencies.map(d => (
              <div
                key={d.dependsOn.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-xs"
              >
                <div>
                  <span className="font-semibold">{d.dependsOn.title}</span>
                  <Badge
                    variant={d.dependsOn.status === "DONE" ? "success" : "secondary"}
                    className="ml-2"
                  >
                    {d.dependsOn.status}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void run(() =>
                      items({
                        kind: "dependency",
                        taskId: task.id,
                        dependsOnTaskId: d.dependsOn.id,
                        action: "remove",
                      })
                    )
                  }
                >
                  <Trash2 size={13} className="text-destructive" />
                </Button>
              </div>
            ))}
            {!task.dependencies.length && (
              <p className="text-xs text-muted-foreground">No prerequisites required.</p>
            )}
          </div>

          {availableDependencyTasks.length > 0 && (
            <div className="flex gap-2 pt-2 border-t border-border">
              <select
                value={selectedDepId}
                onChange={e => setSelectedDepId(e.target.value)}
                className="text-xs flex-1"
              >
                <option value="">Select prerequisite task…</option>
                {availableDependencyTasks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.status})
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={!selectedDepId}
                onClick={() => {
                  if (!selectedDepId) return;
                  void run(() =>
                    items({
                      kind: "dependency",
                      taskId: task.id,
                      dependsOnTaskId: selectedDepId,
                      action: "add",
                    })
                  );
                  setSelectedDepId("");
                }}
              >
                + Add Dependency
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Pull Request / Branch */}
      {task.githubLink && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pull Request & Branch</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p>
              Branch: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{task.githubLink.branch}</code>
            </p>
            <p>
              PR:{" "}
              <a
                href={task.githubLink.prUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-mono inline-flex items-center gap-1"
              >
                {task.githubLink.prUrl} <ExternalLink size={12} />
              </a>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// SLIDE-OVER BUG DETAIL DRAWER CONTENT
function BugDetailContent({
  bug,
  project,
  run,
  items,
}: {
  bug: BugData;
  project: Workspace;
  run: (action: () => Promise<void>) => Promise<void>;
  items: (body: unknown) => Promise<void>;
}) {
  const [title, setTitle] = useState(bug.title);
  const [severity, setSeverity] = useState(bug.severity);
  const [status, setStatus] = useState(bug.status);
  const [reproductionSteps, setReproductionSteps] = useState(bug.reproductionSteps);
  const [expectedResult, setExpectedResult] = useState(bug.expectedResult || "");
  const [actualResult, setActualResult] = useState(bug.actualResult || "");
  const [assigneeId, setAssigneeId] = useState(bug.assignee?.id || "");
  const [taskId, setTaskId] = useState(bug.task?.id || "");

  const handleSave = () => {
    void run(() =>
      items({
        kind: "bugUpdate",
        id: bug.id,
        title,
        severity,
        status,
        reproductionSteps,
        expectedResult,
        actualResult,
        assigneeId: assigneeId || null,
        taskId: taskId || null,
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="field">
        <label>Issue Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="field">
          <label>Severity</label>
          <select value={severity} onChange={e => setSeverity(e.target.value as BugData["severity"])}>
            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as BugData["status"])}>
            {["OPEN", "IN_PROGRESS", "RESOLVED", "VERIFIED"].map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="field">
          <label>Assignee</label>
          <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
            <option value="">Unassigned</option>
            {project.members.map(m => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name} ({m.role})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Linked Task</label>
          <select value={taskId} onChange={e => setTaskId(e.target.value)}>
            <option value="">None</option>
            {project.tasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Reproduction Steps</label>
        <textarea
          value={reproductionSteps}
          onChange={e => setReproductionSteps(e.target.value)}
          rows={3}
        />
      </div>

      <div className="field">
        <label>Expected Result</label>
        <textarea
          value={expectedResult}
          onChange={e => setExpectedResult(e.target.value)}
          rows={2}
        />
      </div>

      <div className="field">
        <label>Actual Result</label>
        <textarea
          value={actualResult}
          onChange={e => setActualResult(e.target.value)}
          rows={2}
        />
      </div>

      <Button onClick={handleSave}>Save Bug Details</Button>
    </div>
  );
}

// PROJECT SETTINGS FORM
function Settings({
  project,
  save,
}: {
  project: Workspace;
  save: (v: Record<string, string>) => Promise<void>;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 max-w-2xl">
      {/* THEME & APPEARANCE PANEL */}
      <div className="panel editor">
        <h2 className="text-base font-bold mb-2">Interface Theme & Appearance</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Configured with the tweakcn BuildFlow theme (ID: cmv2r10o1000004kwde4w7zcs).
        </p>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
              theme === "light"
                ? "border-primary bg-accent/30 ring-2 ring-primary/20"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            <div className="flex items-center justify-between">
              <Sun size={17} className="text-primary" />
              {theme === "light" && <span className="h-2 w-2 rounded-full bg-primary" />}
            </div>
            <div>
              <b className="text-xs block font-bold text-foreground">Light Mode</b>
              <small className="text-[10px] text-muted-foreground">Crisp #fdfdfd base</small>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
              theme === "dark"
                ? "border-primary bg-accent/30 ring-2 ring-primary/20"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            <div className="flex items-center justify-between">
              <Moon size={17} className="text-primary" />
              {theme === "dark" && <span className="h-2 w-2 rounded-full bg-primary" />}
            </div>
            <div>
              <b className="text-xs block font-bold text-foreground">Dark Mode</b>
              <small className="text-[10px] text-muted-foreground">Sleek #191b1f base</small>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme("system")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
              theme === "system"
                ? "border-primary bg-accent/30 ring-2 ring-primary/20"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            <div className="flex items-center justify-between">
              <Monitor size={17} className="text-primary" />
              {theme === "system" && <span className="h-2 w-2 rounded-full bg-primary" />}
            </div>
            <div>
              <b className="text-xs block font-bold text-foreground">System Match</b>
              <small className="text-[10px] text-muted-foreground">Sync with OS scheme</small>
            </div>
          </button>
        </div>

        {/* Theme Palette Indicators */}
        <div className="p-3 rounded-lg border border-border bg-muted/40 flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium text-[11px]">Active Color Tokens:</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="h-3.5 w-3.5 rounded-full bg-primary border border-border" /> Primary (#7033ff / #8c5cff)
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="h-3.5 w-3.5 rounded-full bg-accent border border-border" /> Accent
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="h-3.5 w-3.5 rounded-full bg-[#31e183] border border-border" /> Success
            </span>
          </div>
        </div>
      </div>

      {/* PROJECT CONVENTIONS FORM */}
      <form
        className="panel editor"
        onSubmit={e => {
          e.preventDefault();
          void save(
            Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>
          );
        }}
      >
        <h2 className="text-base font-bold mb-4">Project Conventions & Metadata</h2>
        {[
          ["name", "Project Name"],
          ["description", "Description"],
          ["stack", "Technology Stack"],
          ["repositoryUrl", "Repository URL"],
          ["developmentRules", "AI Coding Rules & Architecture Guidelines"],
        ].map(([key, title]) => (
          <div className="field" key={key}>
            <label htmlFor={key}>{title}</label>
            <textarea
              id={key}
              name={key}
              defaultValue={String(project[key as keyof Workspace] ?? "")}
            />
          </div>
        ))}
        <Button type="submit" disabled={project.viewer.role !== "OWNER"}>
          Save Settings
        </Button>
      </form>
    </div>
  );
}

