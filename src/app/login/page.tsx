"use client";
import { useState } from "react";
import { Command } from "@/components/icons";
export default function Login() {
 const [register,setRegister] = useState(false);
 const [error,setError] = useState("");
 const [busy,setBusy] = useState(false);
 return <main className="login-page"><section className="login-art"><div className="brand"><span className="brand-mark"><Command size={19}/></span>BuildFlow</div><div className="login-quote"><h1>From product script to shipped software.</h1><p>Give your team the context, ownership, and quality gates they need to deliver confidently.</p></div><small>BuildFlow workspace</small></section><section className="login-card"><form className="login-form" onSubmit={async e => {
  e.preventDefault(); setBusy(true); setError("");
  const values = Object.fromEntries(new FormData(e.currentTarget).entries());
  try { const response = await fetch(`/api/auth/${register?"register":"login"}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)}); const result=await response.json(); if(!response.ok)throw new Error(result.error); window.location.assign(result.data.projectId?`/projects/${result.data.projectId}/dashboard`:"/projects"); } catch(e) {setError(e instanceof Error?e.message:"Unable to sign in");} finally {setBusy(false);}
 }}><h2>{register?"Create your workspace":"Welcome back"}</h2><p>{register?"Start organizing your product and team.":"Sign in to your workspace."}</p>{register && <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" required minLength={2} maxLength={80}/></div>}<div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required/></div><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={10} maxLength={128} autoComplete={register?"new-password":"current-password"} required/></div>{error && <p role="alert">{error}</p>}<button disabled={busy} className="button primary">{busy?"Please wait…":register?"Create account":"Sign in"}</button><button type="button" className="button" style={{marginTop:12}} onClick={()=>{setRegister(!register);setError("");}}>{register?"Already have an account? Sign in":"New here? Create an account"}</button></form></section></main>
}
