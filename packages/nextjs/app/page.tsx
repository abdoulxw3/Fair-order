"use client";

import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract, type Eip1193Provider } from "ethers";
import { FAIR_LAUNCH_ABI, MIRROR_URL, WEIBAR_PER_TINYBAR } from "../lib/abi";

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

interface Entry {
  account: string;
  amount: string;
  proof: string[];
}

interface BidRow {
  sequence: number;
  payer: string;
  units: string;
}

const LAUNCH_ADDRESS = process.env.NEXT_PUBLIC_LAUNCH_ADDRESS ?? "";
const TOPIC_ID = process.env.NEXT_PUBLIC_TOPIC_ID ?? "";

async function loadBids(): Promise<BidRow[]> {
  if (!TOPIC_ID) return [];
  const res = await fetch(`${MIRROR_URL}/api/v1/topics/${TOPIC_ID}/messages?order=asc&limit=50`);
  if (!res.ok) throw new Error(`Mirror node returned ${res.status}`);
  const { messages } = await res.json();
  return messages.flatMap(
    (m: { sequence_number: number; payer_account_id: string; message: string }) => {
      try {
        const { units } = JSON.parse(atob(m.message));
        return [{ sequence: m.sequence_number, payer: m.payer_account_id, units: String(units) }];
      } catch {
        return [];
      }
    },
  );
}

async function loadEntries(): Promise<Entry[]> {
  const res = await fetch("/allocations.json");
  if (!res.ok) return [];
  return (await res.json()).entries;
}

export default function Home() {
  const [bids, setBids] = useState<BidRow[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadBids().then(setBids).catch((err: Error) => setStatus(err.message));
    loadEntries().then(setEntries).catch((err: Error) => setStatus(err.message));
  }, []);

  const claim = useCallback(async () => {
    if (!window.ethereum) return setStatus("No wallet found");
    try {
      const signer = await new BrowserProvider(window.ethereum).getSigner();
      const entry = entries.find((e) => e.account.toLowerCase() === signer.address.toLowerCase());
      if (!entry) return setStatus("This account has no allocation");

      const launch = new Contract(LAUNCH_ADDRESS, FAIR_LAUNCH_ABI, signer);
      const price: bigint = await launch.tinybarPerUnit();
      const value = BigInt(entry.amount) * price * WEIBAR_PER_TINYBAR;

      setStatus("Waiting for confirmation");
      await (await launch.claim(entry.amount, entry.proof, { value })).wait();
      setStatus(`Claimed ${entry.amount} units`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Claim failed");
    }
  }, [entries]);

  return (
    <main>
      <h1>Fair Launch</h1>
      <p>Bids are ordered by HCS consensus time. Allocations follow that order.</p>

      <h2>Bid log</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Bidder</th>
            <th>Units</th>
          </tr>
        </thead>
        <tbody>
          {bids.map((b) => (
            <tr key={b.sequence}>
              <td>{b.sequence}</td>
              <td>{b.payer}</td>
              <td>{b.units}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Claim</h2>
      <button onClick={claim} disabled={!LAUNCH_ADDRESS || entries.length === 0}>
        Claim allocation
      </button>
      <p>{status}</p>
    </main>
  );
}
