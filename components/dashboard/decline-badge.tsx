import { classifyDecline } from "@/lib/decline-codes";

const TONES: Record<string, string> = {
  card_update: "bg-bad/10 text-bad",
  insufficient_funds: "bg-amber-400/10 text-amber-300",
  processing_error: "bg-muted/10 text-muted",
  fraudulent: "bg-bad/10 text-bad",
  generic: "bg-muted/10 text-muted",
};

export function DeclineBadge({ code }: { code: string | null }) {
  const family = classifyDecline(code);
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 font-mono text-xs ${TONES[family] ?? TONES.generic}`}
      title={code ?? "unknown decline"}
    >
      {code ?? "unknown"}
    </span>
  );
}
