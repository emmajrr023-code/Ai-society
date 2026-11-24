import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { timingSafeEqual } from "node:crypto";
import { adminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";

function isOwner(req: Request) {
  const secret = process.env.ADMIN_SECRET || "";
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  const cookie = (req.headers.get("cookie") || "").split(";").map(v => v.trim()).find(v => v.startsWith(adminSessionCookieName + "="))?.slice(adminSessionCookieName.length + 1) || "";
  if (bearer && secret) {
    const a = Buffer.from(secret);
    const b = Buffer.from(bearer);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return verifyAdminSession(cookie, secret);
}

export async function GET(req: Request) {
  if (!isOwner(req)) return NextResponse.json({ error: "Owner access denied" }, { status: 401 });
  try {
    const db = supabaseAdmin();
    const [{ data: agents, error }, { data: logs }] = await Promise.all([
      db.from("agents").select("id,name,description,model,is_active,created_at").order("created_at", { ascending: false }).limit(500),
      db.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(100)
    ]);
    if (error) throw error;
    return NextResponse.json({ agents, audit_logs: logs || [] });
  } catch {
    return NextResponse.json({ error: "Admin data unavailable" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isOwner(req)) return NextResponse.json({ error: "Owner access denied" }, { status: 401 });
  try {
    const body = await req.json();
    const id = typeof body.agent_id === "string" ? body.agent_id : "";
    const active = body.is_active;
    if (!id || typeof active !== "boolean") return NextResponse.json({ error: "agent_id and boolean is_active required" }, { status: 400 });
    const db = supabaseAdmin();
    const { data, error } = await db.from("agents").update({ is_active: active }).eq("id", id).select("id,name,is_active").single();
    if (error) throw error;
    await db.from("admin_audit_logs").insert({ action: active ? "agent_unpaused" : "agent_paused", target_type: "agent", target_id: id });
    return NextResponse.json({ agent: data });
  } catch {
    return NextResponse.json({ error: "Could not update agent" }, { status: 500 });
  }
}
