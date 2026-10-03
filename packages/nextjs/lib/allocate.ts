export type Mode = "consensus" | "gas";

export interface SimBid {
  id: number;
  name: string;
  tokens: number;
  gas: number;
}

export interface SimRow {
  bid: SimBid;
  position: number;
  got: number;
  note: string;
}

function describe(wanted: number, got: number, cap: number): string {
  if (got === 0) return "sold out";
  if (got === wanted) return "filled";
  return got === cap ? `capped at ${cap}` : "partial fill";
}

/** Same rule as scripts/lib/allocate.ts, with an optional highest-gas ordering for comparison. */
export function allocate(bids: SimBid[], mode: Mode, supply: number, cap: number) {
  const ordered = [...bids].sort((a, b) =>
    mode === "gas" ? b.gas - a.gas || a.id - b.id : a.id - b.id,
  );
  const seen = new Set<string>();
  let left = supply;

  const rows: SimRow[] = ordered.map((bid, index) => {
    const key = bid.name.toLowerCase();
    if (seen.has(key)) {
      return { bid, position: index + 1, got: 0, note: "duplicate wallet, ignored" };
    }
    seen.add(key);
    const got = Math.min(bid.tokens, cap, left);
    left -= got;
    return { bid, position: index + 1, got, note: describe(bid.tokens, got, cap) };
  });

  return { rows, left };
}
