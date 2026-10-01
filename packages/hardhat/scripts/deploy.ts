import { ethers } from "hardhat";
import { required } from "./lib/config";

async function main() {
  const [deployer] = await ethers.getSigners();
  const tokenAddress = required("TOKEN_EVM_ADDRESS");

  const launch = await ethers.deployContract("FairLaunch", [
    deployer.address,
    tokenAddress,
    required("ROUTER_ADDRESS"),
    required("TINYBAR_PER_UNIT"),
    required("TOPIC_ID"),
  ]);
  await launch.waitForDeployment();

  const token = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    tokenAddress,
  );
  await (await token.transfer(await launch.getAddress(), required("SALE_SUPPLY_UNITS"))).wait();

  console.log(`LAUNCH_ADDRESS=${await launch.getAddress()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
