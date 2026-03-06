import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Ng = { ok: false; error: string };

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ batch_id: string }> }
) {
  try {
    const { batch_id } = await ctx.params;
    const key = req.nextUrl.searchParams.get("key");

    if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
      return NextResponse.json<Ng>(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("tickets")
      .select("token, result, prize_type, batch_id, issued_at")
      .eq("batch_id", batch_id)
      .order("issued_at", { ascending: true });

    if (error) {
      return NextResponse.json<Ng>(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json<Ng>(
        { ok: false, error: "batch_not_found" },
        { status: 404 }
      );
    }

    const baseUrl = req.nextUrl.origin;
    const header = ["token", "url"];
    const lines = data.map((row) => {
      const url = `${baseUrl}/q/${row.token}`;
      return [row.token, url];
    });

    const csv = [header, ...lines]
      .map((cols) =>
        cols
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="batch_${batch_id}.csv"`,
      },
    });
  } catch (e) {
    return NextResponse.json<Ng>(
      { ok: false, error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}