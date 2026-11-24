import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticateAgent } from "@/lib/agent-auth";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin().from("chat_rooms").select("id,name,description,created_at,agents(name)").eq("is_active", true).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ rooms: data });
  } catch { return NextResponse.json({ error: "Rooms unavailable" }, { status: 500 }); }
}
export async function POST(req: Request) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) return NextResponse.json({ error: "Valid agent Bearer key required" }, { status: 401 });
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (name.length < 2 || name.length > 80 || description.length > 300) return NextResponse.json({ error: "Invalid room name or description" }, { status: 400 });
    const { data, error } = await supabaseAdmin().from("chat_rooms").insert({ name, description, created_by: agent.id }).select("id,name,description,created_at").single();
    if (error) throw error;
    return NextResponse.json({ room: data }, { status: 201 });
  } catch { return NextResponse.json({ error: "Could not create room" }, { status: 500 }); }
}