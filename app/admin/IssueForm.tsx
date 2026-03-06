"use client";

import { useState } from "react";

type Props = {
  adminKey: string;
};

type PrizeType = "coupon" | "item" | "point";

type PrizeRow = {
  type: PrizeType;
  label: string;
  count: string;
};

export default function IssueForm({ adminKey }: Props) {
  const [total, setTotal] = useState("100");
  const [prizes, setPrizes] = useState<PrizeRow[]>([
    { type: "coupon", label: "100円引きクーポン", count: "3" },
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [csvUrl, setCsvUrl] = useState("");
  const [batchId, setBatchId] = useState("");

  function updatePrize(index: number, patch: Partial<PrizeRow>) {
    setPrizes((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addPrizeRow() {
    setPrizes((prev) => [
      ...prev,
      { type: "coupon", label: "", count: "1" },
    ]);
  }

  function removePrizeRow(index: number) {
    setPrizes((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setCsvUrl("");
    setBatchId("");

    try {
      const totalNum = Number(total);

      const normalizedPrizes = prizes.map((p) => ({
        type: p.type,
        label: p.label.trim(),
        count: Number(p.count),
      }));

      if (!Number.isInteger(totalNum) || totalNum <= 0) {
        setMessage("発行失敗: 総発行枚数を正しく入力してください");
        return;
      }

      if (normalizedPrizes.length === 0) {
        setMessage("発行失敗: 当たり設定を1件以上入力してください");
        return;
      }

      const invalidRow = normalizedPrizes.find(
        (p) => !p.label || !Number.isInteger(p.count) || p.count <= 0
      );

      if (invalidRow) {
        setMessage("発行失敗: 当たり設定のラベルと本数を正しく入力してください");
        return;
      }

      const totalWins = normalizedPrizes.reduce((sum, p) => sum + p.count, 0);

      if (totalWins > totalNum) {
        setMessage("発行失敗: 当たり本数の合計が総発行枚数を超えています");
        return;
      }

      const res = await fetch(
        `/api/admin/issue?key=${encodeURIComponent(adminKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            total: totalNum,
            prizes: normalizedPrizes,
          }),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setMessage(`発行失敗: ${json?.error ?? "unknown_error"}`);
        return;
      }

      const newBatchId = String(json.batch_id ?? "");
      const newCsvUrl = String(json.csv_url ?? "");

      setBatchId(newBatchId);
      setCsvUrl(newCsvUrl);
      setMessage(`発行成功: ${totalNum}件 / batch_id=${newBatchId}`);
    } catch (err) {
      setMessage(
        `発行失敗: ${err instanceof Error ? err.message : "unknown_error"}`
      );
    } finally {
      setLoading(false);
    }
  }

  const totalWinsPreview = prizes.reduce((sum, p) => {
    const n = Number(p.count);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const totalNumPreview = Number(total);
  const losePreview = Number.isFinite(totalNumPreview)
    ? totalNumPreview - totalWinsPreview
    : NaN;

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
      <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 700 }}>総発行枚数</div>
          <input
            type="number"
            min={1}
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            style={{ width: 220, padding: 8 }}
          />
        </div>

        <div>
          <div style={{ marginBottom: 8, fontWeight: 700 }}>当たり設定</div>

          <div style={{ display: "grid", gap: 12 }}>
            {prizes.map((row, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 120px 100px",
                  gap: 8,
                  alignItems: "end",
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  background: "#fafafa",
                }}
              >
                <div>
                  <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 700 }}>
                    種別
                  </div>
                  <select
                    value={row.type}
                    onChange={(e) =>
                      updatePrize(index, {
                        type: e.target.value as PrizeType,
                      })
                    }
                    style={{ width: "100%", padding: 8 }}
                  >
                    <option value="coupon">coupon</option>
                    <option value="item">item</option>
                    <option value="point">point</option>
                  </select>
                </div>

                <div>
                  <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 700 }}>
                    ラベル
                  </div>
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) =>
                      updatePrize(index, { label: e.target.value })
                    }
                    style={{ width: "100%", padding: 8 }}
                    placeholder="100円引きクーポン"
                  />
                </div>

                <div>
                  <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 700 }}>
                    本数
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={row.count}
                    onChange={(e) =>
                      updatePrize(index, { count: e.target.value })
                    }
                    style={{ width: "100%", padding: 8 }}
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => removePrizeRow(index)}
                    disabled={prizes.length === 1}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "#fff",
                      cursor: prizes.length === 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={addPrizeRow}
              style={{
                border: "1px solid #d1d5db",
                padding: "10px 14px",
                borderRadius: 10,
                background: "#fff",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ＋ 当たりを追加
            </button>
          </div>
        </div>

        <div
          style={{
            padding: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#f9fafb",
            lineHeight: 1.8,
          }}
        >
          <div>
            当たり合計: <strong>{totalWinsPreview}</strong>
          </div>
          <div>
            ハズレ予定:{" "}
            <strong>{Number.isFinite(losePreview) ? losePreview : "-"}</strong>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: 220,
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
            <div>{message}</div>

            {batchId ? (
              <div style={{ marginTop: 8 }}>
                batch_id: <strong>{batchId}</strong>
              </div>
            ) : null}

            {csvUrl ? (
  <div style={{ marginTop: 8 }}>
    <a
      href={`${csvUrl}${csvUrl.includes("?") ? "&" : "?"}key=${encodeURIComponent(adminKey)}`}
      target="_blank"
      rel="noreferrer"
    >
      CSVをダウンロード
    </a>
  </div>
) : null}
      </div>
    </form>
  );
}