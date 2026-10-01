import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/config";

const key = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { evmVersion: "paris", optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hederaTestnet: {
      url: "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: key ? [key] : [],
    },
  },
};

export default config;
