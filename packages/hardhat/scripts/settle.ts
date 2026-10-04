import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { required } from "./lib/config";
import { snapshot } from "./lib/snapshot";

const OUTPUT = resolve(__dirname, "../../nextjs/public/allocations.json");

async function main() {
  const { root, entries } = await snapshot(
    required("TOPIC_ID"),
    BigInt(required("SALE_SUPPLY_UNITS")),
    BigInt(required("WALLET_CAP_UNITS")),
  );

  writeFileSync(OUTPUT, JSON.stringify({ root, entries }, null, 2));
  console.log(`${entries.length} allocations, root ${root}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
