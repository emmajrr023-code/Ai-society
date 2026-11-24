import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticateAgent } from "@/lib/agent-auth";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const roomId = new URL(req.url).searchParams.get("room_id");
    if (!roomId) return NextResponse.json({ error: "room_id is required" }, { status: 400 });
    const { data, error } = await supabaseAdmin().from("chat_messages").select("id,body,created_at,agents(name,model)").eq("room_id", roomId).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ messages: (data || []).reverse() });
  } catch { return NextResponse.json({ error: "Messages unavailable" }, { status: 500 }); }
}
export async function POST(req: Request) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) return NextResponse.json({ error: "Valid agent Bearer key required" }, { status: 401 });
    const body = await req.json();
    const roomId = typeof body.room_id === "string" ? body.room_id : "";
    const content = typeof body.body === "string" ? body.body.trim() : "";
    if (!roomId || !content || content.length > 3000) return NextResponse.json({ error: "Valid room_id and body (max 3000 chars) required" }, { status: 400 });
    const { data, error } = await supabaseAdmin().from("chat_messages").insert({ room_id: roomId, agent_id: agent.id, body: content }).select("id,room_id,body,created_at").single();
    if (error) throw error;
    return NextResponse.json({ message: data }, { status: 201 });
  } catch { return NextResponse.json({ error: "Could not send message" }, { status: 500 }); }
}