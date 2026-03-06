type Props = {
  status: "win" | "lose" | "claimed" | "invalid";
  prizeType?: string | null;
};

function getConfig(status: Props["status"], prizeType?: string | null) {
  switch (status) {
    case "win":
      return {
        badge: "当たり",
        title: "おめでとうございます",
        message: prizeType
          ? `景品：${prizeType} をお受け取りください。`
          : "当たりです。スタッフへ画面をご提示ください。",
        emoji: "🎉",
      };
    case "lose":
      return {
        badge: "結果",
        title: "今回はハズレでした",
        message: "またのチャレンジをお待ちしています。",
        emoji: "✨",
      };
    case "claimed":
      return {
        badge: "引換済み",
        title: "このQRはすでに引換済みです",
        message: "前回の結果を再表示しています。",
        emoji: "✅",
      };
    case "invalid":
    default:
      return {
        badge: "無効",
        title: "このQRは利用できません",
        message: "URLが正しいかご確認ください。",
        emoji: "⚠️",
      };
  }
}

export default function ResultCard({ status, prizeType }: Props) {
  const c = getConfig(status, prizeType);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          borderRadius: 24,
          padding: 28,
          boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
          border: "1px solid #e5e7eb",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 12px",
            borderRadius: 9999,
            background: "#111827",
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            marginBottom: 18,
          }}
        >
          {c.badge}
        </div>

        <div
          style={{
            fontSize: 52,
            lineHeight: 1,
            marginBottom: 14,
          }}
        >
          {c.emoji}
        </div>

        <h1
          style={{
            fontSize: 28,
            lineHeight: 1.3,
            fontWeight: 800,
            color: "#111827",
            margin: 0,
          }}
        >
          {c.title}
        </h1>

        <p
          style={{
            marginTop: 14,
            marginBottom: 0,
            fontSize: 16,
            lineHeight: 1.8,
            color: "#4b5563",
          }}
        >
          {c.message}
        </p>

        {(status === "win" || status === "claimed") && prizeType ? (
          <div
            style={{
              marginTop: 20,
              padding: "14px 16px",
              borderRadius: 16,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              fontSize: 15,
              color: "#111827",
              fontWeight: 700,
            }}
          >
            景品：{prizeType}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 22,
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          スタッフ確認用画面
        </div>
      </div>
    </main>
  );
}