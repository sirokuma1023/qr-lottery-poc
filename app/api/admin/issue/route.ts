import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
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
  expectedLen?: number;
  gotLen?: number;
};

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}
function token20Hex() {
  return crypto.randomBytes(10).toString("hex"); // 20文字hex
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const key = body?.key;
    const count = Number(body?.count ?? 0);
    const winRate = Number(body?.winRate ?? 0); // 0〜1
    const prizeType = body?.prizeType ?? null;
    const format = body?.format ?? "json"; // "json" | "csv"

    // --- ADMIN KEY check ---
    const expected = process.env.ADMIN_KEY ?? "";
    const got = typeof key === "string" ? key : "";

    if (!expected) {
      return NextResponse.json<Ng>(
        { ok: false, error: "admin_key_missing", expectedLen: 0, gotLen: got.length },
        { status: 500 }
      );
    }
    if (got !== expected) {
      return NextResponse.json<Ng>(
        { ok: false, error: "unauthorized", expectedLen: expected.length, gotLen: got.length },
        { status: 401 }
      );
    }
    // --- /ADMIN KEY check ---

    if (!Number.isFinite(count) || count <= 0 || count > 500) {
      return NextResponse.json<Ng>({ ok: false, error: "invalid_count" }, { status: 400 });
    }
    if (!Number.isFinite(winRate) || winRate < 0 || winRate > 1) {
      return NextResponse.json<Ng>({ ok: false, error: "invalid_winRate" }, { status: 400 });
    }

    // ロット管理（DBにも保存）
    const batchId = crypto.randomBytes(6).toString("hex"); // 12文字
    const issuedAt = new Date().toISOString();

    const items: {
      token: string; // ★ DBにも保存する
      token_hash: string;
      status: "unused";
      result: "win" | "lose";
      prize_type: string | null;
      batch_id: string;
      issued_at: string;
    }[] = [];

    for (let i = 0; i < count; i++) {
      const token = token20Hex();
      const result: "win" | "lose" = Math.random() < winRate ? "win" : "lose";

      items.push({
        token,
        token_hash: sha256Hex(token),
        status: "unused",
        result,
        prize_type: result === "win" ? (typeof prizeType === "string" ? prizeType : null) : null,
        batch_id: batchId,
        issued_at: issuedAt,
      });
    }

    // ★ 変更点：tokenもDBに保存する（除外しない）
    const { error } = await supabaseAdmin.from("tickets").insert(items);

    if (error) {
      return NextResponse.json<Ng>({ ok: false, error: error.message }, { status: 500 });
    }

    const payload: Ok = {
      ok: true,
      batch_id: batchId,
      issued_at: issuedAt,
      items: items.map((x) => ({ token: x.token, result: x.result, prize_type: x.prize_type })),
    };

    // CSV返却（現場向け）
    if (format === "csv") {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        (req.headers.get("x-forwarded-host")
          ? `${req.headers.get("x-forwarded-proto") ?? "http"}://${req.headers.get("x-forwarded-host")}`
          : `http://${req.headers.get("host")}`);

      const batch_id = payload.batch_id;
      const issued_at = payload.issued_at;

      const BOM = "\uFEFF";
      const header = [
        "batch_id",
        "issued_at",
        "token",
        "token_hash",
        "print_text",
        "result",
        "prize_type",
      ].join(",");

      const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;

      const lines = items.map((x) => {
        const url = `${baseUrl}/q/${x.token}`;
        const printText = url; // URLそのまま
        const prize = x.prize_type ?? "";

        return [
          esc(batch_id),
          esc(issued_at),
          esc(x.token),
          esc(x.token_hash),
          esc(printText),
          esc(x.result),
          esc(prize),
        ].join(",");
      });

      const csv = BOM + [header, ...lines].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="tickets_${batch_id}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    return NextResponse.json<Ng>({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}