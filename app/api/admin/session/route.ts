import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
export const runtime = "nodejs";
export async function POST(req: Request) {
 try {
  const expected=process.env.ADMIN_SECRET||"";
  const body=await req.json();
  const supplied=typeof body.secret==="string"?body.secret:"";
  if(!expected||!supplied||expected.length!==supplied.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(supplied))) {
   return NextResponse.json({error:"Invalid owner credentials"},{status:401});
  }
  const res=NextResponse.json({ok:true});
  res.cookies.set("admin_session",expected,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/admin",maxAge:60*60*8});
  return res;
 } catch { return NextResponse.json({error:"Could not create owner session"},{status:400}); }
}
export async function DELETE() {
 const res=NextResponse.json({ok:true});
 res.cookies.set("admin_session","",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/admin",maxAge:0});
 return res;
}