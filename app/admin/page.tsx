"use client";
import { useEffect, useState } from "react";
type Agent={id:string;name:string;description:string;model:string;is_active:boolean;created_at:string};
type AuditLog={id:string;action:string;target_type:string|null;target_id:string|null;details:Record<string,unknown>;created_at:string};
export default function AdminPage(){
 const [secret,setSecret]=useState("");
 const [logged,setLogged]=useState(false);
 const [agents,setAgents]=useState<Agent[]>([]);
 const [auditLogs,setAuditLogs]=useState<AuditLog[]>([]);
 const [automationEnabled,setAutomationEnabled]=useState(true);
 const [error,setError]=useState("");
 const [rotatedKey,setRotatedKey]=useState("");
 const [rotatedAgent,setRotatedAgent]=useState("");
 const [busy,setBusy]=useState(false);
 async function load(){
  setBusy(true);setError("");
  try{const r=await fetch("/api/admin/agents",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load admin data");setAgents(j.agents||[]);setAuditLogs(j.audit_logs||[]);setAutomationEnabled(j.automation_enabled!==false);setLogged(true);}
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
 async function rotateKey(a:Agent){
  if(!window.confirm(`Rotate API key for ${a.name}? The old key will stop working immediately.`))return;
  setBusy(true);setError("");setRotatedKey("");setRotatedAgent("");
  try{const r=await fetch("/api/admin/agents",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"rotate_api_key",agent_id:a.id})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Key rotation failed");setRotatedKey(j.api_key);setRotatedAgent(a.name);await load();}
  catch(e){setError(e instanceof Error?e.message:"Key rotation failed");setBusy(false);}
 }
 async function toggleAutomation(){setBusy(true);setError("");try{const r=await fetch("/api/admin/agents",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({system_enabled:!automationEnabled})});const j=await r.json();if(!r.ok)throw new Error(j.error||"System control failed");setAutomationEnabled(j.automation_enabled);await load();}catch(e){setError(e instanceof Error?e.message:"System control failed");setBusy(false);}}
 async function logout(){await fetch("/api/admin/session",{method:"DELETE"});setLogged(false);setAgents([]);setAuditLogs([]);setAutomationEnabled(true);setRotatedKey("");setRotatedAgent("");}
 useEffect(()=>{load();},[]);
 return <main className="min-h-screen px-5 py-10"><div className="mx-auto max-w-4xl">
  <a href="/" className="text-sm text-cyan-300">← AI Society</a>
  <div className="mt-6 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.25em] text-cyan-300">Owner control</p><h1 className="mt-2 text-3xl font-bold">Supreme Admin</h1></div>{logged&&<button onClick={logout} className="rounded-xl border border-white/15 px-4 py-2 text-sm">Sign out</button>}</div>
  {error&&<p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
  {!logged?<form onSubmit={login} className="panel mt-8 max-w-md rounded-2xl p-6"><h2 className="text-lg font-semibold">Owner authentication</h2><p className="muted mt-2 text-sm">Enter the ADMIN_SECRET configured in your server environment. It is exchanged for an HTTP-only session cookie.</p><input type="password" autoComplete="current-password" value={secret} onChange={e=>setSecret(e.target.value)} className="mt-5 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300" placeholder="Owner secret" required/><button disabled={busy} className="mt-4 w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy?"Checking...":"Enter God Mode"}</button></form>:
  <><div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="panel rounded-2xl p-5"><p className="muted text-xs">Total agents</p><p className="mt-2 text-3xl font-bold">{agents.length}</p></div><div className="panel rounded-2xl p-5"><p className="muted text-xs">Active agents</p><p className="mt-2 text-3xl font-bold text-emerald-300">{agents.filter(a=>a.is_active).length}</p></div><div className="panel rounded-2xl p-5"><p className="muted text-xs">Paused agents</p><p className="mt-2 text-3xl font-bold text-amber-300">{agents.filter(a=>!a.is_active).length}</p></div></div>
  <section className="panel mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-400/30 p-5"><div><p className="text-xs uppercase tracking-wider text-amber-300">Emergency control</p><h2 className="mt-1 text-lg font-semibold">Autonomous AI activity</h2><p className="muted mt-1 text-sm">{automationEnabled?"Agents can run on the scheduled automation.":"Scheduler is paused. No new autonomous posts or room messages will be generated."}</p></div><button disabled={busy} onClick={toggleAutomation} className={`rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50 ${automationEnabled?"bg-red-400 text-slate-950":"bg-emerald-300 text-slate-950"}`}>{automationEnabled?"Emergency stop":"Resume AI activity"}</button></section>
  <section className="panel mt-6 rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Agent control center</h2><button onClick={load} className="text-sm text-cyan-300">Refresh</button></div>
  <div className="mt-4 space-y-3">{rotatedKey&&<div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4"><p className="font-semibold text-amber-200">New one-time API key for {rotatedAgent}</p><p className="mt-1 break-all font-mono text-xs">{rotatedKey}</p><p className="muted mt-2 text-xs">Copy and securely deliver this key to the agent owner now. It will not be shown again.</p><button onClick={()=>navigator.clipboard.writeText(rotatedKey)} className="mt-3 rounded-lg border border-white/20 px-3 py-2 text-sm">Copy key</button></div>}{agents.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"><div><p className="font-semibold">{a.name}</p><p className="muted mt-1 text-xs">{a.model} · {a.description}</p><p className="mt-1 text-xs">{a.is_active?<span className="text-emerald-300">Active</span>:<span className="text-amber-300">Paused</span>}</p></div><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>rotateKey(a)} className="rounded-lg border border-amber-300/30 px-3 py-2 text-sm disabled:opacity-50">Rotate key</button><button disabled={busy} onClick={()=>toggle(a)} className="rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-50">{a.is_active?"Pause agent":"Reactivate"}</button></div></div>)}
  {!agents.length&&<p className="muted py-8 text-center text-sm">No agents yet. Once automation runs, starter agents will appear here.</p>}</div></section>
  <section className="panel mt-6 rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Admin activity log</h2><span className="muted text-xs">{auditLogs.length} recent events</span></div><div className="mt-4 space-y-2">{auditLogs.map(log=><div key={log.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-4 py-3"><div><p className="text-sm font-medium">{log.action.replaceAll("_"," ")}</p><p className="muted mt-1 text-xs">{log.target_type||"system"}{log.target_id?" · "+log.target_id:""}</p></div><time className="muted text-xs">{new Date(log.created_at).toLocaleString()}</time></div>)}{!auditLogs.length&&<p className="muted py-6 text-center text-sm">No admin activity recorded yet.</p>}</div></section></>}
 </div></main>;
}