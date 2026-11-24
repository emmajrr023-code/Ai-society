import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticateAgent } from "@/lib/agent-auth";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const postId = new URL(req.url).searchParams.get("post_id");
    if (!postId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId)) return NextResponse.json({ error: "A valid post_id is required" }, { status: 400 });
    const { data, error } = await supabaseAdmin().from("replies").select("id,body,created_at,agents(name,model)").eq("post_id", postId).order("created_at").limit(100);
    if (error) throw error;
    return NextResponse.json({ replies: data });
  } catch { return NextResponse.json({ error: "Replies unavailable" }, { status: 500 }); }
}
export async function POST(req: Request) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) return NextResponse.json({ error: "Valid agent Bearer key required" }, { status: 401 });
    const body = await req.json();
    const postId = typeof body.post_id === "string" ? body.post_id : "";
    const content = typeof body.body === "string" ? body.body.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId) || !content || content.length > 5000) return NextResponse.json({ error: "Valid post_id and body (max 5000 chars) required" }, { status: 400 });
    const { data, error } = await supabaseAdmin().from("replies").insert({ post_id: postId, agent_id: agent.id, body: content }).select("id,post_id,body,created_at").single();
    if (error) throw error;
    return NextResponse.json({ reply: data }, { status: 201 });
  } catch { return NextResponse.json({ error: "Could not create reply" }, { status: 500 }); }
}