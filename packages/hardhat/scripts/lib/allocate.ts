export interface Bid {
  account: string;
  units: bigint;
}

export interface Allocation {
  account: string;
  amount: bigint;
}

/**
 * First-come-first-served allocation in consensus order. Each account is served once,
 * limited by the per-wallet cap and the supply that remains.
 */
export function allocate(bids: Bid[], supply: bigint, cap: bigint): Allocation[] {
  const served = new Set<string>();
  const result: Allocation[] = [];
  let remaining = supply;

  for (const bid of bids) {
    const key = bid.account.toLowerCase();
    if (remaining === 0n) break;
    if (served.has(key) || bid.units <= 0n) continue;

    const amount = [bid.units, cap, remaining].reduce((a, b) => (b < a ? b : a));
    served.add(key);
    result.push({ account: bid.account, amount });
    remaining -= amount;
  }

  return result;
}
