const BASE = "https://hashscan.io/testnet";

const ITEMS = [
  { label: "HCS bid topic", value: process.env.NEXT_PUBLIC_TOPIC_ID, path: "topic" },
  { label: "Sale token", value: process.env.NEXT_PUBLIC_TOKEN_ID, path: "token" },
  { label: "FairLaunch contract", value: process.env.NEXT_PUBLIC_LAUNCH_ADDRESS, path: "contract" },
  { label: "Claim transaction", value: process.env.NEXT_PUBLIC_CLAIM_TX, path: "transaction" },
  { label: "SaucerSwap pool seeding", value: process.env.NEXT_PUBLIC_SEED_TX, path: "transaction" },
].filter((item): item is { label: string; value: string; path: string } => Boolean(item.value));

function short(value: string): string {
  return value.length > 20 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

export default function Proof() {
  if (ITEMS.length === 0) return null;

  return (
    <div id="proof" className="section">
      <h2>The real run</h2>
      <p className="muted">
        The simulator above is a model. These are the actual testnet transactions, on HashScan.
      </p>
      <div className="card list">
        {ITEMS.map((item) => (
          <a key={item.label} className="link-row" href={`${BASE}/${item.path}/${item.value}`}>
            <span>{item.label}</span>
            <span className="mono muted">{short(item.value)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
