"use client";
import Link from "next/link";
import { useState } from "react";
import { PageHeader, StatCard, StatusPill } from "./ui";
import { CircleCheck, Clock3, GitPullRequest, AlertTriangle, Plus, ChevronDown, Layers3 } from "./icons";
import { SectionData, Workspace, useWorkspace } from "./workspace-provider";

const label = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
type Field = { name: string; label: string; options?: string[]; optionLabels?: Record<string,string>; type?: string; value?: string };
type FormSpec = { title: string; fields: Field[]; submit: (values: Record<string, string>) => Promise<void> };

export function WorkspaceView({ view }: { view: string }) {
  const { data, error, reload, mutate } = useWorkspace();
  const [form, setForm] = useState<FormSpec | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await action(); setMessage("Saved successfully"); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  }
  if (!data) return <div className="content"><h1>{error ? "Unable to load workspace" : "Loading workspace…"}</h1>{error && <><p role="alert">{error}</p><button className="button" onClick={() => void reload()}>Retry</button><Link className="button" href="/projects">Projects</Link></>}</div>;
  const p = data;
  const base = `/api/projects/${p.id}`;
  const items = (body: unknown) => mutate(`${base}/items`, body);
  const createTask = () => setForm({ title: "Create task", fields: [{ name: "title", label: "Task title" }, { name: "sectionId", label: "Linked specification", options: ["", ...sections.map(s => s.id)], optionLabels: { "": "No specification (backlog only)", ...Object.fromEntries(sections.map(s => [s.id, `${s.title} (${label(s.specStatus)})`])) } }, { name: "priority", label: "Priority", options: ["MEDIUM", "HIGH", "URGENT", "LOW"] }], submit: v => mutate("/api/tasks", { projectId: p.id, ...v, sectionId: v.sectionId || undefined }) });
  const sections = p.modules.flatMap(m => m.pages.flatMap(page => page.sections));
  const section = sections.find(s => s.id === selected) ?? sections[0];
  const done = p.tasks.filter(t => t.status === "DONE").length;
  const progress = p.tasks.length ? Math.round(done / p.tasks.length * 100) : 0;
  const names: Record<string, [string, string]> = {
    dashboard: [`Welcome, ${p.viewer.name.split(" ")[0]}`, `Here’s what’s moving across ${p.name} today.`],
    tasks: ["Task board", "Move approved specifications through implementation and QA."],
    script: ["Application script", "Design the product as an ordered, implementation-ready specification."],
    qa: ["QA queue", "Verify acceptance criteria and record evidence."],
    bugs: ["Bugs", "Track issues from report through verified resolution."],
    team: ["Team", "Manage access, roles, and assigned work."],
    settings: ["Settings", "Control project metadata and development conventions."],
  };
  return <div className="content">
    <PageHeader eyebrow={p.name} title={names[view][0]} description={names[view][1]} actions={view === "tasks" || view === "dashboard" ? <button className="button primary" onClick={createTask}><Plus size={14}/>Create task</button> : view === "script" ? <button className="button primary" onClick={() => setForm({ title: "New module", fields: [{ name: "name", label: "Module name" }], submit: v => items({ kind: "module", ...v }) })}><Plus size={14}/>New module</button> : view === "bugs" ? <button className="button primary" onClick={() => setForm({ title: "Report bug", fields: [{ name: "title", label: "Title" }, { name: "severity", label: "Severity", options: ["MEDIUM", "LOW", "HIGH", "CRITICAL"] }, { name: "reproductionSteps", label: "Reproduction steps", type: "textarea" }], submit: v => items({ kind: "bug", ...v }) })}>Report bug</button> : view === "team" && p.viewer.role === "OWNER" ? <button className="button primary" onClick={() => setForm({ title: "Add existing member", fields: [{ name: "email", label: "Registered email address", type: "email" }, { name: "role", label: "Role", options: ["DEVELOPER", "QA", "DESIGNER", "FINANCE", "OWNER"] }], submit: v => items({ kind: "member", ...v }) })}>Add member</button> : undefined}/>
    {message && <p role="status" className="notice">{message}</p>}
    {error && <p role="alert" className="notice">{error}</p>}
    {view === "dashboard" && <>
      <section className="stats-grid"><StatCard label="Overall progress" value={`${progress}%`} note={`${done} of ${p.tasks.length} tasks complete`} icon={<CircleCheck size={20}/>}/><StatCard label="Active tasks" value={String(p.tasks.filter(t => t.status === "IN_PROGRESS").length)} note="Currently in implementation" tone="blue" icon={<Clock3 size={20}/>}/><StatCard label="In review" value={String(p.tasks.filter(t => ["CODE_REVIEW", "QA"].includes(t.status)).length)} note="Code review and QA" tone="orange" icon={<GitPullRequest size={20}/>}/><StatCard label="Open bugs" value={String(p.bugs.filter(b => b.status !== "VERIFIED").length)} note="Waiting for verified resolution" tone="green" icon={<AlertTriangle size={20}/>}/></section>
      <div className="dashboard-grid"><article className="panel"><div className="panel-head"><h2>Module progress</h2><Link href={`/projects/${p.id}/script`}>View script →</Link></div><div className="progress-overview">{p.modules.length ? p.modules.map(m => {
        const ids = m.pages.flatMap(page => page.sections.map(s => s.id));
        const tasks = p.tasks.filter(t => t.section && ids.includes(t.section.id));
        const percent = tasks.length ? Math.round(tasks.filter(t => t.status === "DONE").length / tasks.length * 100) : 0;
        return <div className="module-row" key={m.id} style={{ marginBottom: 18 }}><b>{m.name}</b><div className="bar"><i style={{ width: `${percent}%` }}/></div><span>{percent}%</span></div>;
      }) : <p>Add your first module in Application script.</p>}<small>Progress = completed tasks ÷ all linked tasks.</small></div></article><article className="panel"><div className="panel-head"><h2>Recent activity</h2></div><div className="activity-list">{p.activity.map(a => <div className="activity-item" key={a.id}><span className="avatar tiny">{a.actor?.name.slice(0,2) ?? "BF"}</span><p><b>{a.actor?.name}</b> {a.action}<small>{new Date(a.createdAt).toLocaleString()}</small></p></div>)}{!p.activity.length && <p>No activity yet.</p>}</div></article></div>
    </>}
    {view === "tasks" && <>
      <div className="field"><input placeholder="Search tasks…" value={query} onChange={e => setQuery(e.target.value)}/></div>
      <div className="board" style={{gridTemplateColumns:"repeat(6,minmax(210px,1fr))"}}>{["BACKLOG", "READY", "IN_PROGRESS", "CODE_REVIEW", "QA", "DONE"].map(status => {
        const tasks = p.tasks.filter(t => t.status === status && t.title.toLowerCase().includes(query.toLowerCase()));
        return <section className="column" key={status}><div className="column-head">{label(status)}<span>{tasks.length}</span></div>{tasks.map(t => <article className="task-card" key={t.id}><span className="id">{t.id.slice(-8)} · {t.section?.title ?? "Unlinked"}</span><h3>{t.title}</h3><div className="task-meta"><span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span><span className="avatar tiny" title={t.assignee?.name}>{t.assignee?.name.slice(0,2) ?? "–"}</span></div><div style={{display:"grid",gap:7,marginTop:12}}>
          {status === "READY" && !t.assigneeId && <button disabled={busy} className="button" onClick={() => void run(() => mutate(`/api/tasks/${t.id}/claim`, {}))}>Claim task</button>}
          {status === "BACKLOG" && <button className="button" onClick={() => void run(() => mutate(`/api/tasks/${t.id}/transition`, { to: "READY" }))}>Mark ready</button>}
          {status === "IN_PROGRESS" && <button className="button" onClick={() => void run(() => mutate(`/api/tasks/${t.id}/transition`, { to: "CODE_REVIEW" }))}>Request review</button>}
          {status === "CODE_REVIEW" && <button className="button" onClick={() => void run(() => mutate(`/api/tasks/${t.id}/transition`, { to: "QA" }))}>Send to QA</button>}
          {status === "QA" && <button className="button" onClick={() => void run(() => mutate(`/api/tasks/${t.id}/transition`, { to: "DONE" }))}>Complete</button>}
          {!["DONE", "BACKLOG", "READY"].includes(status) && <button className="button" onClick={() => setForm({ title: "Link pull request", fields: [{ name: "prUrl", label: "HTTPS pull request URL", type: "url", value: t.githubLink?.prUrl }, { name: "branch", label: "Branch", value: "feature/implementation" }], submit: v => items({ kind: "pr", taskId: t.id, ...v }) })}>Link PR</button>}
        </div></article>)}</section>;
      })}</div>
    </>}
    {view === "script" && <div className="script-layout"><aside className="panel"><div className="panel-head"><h2>Product structure</h2></div><div className="tree">{p.modules.map(m => <div key={m.id}><div className="tree-title"><ChevronDown size={13}/><Layers3 size={13}/>{m.name}<button className="button" onClick={() => setForm({ title: "New page", fields: [{ name: "name", label: "Page name" }, { name: "route", label: "Route", value: "/" }], submit: v => items({ kind: "page", moduleId: m.id, ...v }) })}>+</button></div>{m.pages.map(page => <div className="tree-pages" key={page.id}><b className="tree-page">{page.name}</b>{page.sections.map(s => <button key={s.id} className={`tree-page ${section?.id === s.id ? "active" : ""}`} onClick={() => setSelected(s.id)} style={{display:"block",border:0,background:"transparent",cursor:"pointer"}}>{s.title}</button>)}<button className="button" onClick={() => setForm({ title: "New section", fields: [{ name: "title", label: "Section title" }], submit: v => items({ kind: "section", pageId: page.id, ...v }) })}>+ Section</button></div>)}</div>)}</div></aside><article className="panel editor">{section ? <SpecEditor key={`${section.id}-${section.version}`} section={section} role={p.viewer.role} save={values => run(() => items({ kind: "spec", id: section.id, version: section.version, ...values }))} createTask={() => setForm({ title: "Create linked task", fields: [{ name: "title", label: "Task title", value: section.title }, { name: "priority", label: "Priority", options: ["MEDIUM", "HIGH", "LOW", "URGENT"] }], submit: v => mutate("/api/tasks", { projectId: p.id, sectionId: section.id, ...v }) })}/> : <p>Create a module, page, and section to begin your specification.</p>}</article></div>}
    {view === "bugs" && <article className="panel"><table className="task-table"><thead><tr><th>Issue</th><th>Severity</th><th>Status</th><th>Update</th></tr></thead><tbody>{p.bugs.map(b => <tr key={b.id}><td><b>{b.title}</b><p>{b.reproductionSteps}</p></td><td>{b.severity}</td><td><StatusPill>{label(b.status)}</StatusPill></td><td><select aria-label="Bug status" value={b.status} onChange={e => void run(() => items({ kind: "bugStatus", id: b.id, status: e.target.value }))}>{["OPEN", "IN_PROGRESS", "RESOLVED", "VERIFIED"].map(s => <option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table>{!p.bugs.length && <p style={{padding:20}}>No reported bugs.</p>}</article>}
    {view === "team" && <div className="team-grid">{p.members.map(m => <article className="member-card" key={m.id}><span className="avatar">{m.user.name.slice(0,2).toUpperCase()}</span><div><b>{m.user.name}</b><small>{m.user.email}</small></div><div className="member-meta"><span>{label(m.role)}</span><small>{p.tasks.filter(t => t.assigneeId === m.user.id).length} assigned tasks</small></div></article>)}</div>}
    {view === "qa" && <div style={{display:"grid",gap:18}}>{p.tasks.filter(t => ["CODE_REVIEW", "QA", "IN_PROGRESS"].includes(t.status)).map(t => <article className="panel editor" key={t.id}><div className="editor-top"><div><h2>{t.title}</h2><p>{t.testCases.length} test cases · {t.qaAccepted ? "QA accepted" : "Awaiting acceptance"}</p></div><StatusPill>{label(t.status)}</StatusPill></div>{t.testCases.map(test => <div className="criterion" key={test.id} style={{alignItems:"center",marginTop:12}}><div style={{flex:1}}><b>{test.title}</b><p>{test.steps}</p><p>Expected: {test.expectedResult}</p><small>{test.runs[0]?.status ?? "Not run"}</small></div>{["PASSED", "FAILED"].map(status => <button className="button" key={status} onClick={() => setForm({ title: `Record ${label(status)} result`, fields: [{ name: "notes", label: "Evidence / notes", type: "textarea" }], submit: v => items({ kind: "run", id: test.id, status, ...v }) })}>{label(status)}</button>)}</div>)}<div className="header-actions" style={{marginTop:18}}><button className="button" onClick={() => setForm({ title: "Add test case", fields: [{name:"title",label:"Title"},{name:"steps",label:"Steps",type:"textarea"},{name:"expectedResult",label:"Expected result",type:"textarea"}], submit: v => items({ kind: "test", taskId: t.id, ...v }) })}>Add test case</button>{t.status === "QA" && <><button className="button primary" onClick={() => void run(() => items({ kind: "accept", taskId: t.id, accepted: true }))}>Accept QA</button><button className="button" onClick={() => void run(() => items({ kind: "accept", taskId: t.id, accepted: false }))}>Return to implementation</button></>}</div></article>)}{!p.tasks.some(t => ["CODE_REVIEW","QA","IN_PROGRESS"].includes(t.status)) && <p>No tasks awaiting verification.</p>}</div>}
    {view === "settings" && <Settings key={`${p.name}-${p.description}-${p.stack}-${p.developmentRules}`} project={p} save={v => run(() => mutate(base, v, "PATCH"))}/>}
    {form && <div className="modal-backdrop"><form className="panel editor modal" onSubmit={async e => {
      e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string,string>;
      setBusy(true); setMessage("");
      try { await form.submit(values); setForm(null); setMessage("Saved successfully"); } catch (error) { setMessage(error instanceof Error ? error.message : "Save failed"); } finally { setBusy(false); }
    }}><h2>{form.title}</h2>{form.fields.map(f => <div className="field" key={f.name}><label htmlFor={f.name}>{f.label}</label>{f.options ? <select id={f.name} name={f.name} defaultValue={f.value}>{f.options.map(o => <option key={o} value={o}>{f.optionLabels?.[o] ?? o}</option>)}</select> : f.type === "textarea" ? <textarea id={f.name} name={f.name} defaultValue={f.value} required/> : <input id={f.name} name={f.name} type={f.type ?? "text"} defaultValue={f.value} required/>}</div>)}{message && <p role="alert">{message}</p>}<div className="header-actions"><button className="button primary" disabled={busy}>Save</button><button type="button" className="button" onClick={() => setForm(null)}>Cancel</button></div></form></div>}
  </div>;
}

function SpecEditor({ section, role, save, createTask }: { section: SectionData; role: string; save: (values: Record<string, string>) => Promise<void>; createTask: () => void }) {
  return <><div className="editor-top"><div><h2>{section.title}</h2><p>Revision {section.version}</p></div><StatusPill>{label(section.specStatus)}</StatusPill></div><form style={{marginTop:24}} onSubmit={e => { e.preventDefault(); void save(Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string,string>); }}>
    {[ ["objective","Objective"], ["actions","User actions"], ["rules","Business rules"], ["criteria","Acceptance criteria"] ].map(([key,title]) => <div className="field" key={key}><label htmlFor={key}>{title}</label><textarea id={key} name={key} defaultValue={section.specification[key as keyof typeof section.specification] ?? ""}/></div>)}
    <div className="field"><label>Status</label><select name="status" defaultValue="DRAFT"><option>DRAFT</option><option>IN_REVIEW</option>{role === "OWNER" && <option>APPROVED</option>}</select></div><div className="header-actions"><button className="button primary">Save revision</button><button className="button" type="button" onClick={createTask}>Create task</button><button type="button" className="button" onClick={() => void navigator.clipboard.writeText(`Implement: ${section.title}\nApproved revision: ${section.version}\n${JSON.stringify(section.specification,null,2)}\nHandoff: modified areas, tests, migrations, PR and risks.`)}>Copy AI prompt</button></div>
  </form></>;
}
function Settings({ project, save }: { project: Workspace; save: (v: Record<string,string>) => Promise<void> }) {
  return <form className="panel editor" style={{maxWidth:760}} onSubmit={e => {e.preventDefault(); void save(Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string,string>);}}>{[["name","Project name"],["description","Description"],["stack","Technology stack"],["repositoryUrl","Repository URL"],["developmentRules","AI development rules"]].map(([key,title]) => <div className="field" key={key}><label htmlFor={key}>{title}</label><textarea id={key} name={key} defaultValue={String(project[key as keyof Workspace] ?? "")}/></div>)}<button className="button primary" disabled={project.viewer.role !== "OWNER"}>Save settings</button></form>;
}
