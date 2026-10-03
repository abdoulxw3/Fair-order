import BidLog from "./components/BidLog";
import Claim from "./components/Claim";
import Proof from "./components/Proof";
import Simulator from "./components/Simulator";

const STEPS = [
  { title: "Bid", text: "Post a message to an HCS topic. The paying account is the bidder." },
  { title: "Settle", text: "Read the topic from the mirror node and allocate in order, up to a cap." },
  { title: "Publish", text: "The owner publishes a Merkle root. Anyone can recompute it." },
  { title: "Claim", text: "Prove your allocation and pay HBAR to receive the HTS token." },
  { title: "Seed", text: "Raised HBAR and tokens create a SaucerSwap pool." },
];

export default function Home() {
  return (
    <div className="wrap">
      <nav className="nav">
        <span className="brand">Fair Order</span>
        <a className="muted small" href="https://github.com/abdoulxw3/Fair-order">
          GitHub &rarr;
        </a>
      </nav>

      <header className="hero">
        <span className="pill">Hedera testnet &middot; HCS &middot; HTS &middot; SaucerSwap</span>
        <h1>Token sales ordered by consensus, not gas.</h1>
        <p>
          Bids are HCS messages. Allocation follows their consensus order, and anyone can
          recompute it from the mirror node.
        </p>
        <div className="actions">
          <a className="btn primary" href="#try">Try the queue</a>
          <a className="btn" href="#proof">See the testnet run</a>
        </div>
      </header>

      <Simulator />
      <BidLog />
      <Claim />

      <section className="section">
        <h2>How it works</h2>
        <div className="steps">
          {STEPS.map((step, i) => (
            <div key={step.title}>
              <div className="mono accent small">{String(i + 1).padStart(2, "0")}</div>
              <div className="step-title">{step.title}</div>
              <div className="muted small">{step.text}</div>
            </div>
          ))}
        </div>
      </section>

      <Proof />

      <section className="section">
        <h2>Scaffold it</h2>
        <div className="code mono">npm create scaffold-hbar@latest -- --template abdoulxw3/Fair-order</div>
        <p className="faint small">Testnet only, not audited. MIT licensed.</p>
      </section>
    </div>
  );
}
