import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers } from "hardhat";
import { required } from "./lib/config";

const WEIBAR_PER_TINYBAR = 10_000_000_000n;

async function main() {
  const [signer] = await ethers.getSigners();
  const { entries } = JSON.parse(
    readFileSync(resolve(__dirname, "../../nextjs/public/allocations.json"), "utf8"),
  );
  const entry = entries.find(
    (e: { account: string }) => e.account.toLowerCase() === signer.address.toLowerCase(),
  );
  if (!entry) throw new Error(`No allocation for ${signer.address}`);

  const launch = await ethers.getContractAt("FairLaunch", required("LAUNCH_ADDRESS"), signer);
  const price: bigint = await launch.tinybarPerUnit();
  const value = BigInt(entry.amount) * price * WEIBAR_PER_TINYBAR;

  const tx = await launch.claim(entry.amount, entry.proof, { value });
  await tx.wait();
  console.log(`Claimed ${entry.amount} units: https://hashscan.io/testnet/transaction/${tx.hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
