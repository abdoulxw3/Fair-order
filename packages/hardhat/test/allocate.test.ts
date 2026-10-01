import { expect } from "chai";
import { allocate } from "../scripts/lib/allocate";

const A = "0x00000000000000000000000000000000000000a1";
const B = "0x00000000000000000000000000000000000000b2";
const C = "0x00000000000000000000000000000000000000c3";

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
});
