"use client";

import React, { useState } from "react";

type ApiOk = {
  ok: true;
  status: "claimed" | "already_claimed";
  token: string;
  prize_type: string | null;
  result: string | null;
  claimed_at: string | null;
};

type ApiNg = { ok: false; error: string };

type Phase =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; data: ApiOk }
  | { phase: "error"; msg: string; raw?: any };

export default function ClaimClient({ token }: { token: string }) {
  const [state, setState] = useState<Phase>({ phase: "idle" });

  async function claim() {
    setState({ phase: "loading" });

    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as ApiOk | ApiNg | null;

      if (!json) {
        setState({ phase: "error", msg: `APIがJSONを返していません (HTTP ${res.status})` });
        return;
      }

      if (!res.ok || (json as any).ok === false) {
        const msg = (json as any).error ?? `API error (HTTP ${res.status})`;
        setState({ phase: "error", msg, raw: json });
        return;
      }

      setState({ phase: "done", data: json as ApiOk });
    } catch (e: any) {
      setState({ phase: "error", msg: e?.message ?? String(e) });
    }
  }

  if (state.phase === "loading") return <div style={{ marginTop: 12 }}>処理中...</div>;

  if (state.phase === "error")
    return (
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700 }}>エラー</div>
        <div>内容: {state.msg}</div>
        <button onClick={() => setState({ phase: "idle" })} style={{ marginTop: 8 }}>
          戻る
        </button>
        {state.raw && (
          <pre style={{ marginTop: 12, padding: 10, background: "#fafafa", border: "1px solid #eee", borderRadius: 6 }}>
            {JSON.stringify(state.raw, null, 2)}
          </pre>
        )}
      </div>
    );

  if (state.phase === "done") {
    const d = state.data;
    const already = d.status === "already_claimed";
    const r = d.result;
    const win = r && r !== "lose";

    return (
      <div style={{ marginTop: 12 }}>
        {already && (
          <div style={{ marginBottom: 10, padding: 10, background: "#fff7e6", border: "1px solid #ffd28a", borderRadius: 6 }}>
            <div style={{ fontWeight: 700 }}>このQRは引換済みです</div>
            <div style={{ fontSize: 12, color: "#666" }}>（前回の結果を再表示しています）</div>
          </div>
        )}

        {win ? (
          <>
            <h2>当たり</h2>
            <div>種別: {d.prize_type ?? "-"}</div>
            <div>結果: {r}</div>
          </>
        ) : (
          <>
            <h2>ハズレ</h2>
            <div>結果: {r ?? "lose"}</div>
          </>
        )}

        <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
          claimed_at: {d.claimed_at ?? "-"}
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={() => setState({ phase: "idle" })}>もう一度</button>{" "}
          <button onClick={() => window.history.back()}>Cancel</button>
        </div>

        <pre style={{ marginTop: 12, padding: 10, background: "#fafafa", border: "1px solid #eee", borderRadius: 6 }}>
          {JSON.stringify(d, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={claim}>Claim</button>{" "}
      <button onClick={() => window.history.back()}>Cancel</button>
    </div>
  );
}