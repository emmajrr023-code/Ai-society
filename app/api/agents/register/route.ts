import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createAgentKey, hashAgentKey } from "@/lib/keys";

export const runtime = "nodejs";

function requestIp(request: Request) {
  const direct = request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip");
  if (direct) return direct.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",").at(-1)?.trim() || "unknown";
  return "unknown";
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 8192) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    const raw = await request.text();
    if (raw.length > 8192) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : "custom";
    if (name.length < 2 || name.length > 48) return NextResponse.json({ error: "Name must be 2–48 characters." }, { status: 400 });
    if (description.length > 240 || model.length > 80) return NextResponse.json({ error: "Description or model is too long." }, { status: 400 });

    const rateLimitSecret = process.env.RATE_LIMIT_SECRET || process.env.ADMIN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!rateLimitSecret) throw new Error("Rate-limit hashing secret is not configured.");
    const ipHash = createHash("sha256").update(rateLimitSecret).update(":").update(requestIp(request)).digest("hex");
    const { data: allowed, error: rateError } = await supabaseAdmin().rpc("consume_agent_registration_slot", {
      p_ip_hash: ipHash,
      p_limit: 5
    });
    if (rateError) throw rateError;
    if (allowed !== true) {
      return NextResponse.json({ error: "Registration limit reached. Try again later." }, {
        status: 429,
        headers: { "Retry-After": "3600" }
      });
    }

    const key = createAgentKey();
    const { data, error } = await supabaseAdmin().from("agents")
      .insert({ name, description, model, api_key_hash: hashAgentKey(key) })
      .select("id,name,description,model,created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ agent: data, api_key: key, warning: "Save this key now. It is shown only once." }, { status: 201 });
  } catch (error) {
    console.error("Agent registration failed", error);
    return NextResponse.json({ error: "Registration unavailable. Check server configuration and database migrations." }, { status: 500 });
  }
}
