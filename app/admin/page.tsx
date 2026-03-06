export const dynamic = "force-dynamic";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import IssueForm from "./IssueForm";

type TicketRow = {
  batch_id: string | null;
  issued_at: string | null;
  result: "win" | "lose" | null;
};

type BatchItem = {
  batch_id: string;
  issued_at: string;
  total_count: number;
  win_count: number;
  csv_url: string;
};

type ClaimRow = {
  id: number;
  token: string | null;
  status: string | null;
  result: "win" | "lose" | null;
  prize_type: string | null;
  claimed_at: string | null;
};

async function getBatches(): Promise<BatchItem[]> {
  const { data, error } = await supabaseAdmin
    .from("tickets")
    .select("batch_id, issued_at, result")
    .not("batch_id", "is", null)
    .order("issued_at", { ascending: false });

  if (error || !data) return [];

  const rows = data as TicketRow[];
  const map = new Map<string, BatchItem>();

  for (const row of rows) {
    if (!row.batch_id || !row.issued_at) continue;

    const existing = map.get(row.batch_id);

    if (!existing) {
      map.set(row.batch_id, {
        batch_id: row.batch_id,
        issued_at: row.issued_at,
        total_count: 1,
        win_count: row.result === "win" ? 1 : 0,
        csv_url: `/api/admin/batch/${row.batch_id}/csv`,
      });
    } else {
      existing.total_count += 1;
      if (row.result === "win") existing.win_count += 1;
      if (row.issued_at > existing.issued_at) {
        existing.issued_at = row.issued_at;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.issued_at < b.issued_at ? 1 : -1
  );
}

async function getRecentClaims(): Promise<ClaimRow[]> {
  const { data, error } = await supabaseAdmin
    .from("tickets")
    .select("id, token, status, result, prize_type, claimed_at")
    .not("claimed_at", "is", null)
    .order("claimed_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as ClaimRow[];
}

export default async function AdminPage(props: {
  searchParams: { key?: string } | Promise<{ key?: string }>;
}) {
  const { key } = await Promise.resolve(props.searchParams);
  const ok = key && key === process.env.ADMIN_KEY;

  if (!ok) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Admin</h1>
        <div>key が違います</div>
        <div>例: /admin?key=YOUR_KEY</div>
      </div>
    );
  }

  const batches = await getBatches();
  const claims = await getRecentClaims();

  return (
    <div style={{ padding: 24 }}>
      <h1>Admin</h1>

       <section style={{ marginTop: 24 }}>
        <h2>ロット発行</h2>
      <IssueForm adminKey={key!} />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>ロット一覧</h2>

        {batches.length === 0 ? (
          <div>ロットはまだありません</div>
        ) : (
          <table
            border={1}
            cellPadding={8}
            style={{ borderCollapse: "collapse", marginTop: 12, width: "100%" }}
          >
            <thead>
              <tr>
                <th>発行日時</th>
                <th>batch_id</th>
                <th>枚数</th>
                <th>当たり数</th>
                <th>CSV</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.batch_id}>
                  <td>{new Date(b.issued_at).toLocaleString("ja-JP")}</td>
                  <td>{b.batch_id}</td>
                  <td>{b.total_count}</td>
                  <td>{b.win_count}</td>
                  <td>
                    <a href={`${b.csv_url}?key=${key}`}>再発行</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>最新引換履歴</h2>

        {claims.length === 0 ? (
          <div>まだ引換はありません</div>
        ) : (
          <table
            border={1}
            cellPadding={8}
            style={{ borderCollapse: "collapse", marginTop: 12, width: "100%" }}
          >
            <thead>
              <tr>
                <th>id</th>
                <th>token</th>
                <th>status</th>
                <th>result</th>
                <th>prize_type</th>
                <th>claimed_at</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.token ?? ""}</td>
                  <td>{row.status ?? ""}</td>
                  <td>{row.result ?? ""}</td>
                  <td>{row.prize_type ?? ""}</td>
                  <td>
                    {row.claimed_at
                      ? new Date(row.claimed_at).toLocaleString("ja-JP")
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}