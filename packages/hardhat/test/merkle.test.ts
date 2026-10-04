import { expect } from "chai";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { allocate } from "../scripts/lib/allocate";
import { buildTree, entriesFor, LEAF_TYPES } from "../scripts/lib/merkle";

const A = "0x00000000000000000000000000000000000000a1";
const B = "0x00000000000000000000000000000000000000b2";
const C = "0x00000000000000000000000000000000000000c3";

const bids = [
  { account: A, units: 60n },
  { account: B, units: 60n },
  { account: C, units: 60n },
];

describe("merkle tree", () => {
  it("produces the same root every time from the same bids", () => {
    const first = buildTree(allocate(bids, 100n, 100n)).root;
    const second = buildTree(allocate(bids, 100n, 100n)).root;
    expect(second).to.equal(first);
  });

  it("gives every entry a proof that verifies against the root", () => {
    const allocations = allocate(bids, 100n, 100n);
    const tree = buildTree(allocations);
    for (const entry of entriesFor(allocations, tree)) {
      expect(
        StandardMerkleTree.verify(tree.root, LEAF_TYPES, [entry.account, entry.amount], entry.proof),
      ).to.equal(true);
    }
  });

  it("changes the root when a single amount changes", () => {
    const allocations = allocate(bids, 100n, 100n);
    const altered = allocations.map((a, i) => (i === 0 ? { ...a, amount: a.amount + 1n } : a));
    expect(buildTree(altered).root).to.not.equal(buildTree(allocations).root);
  });

  it("changes the root when the bid order changes the outcome", () => {
    const forward = buildTree(allocate(bids, 100n, 100n)).root;
    const reversed = buildTree(allocate([...bids].reverse(), 100n, 100n)).root;
    expect(reversed).to.not.equal(forward);
  });
});
