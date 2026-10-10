"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
export default function Projects() {
 const router = useRouter();
 const { data: projects = [], error: loadError, mutate: load } = useSWR<{id:string;name:string;description:string}[]>("/api/projects",async (url: string)=>{const response=await fetch(url);if(response.status===401){router.replace("/login");return [];}const result=await response.json();if(!response.ok)throw new Error(result.error);return result.data;}, { shouldRetryOnError: false });
 const [error,setError] = useState("");
 const [name,setName] = useState("");
 return <main className="content"><h1>Your projects</h1>{(error || loadError) && <p role="alert">{error || loadError.message}</p>}<div className="team-grid" style={{margin:"24px 0"}}>{projects.map(p=><Link className="member-card" key={p.id} href={`/projects/${p.id}/dashboard`}><div><b>{p.name}</b><small>{p.description}</small></div></Link>)}</div><form className="panel editor" onSubmit={async e=>{e.preventDefault();try{const response=await fetch("/api/projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});const result=await response.json();if(!response.ok)throw new Error(result.error);setName("");await load();}catch(e){setError(e instanceof Error?e.message:"Save failed");}}}><div className="field"><label>New project name</label><input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></div><button className="button primary">Create project</button></form><Link className="button" style={{marginTop:20}} href="/login">Sign in</Link></main>
}
