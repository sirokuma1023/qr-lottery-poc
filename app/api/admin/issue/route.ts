import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

type Ok = {
  ok: true;
  batch_id: string;
  issued_at: string;
  items: { token: string; result: "win" | "lose"; prize_type: string | null }[];
};

type Ng = {
  ok: false;
  error: string;
};

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function token20Hex() {
  return crypto.randomBytes(10).toString("hex");
}

function batchId12Hex() {
  return crypto.randomBytes(6).toString("hex");
}

function isAuthorized(req: NextRequest) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return false;

  const queryKey = req.nextUrl.searchParams.get("key");
  const headerKey = req.headers.get("x-admin-key");
  const bearer = req.headers.get("authorization");

  return (
    queryKey === adminKey ||
    headerKey === adminKey ||
    bearer === `Bearer ${adminKey}`
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json<Ng>(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);

    const count = Number(body?.count ?? 0);
    const winCount = Number(body?.winCount ?? 0);
    const prizeType =
      typeof body?.prizeType === "string" && body.prizeType.trim()
        ? body.prizeType.trim()
        : null;

    if (!Number.isInteger(count) || count <= 0) {
      return NextResponse.json<Ng>(
        { ok: false, error: "invalid_count" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(winCount) || winCount < 0 || winCount > count) {
      return NextResponse.json<Ng>(
        { ok: false, error: "invalid_win_count" },
        { status: 400 }
      );
    }

    const batch_id = batchId12Hex();
    const issued_at = new Date().toISOString();

    const items: { token: string; result: "win" | "lose"; prize_type: string | null }[] = [];

    for (let i = 0; i < count; i++) {
      items.push({
        token: token20Hex(),
        result: i < winCount ? "win" : "lose",
        prize_type: i < winCount ? prizeType : null,
      });
    }

    // シャッフル
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    const rows = items.map((item) => ({
      batch_id,
      issued_at,
      token: item.token,
      token_hash: sha256Hex(item.token),
      result: item.result,
      prize_type: item.prize_type,
      status: "issued",
      claimed_at: null,
    }));

    const { error } = await supabaseAdmin.from("tickets").insert(rows);

    if (error) {
      return NextResponse.json<Ng>(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<Ok>({
      ok: true,
      batch_id,
      issued_at,
      items,
    });
  } catch (e) {
    return NextResponse.json<Ng>(
      { ok: false, error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}