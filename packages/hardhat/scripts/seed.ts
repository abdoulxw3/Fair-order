import { AccountUpdateTransaction } from "@hashgraph/sdk";
import { ethers } from "hardhat";
import { hederaClient, required } from "./lib/config";
import { poolCreationFee } from "./lib/fee";

const WEIBAR_PER_TINYBAR = 10_000_000_000n;
const FEE_MARGIN_PERCENT = 105n;
const GAS_LIMIT = 8_000_000;

async function main() {
  const client = hederaClient();
  await (
    await new AccountUpdateTransaction()
      .setAccountId(client.operatorAccountId!)
      .setMaxAutomaticTokenAssociations(-1)
      .execute(client)
  ).getReceipt(client);
  client.close();

  const launch = await ethers.getContractAt("FairLaunch", required("LAUNCH_ADDRESS"));
  const raised = (await ethers.provider.getBalance(await launch.getAddress())) / WEIBAR_PER_TINYBAR;
  const tokenAmount = raised / (await launch.tinybarPerUnit());

  const { tinybars: fee } = await poolCreationFee(required("ROUTER_ADDRESS"));
  const value = ((fee * FEE_MARGIN_PERCENT) / 100n) * WEIBAR_PER_TINYBAR;
  const args = [tokenAmount, raised, tokenAmount, raised] as const;
  const overrides = { value, gasLimit: GAS_LIMIT };

  await launch.seedLiquidity.staticCall(...args, overrides);
  const tx = await launch.seedLiquidity(...args, overrides);
  await tx.wait();
  console.log(`Seeded the pool: https://hashscan.io/testnet/transaction/${tx.hash}`);
}

main().catch((err) => {
  console.error(err.shortMessage ?? err.reason ?? err.message ?? err);
  process.exit(1);
});
