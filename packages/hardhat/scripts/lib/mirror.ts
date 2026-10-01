import { getAddress } from "ethers";
import { MIRROR_URL } from "./config";
import type { Bid } from "./allocate";

interface TopicMessage {
  message: string;
  payer_account_id: string;
}

interface TopicPage {
  messages: TopicMessage[];
  links: { next: string | null };
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${MIRROR_URL}${path}`);
  if (!res.ok) throw new Error(`Mirror node returned ${res.status} for ${path}`);
  return (await res.json()) as T;
}

function parseUnits(base64: string): bigint | null {
  try {
    const body = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    return body.v === 1 && /^\d+$/.test(body.units) ? BigInt(body.units) : null;
  } catch {
    return null;
  }
}

async function evmAddressOf(accountId: string): Promise<string> {
  const { evm_address } = await getJson<{ evm_address: string }>(`/api/v1/accounts/${accountId}`);
  return getAddress(evm_address);
}

/** Reads bids in consensus order. The bidder is the HCS payer, so nobody can bid as someone else. */
export async function fetchBids(topicId: string): Promise<Bid[]> {
  const bids: Bid[] = [];
  const evmByPayer = new Map<string, string>();
  let next: string | null = `/api/v1/topics/${topicId}/messages?order=asc&limit=100`;

  while (next) {
    const page: TopicPage = await getJson<TopicPage>(next);
    for (const msg of page.messages) {
      const units = parseUnits(msg.message);
      if (units === null) continue;
      if (!evmByPayer.has(msg.payer_account_id)) {
        evmByPayer.set(msg.payer_account_id, await evmAddressOf(msg.payer_account_id));
      }
      bids.push({ account: evmByPayer.get(msg.payer_account_id)!, units });
    }
    next = page.links.next;
  }

  return bids;
}
