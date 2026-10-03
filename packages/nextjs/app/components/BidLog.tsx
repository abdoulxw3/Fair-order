"use client";

import { useEffect, useState } from "react";
import { MIRROR_URL } from "../../lib/abi";

interface Bid {
  sequence: number;
  payer: string;
  units: string;
}

interface TopicMessage {
  sequence_number: number;
  payer_account_id: string;
  message: string;
}

const TOPIC_ID = process.env.NEXT_PUBLIC_TOPIC_ID ?? "";

async function loadBids(): Promise<Bid[]> {
  const res = await fetch(`${MIRROR_URL}/api/v1/topics/${TOPIC_ID}/messages?order=asc&limit=50`);
  if (!res.ok) throw new Error(`Mirror node returned ${res.status}`);
  const { messages } = (await res.json()) as { messages: TopicMessage[] };
  return messages.flatMap((m) => {
    try {
      const { units } = JSON.parse(atob(m.message));
      return [{ sequence: m.sequence_number, payer: m.payer_account_id, units: String(units) }];
    } catch {
      return [];
    }
  });
}

export default function BidLog() {
  const [bids, setBids] = useState<Bid[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!TOPIC_ID) return;
    loadBids().then(setBids).catch((err: Error) => setError(err.message));
  }, []);

  if (!TOPIC_ID) return null;

  return (
    <div className="section">
      <h2>Live bid log</h2>
      <p className="muted">
        Read from the Hedera mirror node for topic {TOPIC_ID}, in consensus order.
      </p>
      <div className="card list">
        {error && <div className="warn">{error}</div>}
        {bids === null && !error && <div className="muted small">Loading</div>}
        {bids?.length === 0 && <div className="muted small">No bids on this topic yet.</div>}
        {bids?.map((bid) => (
          <div key={bid.sequence} className="link-row">
            <span>
              <span className="mono faint">#{bid.sequence}</span> &nbsp; {bid.payer}
            </span>
            <span className="mono muted">{bid.units} units</span>
          </div>
        ))}
      </div>
    </div>
  );
}
