import IssueForm from "./IssueForm";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function AdminPage(props: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await props.searchParams;

  if (!key || key !== process.env.ADMIN_KEY) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Admin</h1>
        <div>key が違います</div>
      </div>
    );
  }

  const { data } = await supabaseAdmin
    .from("tickets")
    .select("batch_id, issued_at, result")
    .order("issued_at", { ascending: false });

  const map = new Map<
    string,
    { issued_at: string; total: number; wins: number }
  >();

  for (const row of data ?? []) {
    const batchId = row.batch_id ?? "";
    if (!batchId) continue;

    if (!map.has(batchId)) {
      map.set(batchId, {
        issued_at: row.issued_at ?? "",
        total: 0,
        wins: 0,
      });
    }

    const v = map.get(batchId)!;
    v.total += 1;
    if (row.result === "win") v.wins += 1;
  }

  const rows = Array.from(map.entries()).map(([batch_id, v]) => ({
    batch_id,
    issued_at: v.issued_at,
    total: v.total,
    wins: v.wins,
  }));

  return (
    <div style={{ padding: 24 }}>
      <h1>Admin</h1>

      {/* 新フォーム */}
      <h2 style={{ marginTop: 24 }}>ロット発行</h2>
      <IssueForm adminKey={key} />

      <h2 style={{ marginTop: 40 }}>ロット一覧</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>発行日時</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>batch_id</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>枚数</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>当たり</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>CSV</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.batch_id}>
              <td style={{ padding: 8 }}>{r.issued_at}</td>
              <td style={{ padding: 8 }}>{r.batch_id}</td>
              <td style={{ padding: 8 }}>{r.total}</td>
              <td style={{ padding: 8 }}>{r.wins}</td>
              <td style={{ padding: 8 }}>
                <a
                  href={`/api/admin/csv?batch_id=${r.batch_id}&key=${encodeURIComponent(key)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  再発行
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}