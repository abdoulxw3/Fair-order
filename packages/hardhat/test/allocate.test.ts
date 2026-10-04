import { expect } from "chai";
import { allocate, type Allocation, type Bid } from "../scripts/lib/allocate";

const SUPPLY = 1000n;
const CAP = 250n;

const A = "0x00000000000000000000000000000000000000a1";
const B = "0x00000000000000000000000000000000000000b2";
const C = "0x00000000000000000000000000000000000000c3";

function account(n: number): string {
  return `0x${n.toString(16).padStart(40, "0")}`;
}

/** Small seeded generator so a failing case can be replayed from its seed. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBids(random: () => number): Bid[] {
  const count = Math.floor(random() * 20);
  return Array.from({ length: count }, () => ({
    account: account(1 + Math.floor(random() * 8)),
    units: BigInt(Math.floor(random() * 500)),
  }));
}

/** The first positive bid per wallet, in bid order. Later and zero-unit bids never count. */
function firstAsks(bids: Bid[]): Map<string, bigint> {
  const asks = new Map<string, bigint>();
  for (const bid of bids) {
    const key = bid.account.toLowerCase();
    if (bid.units > 0n && !asks.has(key)) asks.set(key, bid.units);
  }
  return asks;
}

function eachRandomCase(check: (bids: Bid[], result: Allocation[], seed: number) => void) {
  for (let seed = 1; seed <= 500; seed++) {
    const bids = randomBids(rng(seed));
    check(bids, allocate(bids, SUPPLY, CAP), seed);
  }
}

describe("allocate", () => {
  it("serves bids in order until supply runs out", () => {
    const result = allocate(
      [
        { account: A, units: 60n },
        { account: B, units: 60n },
        { account: C, units: 60n },
      ],
      100n,
      100n,
    );
    expect(result).to.deep.equal([
      { account: A, amount: 60n },
      { account: B, amount: 40n },
    ]);
  });

  it("limits each account to the wallet cap", () => {
    expect(allocate([{ account: A, units: 500n }], 1000n, 100n)).to.deep.equal([
      { account: A, amount: 100n },
    ]);
  });

  it("counts only the first bid per account, ignoring address case", () => {
    const result = allocate(
      [
        { account: A, units: 10n },
        { account: A.toUpperCase().replace("0X", "0x"), units: 90n },
      ],
      100n,
      100n,
    );
    expect(result).to.have.length(1);
    expect(result[0].amount).to.equal(10n);
  });

  it("returns nothing when there are no bids", () => {
    expect(allocate([], 100n, 100n)).to.deep.equal([]);
  });

  it("returns nothing when the supply is zero", () => {
    expect(allocate([{ account: A, units: 10n }], 0n, 100n)).to.deep.equal([]);
  });

  it("skips zero-unit bids without using up the wallet's slot", () => {
    const result = allocate(
      [
        { account: A, units: 0n },
        { account: A, units: 50n },
      ],
      100n,
      100n,
    );
    expect(result).to.deep.equal([{ account: A, amount: 50n }]);
  });

  it("stops handing out tokens once the supply is gone", () => {
    const result = allocate(
      [
        { account: A, units: 100n },
        { account: B, units: 100n },
        { account: C, units: 100n },
      ],
      150n,
      100n,
    );
    expect(result).to.deep.equal([
      { account: A, amount: 100n },
      { account: B, amount: 50n },
    ]);
  });

  it("leaves later bidders out when the supply is filled exactly", () => {
    const result = allocate(
      [
        { account: A, units: 100n },
        { account: B, units: 100n },
      ],
      100n,
      100n,
    );
    expect(result).to.deep.equal([{ account: A, amount: 100n }]);
  });

  it("gives the first bidder only the supply when the cap is larger", () => {
    expect(allocate([{ account: A, units: 500n }], 100n, 1000n)).to.deep.equal([
      { account: A, amount: 100n },
    ]);
  });

  it("keeps amounts exact beyond the range of a JavaScript number", () => {
    const result = allocate([{ account: A, units: 10n ** 30n }], 10n ** 25n, 10n ** 20n);
    expect(result).to.deep.equal([{ account: A, amount: 10n ** 20n }]);
  });

  describe("properties over 500 random bid lists", () => {
    it("never allocates more than the supply", () => {
      eachRandomCase((_bids, result, seed) => {
        const total = result.reduce((sum, r) => sum + r.amount, 0n);
        expect(total <= SUPPLY, `seed ${seed}`).to.equal(true);
      });
    });

    it("never gives a wallet more than the cap or more than it asked for", () => {
      eachRandomCase((bids, result, seed) => {
        const asks = firstAsks(bids);
        for (const r of result) {
          const ask = asks.get(r.account.toLowerCase())!;
          expect(r.amount > 0n && r.amount <= CAP && r.amount <= ask, `seed ${seed}`).to.equal(true);
        }
      });
    });

    it("serves each wallet at most once", () => {
      eachRandomCase((_bids, result, seed) => {
        const keys = result.map((r) => r.account.toLowerCase());
        expect(new Set(keys).size, `seed ${seed}`).to.equal(keys.length);
      });
    });

    it("only shortchanges a bidder when the supply runs out", () => {
      eachRandomCase((bids, result, seed) => {
        const total = result.reduce((sum, r) => sum + r.amount, 0n);
        if (total === SUPPLY) return;
        const asks = firstAsks(bids);
        expect(result.length, `seed ${seed}`).to.equal(asks.size);
        for (const r of result) {
          const ask = asks.get(r.account.toLowerCase())!;
          expect(r.amount, `seed ${seed}`).to.equal(ask < CAP ? ask : CAP);
        }
      });
    });

    it("is deterministic and follows bid order", () => {
      eachRandomCase((bids, result, seed) => {
        expect(allocate(bids, SUPPLY, CAP), `seed ${seed}`).to.deep.equal(result);
        const order = [...firstAsks(bids).keys()].slice(0, result.length);
        expect(result.map((r) => r.account.toLowerCase()), `seed ${seed}`).to.deep.equal(order);
      });
    });
  });
});
