import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    hasAdminKey: Boolean(process.env.ADMIN_KEY),
    adminKeyLength: process.env.ADMIN_KEY?.length ?? 0,
  });
}