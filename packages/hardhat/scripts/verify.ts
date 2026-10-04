import { ethers } from "hardhat";
import { required } from "./lib/config";
import { snapshot } from "./lib/snapshot";

async function main() {
  const { root } = await snapshot(
    required("TOPIC_ID"),
    BigInt(required("SALE_SUPPLY_UNITS")),
    BigInt(required("WALLET_CAP_UNITS")),
  );
  const launch = await ethers.getContractAt("FairLaunch", required("LAUNCH_ADDRESS"));
  const published: string = await launch.merkleRoot();

  console.log(`Recomputed from topic: ${root}`);
  console.log(`Published on-chain:    ${published}`);

  if (root.toLowerCase() !== published.toLowerCase()) {
    console.error("MISMATCH");
    process.exit(1);
  }
  console.log("MATCH: the published root is reproducible from the HCS log.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
