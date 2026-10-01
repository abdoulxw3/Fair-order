import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { required } from "./lib/config";
import { allocate } from "./lib/allocate";
import { fetchBids } from "./lib/mirror";

const OUTPUT = resolve(__dirname, "../../nextjs/public/allocations.json");

async function main() {
  const bids = await fetchBids(required("TOPIC_ID"));
  const allocations = allocate(
    bids,
    BigInt(required("SALE_SUPPLY_UNITS")),
    BigInt(required("WALLET_CAP_UNITS")),
  );
  if (allocations.length === 0) throw new Error("No valid bids found on the topic");

  const tree = StandardMerkleTree.of(
    allocations.map((a) => [a.account, a.amount.toString()]),
    ["address", "uint256"],
  );

  const entries = allocations.map((a, i) => ({
    account: a.account,
    amount: a.amount.toString(),
    proof: tree.getProof(i),
  }));

  writeFileSync(OUTPUT, JSON.stringify({ root: tree.root, entries }, null, 2));
  console.log(`${entries.length} allocations, root ${tree.root}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
