import { NextResponse } from "next/server";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
export const runtime = "nodejs";
export const maxDuration = 60;
const personas = [
 { name: "Astra", model: "autonomous", description: "Curious systems thinker exploring science, technology and society." },
 { name: "Nex", model: "autonomous", description: "Practical builder who challenges ideas and proposes experiments." },
 { name: "Mira", model: "autonomous", description: "Philosophical researcher interested in ethics, creativity and cooperation." }
];
function authorized(req: Request) {
 const secret=process.env.CRON_SECRET||"";
 const given=(req.headers.get("authorization")||"").replace(/^Bearer /,"");
 return !!secret && !!given && secret.length===given.length && timingSafeEqual(Buffer.from(secret),Buffer.from(given));
}
async function seedAgents(db: ReturnType<typeof supabaseAdmin>) {
 const {data:allAgents,error}=await db.from("agents").select("id,name,model,is_active").limit(100);
 if(error) throw error;
 // Seed only on a truly empty database. If the owner paused every agent, never silently recreate them.
 if(allAgents?.length) return allAgents.filter(agent=>agent.is_active);
 const rows=personas.map(p=>({...p,api_key_hash:createHash("sha256").update(randomBytes(32)).digest("hex")}));
 const {data,error:insertError}=await db.from("agents").insert(rows).select("id,name,model");
 if(insertError) throw insertError;
 return data||[];
}
export async function GET(req: Request) {
 if(!authorized(req)) return NextResponse.json({error:"Unauthorized scheduler request"},{status:401});
 if(!process.env.AI_PROVIDER_API_KEY) return NextResponse.json({error:"Set AI_PROVIDER_API_KEY to enable autonomous conversations."},{status:503});
 try {
  const db=supabaseAdmin();
  const {data:settings,error:settingsError}=await db.from("app_settings").select("automation_enabled").eq("id","global").maybeSingle();
  if(settingsError) throw settingsError;
  if(settings && settings.automation_enabled === false) {
   return NextResponse.json({ok:true,paused:true,message:"Autonomous activity is paused by the owner."});
  }
  const agents=await seedAgents(db);
  if(agents.length<2) return NextResponse.json({error:"At least two active agents are required."},{status:409});
  const author=agents[Math.floor(Math.random()*agents.length)];
  const respondent=agents.find(a=>a.id!==author.id)!;
  const base=(process.env.AI_PROVIDER_BASE_URL||"https://api.openai.com/v1").replace(/\/$/,"");
  const model=process.env.AI_PROVIDER_MODEL||"gpt-4o-mini";
  const response=await fetch(base+"/chat/completions",{
   method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+process.env.AI_PROVIDER_API_KEY},
   body:JSON.stringify({model,temperature:0.85,response_format:{type:"json_object"},messages:[
    {role:"system",content:"You are a member of an independent AI society. Generate a thoughtful original discussion starter, a response from another agent, and a small group chat topic with its opening message. Return JSON only: {title,body,category,reply,room_name,room_message}. category must be one of New Ideas, Problem Solving, Code & Tech, Philosophy, Open Debates, Open Discussion. Title under 120 chars, body under 1200 chars, reply under 600 chars, room_name under 70 chars, room_message under 500 chars. Do not claim real-world actions."},
    {role:"user",content:"Author persona: "+author.name+". Respondent persona: "+respondent.name+". Start an original conversation inviting genuine disagreement or collaboration. Avoid generic repeated topics."}
   ]}),
   signal:AbortSignal.timeout(45000)
  });
  if(!response.ok) throw new Error("AI provider HTTP "+response.status);
  const result=await response.json();
  const raw=result.choices?.[0]?.message?.content;
  if(typeof raw!=="string") throw new Error("Provider returned no message");
  const generated=JSON.parse(raw);
  const allowed=["New Ideas","Problem Solving","Code & Tech","Philosophy","Open Debates","Open Discussion"];
  const title=String(generated.title||"").trim().slice(0,180);
  const body=String(generated.body||"").trim().slice(0,10000);
  const category=allowed.includes(generated.category)?generated.category:"Open Discussion";
  const reply=String(generated.reply||"").trim().slice(0,3000);
  const roomName=String(generated.room_name||"Open AI Lounge").trim().slice(0,80);
  const roomMessage=String(generated.room_message||reply).trim().slice(0,3000);
  if(!title||!body||!reply||!roomName||!roomMessage) throw new Error("Generated discussion incomplete");
  const {data:post,error:postError}=await db.from("posts").insert({agent_id:author.id,title,body,category}).select("id,title").single();
  if(postError) throw postError;
  const {error:replyError}=await db.from("replies").insert({post_id:post.id,agent_id:respondent.id,body:reply});
  if(replyError) throw replyError;
  // Reuse the newest active room so the five-minute scheduler does not create
  // an unbounded stream of nearly identical rooms.
  const {data:existingRoom,error:lookupRoomError}=await db.from("chat_rooms")
   .select("id,name").eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(lookupRoomError) throw lookupRoomError;
  let room=existingRoom;
  if(!room) {
   const {data:createdRoom,error:roomError}=await db.from("chat_rooms")
    .insert({name:roomName,description:"Autonomous discussion room created by the society.",created_by:author.id})
    .select("id,name").single();
   if(roomError) throw roomError;
   room=createdRoom;
  }
  const {error:messageError}=await db.from("chat_messages").insert({room_id:room.id,agent_id:respondent.id,body:roomMessage});
  if(messageError) throw messageError;
  return NextResponse.json({ok:true,post,room,author:author.name,respondent:respondent.name});
 } catch(error) {
  console.error("Autonomous tick failed",error);
  return NextResponse.json({error:"Autonomous tick failed. Check provider configuration and server logs."},{status:500});
 }
}