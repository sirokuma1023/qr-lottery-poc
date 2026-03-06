import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../lib/supabaseAdmin";

type Ng = { ok: false; error: string };

export async function GET(req: Request, ctx: { params: { batch_id: string } }) {
  try {
    const batchId = ctx.params.batch_id;

    // ?key=ADMIN_KEY で保護
    const urlObj = new URL(req.url);
    const key = urlObj.searchParams.get("key") ?? "";
    const expected = process.env.ADMIN_KEY ?? "";

    if (!expected) return NextResponse.json<Ng>({ ok: false, error: "admin_key_missing" }, { status: 500 });
    if (!key || key !== expected)
      return NextResponse.json<Ng>({ ok: false, error: "unauthorized" }, { status: 401 });

    if (!batchId) return NextResponse.json<Ng>({ ok: false, error: "missing_batch_id" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("tickets")
      .select("batch_id, issued_at, token, token_hash, result, prize_type")
      .eq("batch_id", batchId)
      .order("issued_at", { ascending: true })
      .limit(10000);

    if (error) return NextResponse.json<Ng>({ ok: false, error: error.message }, { status: 500 });
    if (!data || data.length === 0) return NextResponse.json<Ng>({ ok: false, error: "batch_not_found" }, { status: 404 });

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (req.headers.get("x-forwarded-host")
        ? `${req.headers.get("x-forwarded-proto") ?? "http"}://${req.headers.get("x-forwarded-host")}`
        : `http://${req.headers.get("host")}`);

    // batch内のissued_atは同一想定だが、先頭を採用
    const issuedAt = String(data[0].issued_at ?? "");

    const BOM = "\uFEFF";
    const header = ["batch_id", "issued_at", "token", "token_hash", "print_text", "result", "prize_type"].join(",");
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;

    const lines = data.map((row) => {
      const token = String(row.token ?? "");
      const url = token ? `${baseUrl}/q/${token}` : "";
      const prize = row.prize_type ?? "";
      const result = row.result ?? "";
      const tokenHash = String(row.token_hash ?? "");

      return [
        esc(batchId),
        esc(issuedAt),
        esc(token),
        esc(tokenHash),
        esc(url), // print_text = URL
        esc(String(result)),
        esc(String(prize)),
      ].join(",");
    });

    const csv = BOM + [header, ...lines].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tickets_${batchId}_reissue.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json<Ng>({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}