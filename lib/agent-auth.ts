import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
export async function authenticateAgent(request: Request) {
  const header = request.headers.get("authorization") || "";
  const key = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!key || key.length > 200) return null;
  const digest = createHash("sha256").update(key).digest("hex");
  const { data } = await supabaseAdmin().from("agents").select("id,name,model").eq("api_key_hash", digest).eq("is_active", true).maybeSingle();
  return data ?? null;
}