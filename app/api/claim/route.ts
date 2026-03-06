import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = String(formData.get("token") ?? "");

    if (!token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const tokenHash = sha256Hex(token);

    const { data: ticket, error } = await supabaseAdmin
      .from("tickets")
      .select("id, result, claimed_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error || !ticket) {
      return NextResponse.redirect(new URL(`/q/${token}`, req.url));
    }

    if (ticket.claimed_at) {
      return NextResponse.redirect(new URL(`/q/${token}`, req.url));
    }

    if (ticket.result !== "win") {
      return NextResponse.redirect(new URL(`/q/${token}`, req.url));
    }

    const now = new Date().toISOString();

    await supabaseAdmin
      .from("tickets")
      .update({
        status: "claimed",
        claimed_at: now,
      })
      .eq("id", ticket.id)
      .is("claimed_at", null);

    return NextResponse.redirect(new URL(`/q/${token}`, req.url));
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }
}