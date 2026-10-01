export const FAIR_LAUNCH_ABI = [
  "function tinybarPerUnit() view returns (uint256)",
  "function claimed(address) view returns (bool)",
  "function claim(uint256 amount, bytes32[] proof) payable",
];

export const MIRROR_URL = "https://testnet.mirrornode.hedera.com";
export const WEIBAR_PER_TINYBAR = 10_000_000_000n;
