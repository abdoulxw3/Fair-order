import { ethers } from "hardhat";
import { MIRROR_URL } from "./config";

const ROUTER_ABI = ["function factory() view returns (address)"];
const FACTORY_ABI = ["function pairCreateFee() view returns (uint256)"];

export async function poolCreationFee(routerAddress: string) {
  const router = await ethers.getContractAt(ROUTER_ABI, routerAddress);
  const factory = await ethers.getContractAt(FACTORY_ABI, await router.factory());
  const tinycents: bigint = await factory.pairCreateFee();

  const res = await fetch(`${MIRROR_URL}/api/v1/network/exchangerate`);
  const { current_rate } = await res.json();
  const tinybars =
    (tinycents * BigInt(current_rate.hbar_equivalent)) / BigInt(current_rate.cent_equivalent);

  return { tinycents, tinybars };
}
