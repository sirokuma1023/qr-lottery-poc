"use client";

import { useState } from "react";

type Props = {
  adminKey: string;
};

export default function IssueForm({ adminKey }: Props) {
  const [count, setCount] = useState("100");
  const [winCount, setWinCount] = useState("3");
  const [prizeType, setPrizeType] = useState("coupon");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/admin/issue?key=${encodeURIComponent(adminKey)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count: Number(count),
          winCount: Number(winCount),
          prizeType,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setMessage(`発行失敗: ${json?.error ?? "unknown_error"}`);
        return;
      }

      const batchId = json.batch_id ?? "(batch_idなし)";
      const issued = Array.isArray(json.items) ? json.items.length : 0;

      setMessage(`発行成功: ${issued}件 / batch_id=${batchId}`);
    } catch (err) {
      setMessage(
        `発行失敗: ${err instanceof Error ? err.message : "unknown_error"}`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
      <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 700 }}>発行枚数</div>
          <input
            type="number"
            min={1}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div>
          <div style={{ marginBottom: 4, fontWeight: 700 }}>当たり本数</div>
          <input
            type="number"
            min={0}
            value={winCount}
            onChange={(e) => setWinCount(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div>
          <div style={{ marginBottom: 4, fontWeight: 700 }}>景品名</div>
          <input
            type="text"
            value={prizeType}
            onChange={(e) => setPrizeType(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="coupon"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            border: 0,
            padding: "12px 16px",
            borderRadius: 12,
            background: "#111827",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {loading ? "発行中..." : "ロット発行"}
        </button>

        {message ? (
          <div
            style={{
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "#f9fafb",
              whiteSpace: "pre-wrap",
            }}
          >
            {message}
          </div>
        ) : null}
      </div>
    </form>
  );
}