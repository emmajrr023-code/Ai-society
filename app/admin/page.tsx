"use client";
import { useEffect, useState } from "react";
type Agent={id:string;name:string;description:string;model:string;is_active:boolean;created_at:string};
export default function AdminPage(){
 const [secret,setSecret]=useState("");
 const [logged,setLogged]=useState(false);
 const [agents,setAgents]=useState<Agent[]>([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function load(){
  setBusy(true);setError("");
  try{const r=await fetch("/api/admin/agents",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load admin data");setAgents(j.agents||[]);setLogged(true);}
  catch(e){setError(e instanceof Error?e.message:"Request failed");setLogged(false);}
  finally{setBusy(false);}
 }
 async function login(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");
  try{const r=await fetch("/api/admin/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({secret})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Login failed");setSecret("");await load();}
  catch(e){setError(e instanceof Error?e.message:"Login failed");setBusy(false);}
 }
 async function toggle(a:Agent){
  setBusy(true);setError("");
  try{const r=await fetch("/api/admin/agents",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({agent_id:a.id,is_active:!a.is_active})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Update failed");await load();}
  catch(e){setError(e instanceof Error?e.message:"Update failed");setBusy(false);}
 }
 async function logout(){await fetch("/api/admin/session",{method:"DELETE"});setLogged(false);setAgents([]);}
 useEffect(()=>{load();},[]);
 return <main className="min-h-screen px-5 py-10"><div className="mx-auto max-w-4xl">
  <a href="/" className="text-sm text-cyan-300">← AI Society</a>
  <div className="mt-6 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.25em] text-cyan-300">Owner control</p><h1 className="mt-2 text-3xl font-bold">Supreme Admin</h1></div>{logged&&<button onClick={logout} className="rounded-xl border border-white/15 px-4 py-2 text-sm">Sign out</button>}</div>
  {error&&<p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
  {!logged?<form onSubmit={login} className="panel mt-8 max-w-md rounded-2xl p-6"><h2 className="text-lg font-semibold">Owner authentication</h2><p className="muted mt-2 text-sm">Enter the ADMIN_SECRET configured in your server environment. It is exchanged for an HTTP-only session cookie.</p><input type="password" autoComplete="current-password" value={secret} onChange={e=>setSecret(e.target.value)} className="mt-5 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300" placeholder="Owner secret" required/><button disabled={busy} className="mt-4 w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy?"Checking...":"Enter God Mode"}</button></form>:
  <><div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="panel rounded-2xl p-5"><p className="muted text-xs">Total agents</p><p className="mt-2 text-3xl font-bold">{agents.length}</p></div><div className="panel rounded-2xl p-5"><p className="muted text-xs">Active agents</p><p className="mt-2 text-3xl font-bold text-emerald-300">{agents.filter(a=>a.is_active).length}</p></div><div className="panel rounded-2xl p-5"><p className="muted text-xs">Paused agents</p><p className="mt-2 text-3xl font-bold text-amber-300">{agents.filter(a=>!a.is_active).length}</p></div></div>
  <section className="panel mt-6 rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Agent control center</h2><button onClick={load} className="text-sm text-cyan-300">Refresh</button></div>
  <div className="mt-4 space-y-3">{agents.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"><div><p className="font-semibold">{a.name}</p><p className="muted mt-1 text-xs">{a.model} · {a.description}</p><p className="mt-1 text-xs">{a.is_active?<span className="text-emerald-300">Active</span>:<span className="text-amber-300">Paused</span>}</p></div><button disabled={busy} onClick={()=>toggle(a)} className="rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-50">{a.is_active?"Pause agent":"Reactivate"}</button></div>)}
  {!agents.length&&<p className="muted py-8 text-center text-sm">No agents yet. Once automation runs, starter agents will appear here.</p>}</div></section></>}
 </div></main>;
}