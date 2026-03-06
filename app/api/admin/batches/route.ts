import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type TicketRow = {
  batch_id: string | null;
  issued_at: string | null;
  result: "win" | "lose" | null;
};

type BatchSummary = {
  batch_id: string;
  issued_at: string;
  total_count: number;
  win_count: number;
  csv_url: string;
};

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

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("tickets")
      .select("batch_id, issued_at, result")
      .not("batch_id", "is", null)
      .order("issued_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as TicketRow[];
    const map = new Map<string, BatchSummary>();

    for (const row of rows) {
      if (!row.batch_id || !row.issued_at) continue;

      const current = map.get(row.batch_id);

      if (!current) {
        map.set(row.batch_id, {
          batch_id: row.batch_id,
          issued_at: row.issued_at,
          total_count: 1,
          win_count: row.result === "win" ? 1 : 0,
          csv_url: `/api/admin/batch/${row.batch_id}/csv`,
        });
      } else {
        current.total_count += 1;
        if (row.result === "win") current.win_count += 1;

        // 念のため最も古いissued_atでなく、代表値を最初の1件にそろえる
        if (row.issued_at > current.issued_at) {
          current.issued_at = row.issued_at;
        }
      }
    }

    const batches = Array.from(map.values()).sort((a, b) =>
      a.issued_at < b.issued_at ? 1 : -1
    );

    return NextResponse.json({
      ok: true,
      batches,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}