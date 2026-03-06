import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";
import ResultCard from "./ResultCard";

type PageProps = {
  params: Promise<{ token: string }>;
};

type TicketRow = {
  id: number;
  token: string | null;
  token_hash: string | null;
  result: "win" | "lose" | null;
  prize_type: string | null;
  status: string | null;
  claimed_at: string | null;
};

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export default async function Page({ params }: PageProps) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const tokenHash = sha256Hex(token);

  const { data: ticket, error } = await supabaseAdmin
    .from("tickets")
    .select("id, token, token_hash, result, prize_type, status, claimed_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<TicketRow>();

  if (error || !ticket) {
    return <ResultCard status="invalid" />;
  }

  if (ticket.claimed_at) {
    return (
      <ResultCard
        status="claimed"
        prizeType={ticket.result === "win" ? ticket.prize_type : null}
      />
    );
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabaseAdmin
    .from("tickets")
    .update({
      status: "claimed",
      claimed_at: now,
    })
    .eq("id", ticket.id)
    .is("claimed_at", null);

  if (updateError) {
    return <ResultCard status="invalid" />;
  }

  if (ticket.result === "win") {
    return <ResultCard status="win" prizeType={ticket.prize_type} />;
  }

  return <ResultCard status="lose" />;
}