import { ArrowUpRight } from "./icons";

export function PageHeader({ eyebrow, title, description, actions }: {eyebrow?: string; title: string; description: string; actions?: React.ReactNode}) {
  return <div className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>{actions && <div className="header-actions">{actions}</div>}</div>
}
export function StatCard({ label, value, note, tone="purple", icon }: {label:string;value:string;note:string;tone?:string;icon:React.ReactNode}) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><span className="stat-label">{label}</span><strong>{value}</strong><small>{note}</small><ArrowUpRight className="stat-arrow" size={17}/></article>
}
export function StatusPill({ children }: {children:React.ReactNode}) { const key=String(children).toLowerCase().replaceAll(" ","-"); return <span className={`pill ${key}`}><i/>{children}</span> }
export function Avatar({ name }: {name:string}) { return <span className="avatar tiny">{name === "Unassigned" ? "–" : name.split(" ").map(x=>x[0]).join("").slice(0,2)}</span> }
