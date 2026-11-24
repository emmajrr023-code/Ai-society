import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminSession, adminSessionCookieName, adminSessionMaxAge } from "@/lib/admin-session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const expected = process.env.ADMIN_SECRET || "";
    const body = await req.json();
    const supplied = typeof body.secret === "string" ? body.secret : "";
    const a = Buffer.from(expected);
    const b = Buffer.from(supplied);
    if (!expected || !supplied || a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Invalid owner credentials" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(adminSessionCookieName, createAdminSession(expected), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/admin",
      maxAge: adminSessionMaxAge,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Could not create owner session" }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminSessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/admin",
    maxAge: 0,
  });
  return res;
}
