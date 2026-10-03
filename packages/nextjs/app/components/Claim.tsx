"use client";

import { useEffect, useState } from "react";
import { BrowserProvider, Contract, type Eip1193Provider } from "ethers";
import { FAIR_LAUNCH_ABI, WEIBAR_PER_TINYBAR } from "../../lib/abi";

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

const LAUNCH_ADDRESS = process.env.NEXT_PUBLIC_LAUNCH_ADDRESS ?? "";

async function loadEntries(): Promise<Entry[]> {
  const res = await fetch("/allocations.json");
  if (!res.ok) return [];
  return (await res.json()).entries;
}

export default function Claim() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadEntries().then(setEntries).catch(() => setEntries([]));
  }, []);

  if (!LAUNCH_ADDRESS || entries.length === 0) return null;

  async function claim() {
    if (!window.ethereum) {
      setStatus("No wallet found");
      return;
    }
    try {
      const signer = await new BrowserProvider(window.ethereum).getSigner();
      const entry = entries.find((e) => e.account.toLowerCase() === signer.address.toLowerCase());
      if (!entry) {
        setStatus("This account has no allocation");
        return;
      }
      const launch = new Contract(LAUNCH_ADDRESS, FAIR_LAUNCH_ABI, signer);
      const price: bigint = await launch.tinybarPerUnit();
      const value = BigInt(entry.amount) * price * WEIBAR_PER_TINYBAR;

      setStatus("Waiting for confirmation");
      await (await launch.claim(entry.amount, entry.proof, { value })).wait();
      setStatus(`Claimed ${entry.amount} units`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Claim failed");
    }
  }

  return (
    <div className="section">
      <h2>Claim</h2>
      <p className="muted">Connect the account that bid, then claim its allocation.</p>
      <div className="card">
        <button className="go" onClick={claim}>Claim allocation</button>
        <p className="muted small">{status}</p>
      </div>
    </div>
  );
}
