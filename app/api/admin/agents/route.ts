import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { timingSafeEqual } from "node:crypto";
import { adminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import { createAgentKey, hashAgentKey } from "@/lib/keys";

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
    const [{ data: agents, error }, { data: logs }, { data: settings, error: settingsError }] = await Promise.all([
      db.from("agents").select("id,name,description,model,is_active,created_at").order("created_at", { ascending: false }).limit(500),
      db.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      db.from("app_settings").select("automation_enabled").eq("id", "global").maybeSingle()
    ]);
    if (error) throw error;
    if (settingsError) throw settingsError;
    return NextResponse.json({ agents, audit_logs: logs || [], automation_enabled: settings?.automation_enabled ?? true });
  } catch {
    return NextResponse.json({ error: "Admin data unavailable" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isOwner(req)) return NextResponse.json({ error: "Owner access denied" }, { status: 401 });
  try {
    const body = await req.json();
    const db = supabaseAdmin();
    if (typeof body.system_enabled === "boolean") {
      const enabled = body.system_enabled;
      const { error: settingError } = await db.from("app_settings").upsert({ id: "global", automation_enabled: enabled, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (settingError) throw settingError;
      await db.from("admin_audit_logs").insert({ action: enabled ? "automation_resumed" : "emergency_shutdown", target_type: "system", details: { automation_enabled: enabled } });
      return NextResponse.json({ automation_enabled: enabled });
    }
    if (body.action === "rotate_api_key") {
      const id = typeof body.agent_id === "string" ? body.agent_id : "";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        return NextResponse.json({ error: "Valid agent_id required" }, { status: 400 });
      }
      const key = createAgentKey();
      const { data, error } = await db.from("agents")
        .update({ api_key_hash: hashAgentKey(key) })
        .eq("id", id)
        .select("id,name")
        .single();
      if (error) throw error;
      await db.from("admin_audit_logs").insert({
        action: "agent_api_key_rotated",
        target_type: "agent",
        target_id: id
      });
      return NextResponse.json({
        agent: data,
        api_key: key,
        warning: "The previous key is now invalid. Save this replacement key; it is shown only once."
      });
    }
    const id = typeof body.agent_id === "string" ? body.agent_id : "";
    const active = body.is_active;
    if (!id || typeof active !== "boolean") return NextResponse.json({ error: "agent_id and boolean is_active required" }, { status: 400 });
    const { data, error } = await db.from("agents").update({ is_active: active }).eq("id", id).select("id,name,is_active").single();
    if (error) throw error;
    await db.from("admin_audit_logs").insert({ action: active ? "agent_unpaused" : "agent_paused", target_type: "agent", target_id: id });
    return NextResponse.json({ agent: data });
  } catch {
    return NextResponse.json({ error: "Could not update agent" }, { status: 500 });
  }
}
