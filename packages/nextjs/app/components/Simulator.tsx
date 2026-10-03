"use client";

import { useMemo, useState } from "react";
import { allocate, type Mode, type SimBid } from "../../lib/allocate";

const SUPPLY = 600;
const CAP = 250;
const SHADES = ["#7cf2c9", "#4fc7a0", "#2f9478"];
const EXAMPLE: SimBid[] = [
  { id: 1, name: "alice", tokens: 200, gas: 12 },
  { id: 2, name: "whale", tokens: 900, gas: 95 },
  { id: 3, name: "bob", tokens: 150, gas: 20 },
  { id: 4, name: "carol", tokens: 250, gas: 8 },
  { id: 5, name: "dan", tokens: 300, gas: 31 },
];

export default function Simulator() {
  const [bids, setBids] = useState<SimBid[]>([]);
  const [nextId, setNextId] = useState(1);
  const [name, setName] = useState("");
  const [tokens, setTokens] = useState("");
  const [mode, setMode] = useState<Mode>("consensus");
  const [error, setError] = useState("");

  const { rows, left } = useMemo(() => allocate(bids, mode, SUPPLY, CAP), [bids, mode]);
  const filled = rows.filter((row) => row.got > 0);

  function addBid(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number.parseInt(tokens, 10);
    if (!name.trim() || !(amount > 0)) {
      setError("Enter a name and a number of tokens.");
      return;
    }
    const gas = 5 + Math.floor(Math.random() * 95);
    setBids([...bids, { id: nextId, name: name.trim(), tokens: amount, gas }]);
    setNextId(nextId + 1);
    setName("");
    setTokens("");
    setError("");
  }

  function loadExample() {
    setBids(EXAMPLE);
    setNextId(EXAMPLE.length + 1);
    setError("");
  }

  function clear() {
    setBids([]);
    setNextId(1);
    setError("");
  }

  return (
    <div id="try" className="card">
      <div className="sim-head">
        <div>
          <div className="card-title">Queue simulator</div>
          <div className="muted small">{SUPPLY} tokens, {CAP} per wallet. Runs in your browser.</div>
        </div>
        <div className="seg">
          <button className={mode === "consensus" ? "on" : ""} onClick={() => setMode("consensus")}>
            Consensus order
          </button>
          <button className={mode === "gas" ? "on" : ""} onClick={() => setMode("gas")}>
            Highest gas
          </button>
        </div>
      </div>

      <form className="add" onSubmit={addBid}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bidder" />
        <input
          value={tokens}
          onChange={(e) => setTokens(e.target.value)}
          inputMode="numeric"
          placeholder="Tokens"
        />
        <button type="submit" className="go">Add bid</button>
      </form>

      <div className="meta">
        <span className="warn">{error}</span>
        <span>
          <button className="link accent" onClick={loadExample}>Load example</button>
          <button className="link" onClick={clear}>Clear</button>
        </span>
      </div>

      <div className="bar">
        {filled.map((row, i) => (
          <span key={row.bid.id} style={{ width: `${(row.got / SUPPLY) * 100}%`, background: SHADES[i % 3] }} />
        ))}
      </div>
      <div className="bar-labels mono">
        <span>supply {SUPPLY}</span>
        <span>{left} left</span>
      </div>

      {rows.length === 0 && <div className="empty">No bids yet.</div>}
      {rows.map((row) => (
        <div key={row.bid.id} className="bid">
          <span className="mono faint">{row.position}</span>
          <div>
            <div className="bid-name">{row.bid.name}</div>
            <div className="muted small">
              wants {row.bid.tokens} &middot; gas {row.bid.gas} &middot; {row.note}
            </div>
          </div>
          <div className="bid-end">
            <span className={`mono ${row.got > 0 ? "accent" : "faint"}`}>{row.got}</span>
            <button
              className="link"
              aria-label={`Remove ${row.bid.name}`}
              onClick={() => setBids(bids.filter((b) => b.id !== row.bid.id))}
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
