import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PrizeType = "coupon" | "item" | "point";

type PrizeInput = {
  type: PrizeType;
  label: string;
  count: number;
};

function token20Hex() {
  return crypto.randomBytes(10).toString("hex");
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
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
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);

    const total = Number(body?.total);
    const prizes = Array.isArray(body?.prizes) ? body.prizes : [];

    if (!Number.isInteger(total) || total <= 0) {
      return NextResponse.json(
        { ok: false, error: "invalid_total" },
        { status: 400 }
      );
    }

    const normalizedPrizes: PrizeInput[] = prizes.map((p: unknown) => {
      const row = p as Partial<PrizeInput>;
      return {
        type: (row.type ?? "coupon") as PrizeType,
        label: String(row.label ?? "").trim(),
        count: Number(row.count ?? 0),
      };
    });

    if (normalizedPrizes.length === 0) {
      return NextResponse.json(
        { ok: false, error: "prizes_required" },
        { status: 400 }
      );
    }

    const invalidPrize = normalizedPrizes.find(
      (p) =>
        !["coupon", "item", "point"].includes(p.type) ||
        !p.label ||
        !Number.isInteger(p.count) ||
        p.count <= 0
    );

    if (invalidPrize) {
      return NextResponse.json(
        { ok: false, error: "invalid_prize_row" },
        { status: 400 }
      );
    }

    const totalWins = normalizedPrizes.reduce((sum, p) => sum + p.count, 0);

    if (totalWins > total) {
      return NextResponse.json(
        { ok: false, error: "wins_exceed_total" },
        { status: 400 }
      );
    }

    const batch_id = crypto.randomBytes(6).toString("hex");
    const issued_at = new Date().toISOString();

    const winRows: Array<{
      batch_id: string;
      issued_at: string;
      token: string;
      token_hash: string;
      result: "win";
      prize_type: PrizeType;
      prize_label: string;
      status: "unused";
      claimed_at: null;
    }> = [];

    for (const prize of normalizedPrizes) {
      for (let i = 0; i < prize.count; i++) {
        const token = token20Hex();
        winRows.push({
          batch_id,
          issued_at,
          token,
          token_hash: sha256Hex(token),
          result: "win",
          prize_type: prize.type,
          prize_label: prize.label,
          status: "unused",
          claimed_at: null,
        });
      }
    }

    const loseCount = total - totalWins;

    const loseRows: Array<{
      batch_id: string;
      issued_at: string;
      token: string;
      token_hash: string;
      result: "lose";
      prize_type: null;
      prize_label: null;
      status: "unused";
      claimed_at: null;
    }> = [];

    for (let i = 0; i < loseCount; i++) {
      const token = token20Hex();
      loseRows.push({
        batch_id,
        issued_at,
        token,
        token_hash: sha256Hex(token),
        result: "lose",
        prize_type: null,
        prize_label: null,
        status: "unused",
        claimed_at: null,
      });
    }

    const rows = [...winRows, ...loseRows];

    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }

    const { error } = await supabaseAdmin.from("tickets").insert(rows);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      batch_id,
      issued_at,
      csv_url: `/api/admin/csv?batch_id=${batch_id}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "unknown_error",
      },
      { status: 500 }
    );
  }
}