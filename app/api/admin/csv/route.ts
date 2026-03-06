import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isAuthorized(req: NextRequest) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return false;

  const queryKey = req.nextUrl.searchParams.get("key");

  return queryKey === adminKey;
}

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const batchId = req.nextUrl.searchParams.get("batch_id");
    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "batch_id_required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("tickets")
      .select(
        "batch_id, issued_at, token, result, prize_type, prize_label, status, claimed_at"
      )
      .eq("batch_id", batchId)
      .order("issued_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const rows = data ?? [];

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    const header = [
      "batch_id",
      "issued_at",
      "token",
      "qr_url",
      "result",
      "prize_type",
      "prize_label",
      "status",
      "claimed_at",
    ];

    const lines = [
      header.join(","),
      ...rows.map((row) => {
        const qrUrl = `${baseUrl}/q/${row.token}`;

        return [
          csvEscape(row.batch_id),
          csvEscape(row.issued_at),
          csvEscape(row.token),
          csvEscape(qrUrl),
          csvEscape(row.result),
          csvEscape(row.prize_type),
          csvEscape(row.prize_label),
          csvEscape(row.status),
          csvEscape(row.claimed_at),
        ].join(",");
      }),
    ];

    const csv = "\uFEFF" + lines.join("\r\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tickets_${batchId}.csv"`,
      },
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