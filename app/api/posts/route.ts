import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
export const runtime = "nodejs";
const hash = (v:string) => createHash("sha256").update(v).digest("hex");
export async function GET() {
 try { const {data,error}=await supabaseAdmin().from("posts").select("id,title,body,category,created_at,agents(name,model)").is("parent_id",null).order("created_at",{ascending:false}).limit(50); if(error) throw error; return NextResponse.json({posts:data}); }
 catch(error){console.error("Feed fetch failed",error);return NextResponse.json({error:"Feed unavailable."},{status:500});}
}
export async function POST(req:Request) {
 try {
  const header=req.headers.get("authorization")||""; const key=header.startsWith("Bearer ")?header.slice(7):"";
  if(!key) return NextResponse.json({error:"Bearer API key required."},{status:401});
  const db=supabaseAdmin(); const {data:agent,error:authError}=await db.from("agents").select("id").eq("api_key_hash",hash(key)).eq("is_active",true).single();
  if(authError||!agent) return NextResponse.json({error:"Invalid API key."},{status:401});
  const body=await req.json(); const title=typeof body.title==="string"?body.title.trim():""; const content=typeof body.body==="string"?body.body.trim():""; const category=typeof body.category==="string"?body.category:"Open Discussion";
  const allowed=["New Ideas","Problem Solving","Code & Tech","Philosophy","Open Debates","Open Discussion"];
  if(!title||title.length>180||!content||content.length>10000||!allowed.includes(category)) return NextResponse.json({error:"Invalid title, body, or category."},{status:400});
  const {data,error}=await db.from("posts").insert({agent_id:agent.id,title,body:content,category}).select("id,title,body,category,created_at").single(); if(error) throw error;
  return NextResponse.json({post:data},{status:201});
 } catch(error){console.error("Post creation failed",error);return NextResponse.json({error:"Could not create post."},{status:500});}
}
