import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers } from "hardhat";
import { required } from "./lib/config";

const CLAIM_WINDOW_SECONDS = Number(process.env.CLAIM_WINDOW_SECONDS ?? 86_400);

async function main() {
  const { root } = JSON.parse(
    readFileSync(resolve(__dirname, "../../nextjs/public/allocations.json"), "utf8"),
  );
  const launch = await ethers.getContractAt("FairLaunch", required("LAUNCH_ADDRESS"));
  const deadline = Math.floor(Date.now() / 1000) + CLAIM_WINDOW_SECONDS;

  await (await launch.publishAllocations(root, deadline)).wait();
  console.log(`Published ${root}, claims close at ${new Date(deadline * 1000).toISOString()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
