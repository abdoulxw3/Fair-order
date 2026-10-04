import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import type { Allocation } from "./allocate";

export const LEAF_TYPES = ["address", "uint256"];

export interface Entry {
  account: string;
  amount: string;
  proof: string[];
}

export function buildTree(allocations: Allocation[]) {
  return StandardMerkleTree.of(
    allocations.map((a) => [a.account, a.amount.toString()]),
    LEAF_TYPES,
  );
}

export function entriesFor(allocations: Allocation[], tree: ReturnType<typeof buildTree>): Entry[] {
  return allocations.map((a, i) => ({
    account: a.account,
    amount: a.amount.toString(),
    proof: tree.getProof(i),
  }));
}
