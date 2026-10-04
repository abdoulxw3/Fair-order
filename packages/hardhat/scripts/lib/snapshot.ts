import { allocate } from "./allocate";
import { buildTree, entriesFor } from "./merkle";
import { fetchBids } from "./mirror";

/** Everything derived from the HCS topic: the same topic always yields the same root. */
export async function snapshot(topicId: string, supply: bigint, cap: bigint) {
  const allocations = allocate(await fetchBids(topicId), supply, cap);
  if (allocations.length === 0) throw new Error("No valid bids found on the topic");

  const tree = buildTree(allocations);
  return { root: tree.root, entries: entriesFor(allocations, tree) };
}
