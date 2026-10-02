import { ethers } from "hardhat";
import { required } from "./lib/config";
import { poolCreationFee } from "./lib/fee";

async function main() {
  const [signer] = await ethers.getSigners();
  const { tinycents, tinybars } = await poolCreationFee(required("ROUTER_ADDRESS"));
  const balance = await ethers.provider.getBalance(signer.address);

  console.log(`Pool creation fee: $${ethers.formatUnits(tinycents, 10)} = ${ethers.formatUnits(tinybars, 8)} HBAR`);
  console.log(`Your balance: ${ethers.formatEther(balance)} HBAR`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
