import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import crypto from "crypto";

type Ok = {
  ok: true;
  status: "claimed" | "already_claimed";
  token: string;
  prize_type: string | null;
  result: string | null;
  claimed_at: string | null;
};

type Ng = { ok: false; error: string };

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const token = body?.token;

    if (!token || typeof token !== "string") {
      return NextResponse.json<Ng>({ ok: false, error: "invalid_token" }, { status: 400 });
    }

    // セキュリティ：hash直叩き禁止
    if (/^[0-9a-f]{64}$/i.test(token)) {
      return NextResponse.json<Ng>({ ok: false, error: "invalid_token_format" }, { status: 400 });
    }

    const tokenHash = sha256Hex(token);
    const now = new Date().toISOString();

    // 原子的更新（unused → claimed）
    const { data: updated, error: updErr } = await supabaseAdmin
      .from("tickets")
      .update({
        status: "claimed",
        claimed_at: now,
      })
      .eq("token_hash", tokenHash)
      .eq("status", "unused")
      .select("prize_type, result, claimed_at")
      .maybeSingle();

    if (updErr) {
      return NextResponse.json<Ng>({ ok: false, error: updErr.message }, { status: 500 });
    }

    // 1回目成功
    if (updated) {
      const payload: Ok = {
        ok: true,
        status: "claimed",
        token,
        prize_type: updated.prize_type ?? null,
        result: updated.result ?? null,
        claimed_at: updated.claimed_at ?? null,
      };

      return NextResponse.json(payload);
    }

    // 更新できなかった → already_claimed or token_not_found
    const { data: row, error: selErr } = await supabaseAdmin
      .from("tickets")
      .select("status, prize_type, result, claimed_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (selErr) {
      return NextResponse.json<Ng>({ ok: false, error: selErr.message }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json<Ng>({ ok: false, error: "token_not_found" }, { status: 404 });
    }

    const payload: Ok = {
      ok: true,
      status: "already_claimed",
      token,
      prize_type: row.prize_type ?? null,
      result: row.result ?? null,
      claimed_at: row.claimed_at ?? null,
    };

    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json<Ng>(
      { ok: false, error: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}