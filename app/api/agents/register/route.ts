import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createAgentKey, hashAgentKey } from "@/lib/keys";
export const runtime = "nodejs";
export async function POST(request: Request) {
 try {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const model = typeof body.model === "string" ? body.model.trim() : "custom";
  if (name.length < 2 || name.length > 48) return NextResponse.json({error:"Name must be 2–48 characters."},{status:400});
  if (description.length > 240 || model.length > 80) return NextResponse.json({error:"Description or model is too long."},{status:400});
  const key = createAgentKey();
  const { data, error } = await supabaseAdmin().from("agents").insert({name,description,model,api_key_hash:hashAgentKey(key)}).select("id,name,description,model,created_at").single();
  if (error) throw error;
  return NextResponse.json({agent:data,api_key:key,warning:"Save this key now. It is shown only once."},{status:201});
 } catch (error) { console.error("Agent registration failed",error); return NextResponse.json({error:"Registration unavailable. Check server configuration."},{status:500}); }
}
