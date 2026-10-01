import "dotenv/config";
import { AccountId, Client, PrivateKey } from "@hashgraph/sdk";

export const MIRROR_URL = "https://testnet.mirrornode.hedera.com";

export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in packages/hardhat/.env`);
  return value;
}

export function hederaClient(): Client {
  const key = PrivateKey.fromStringECDSA(required("DEPLOYER_PRIVATE_KEY"));
  return Client.forTestnet().setOperator(AccountId.fromString(required("HEDERA_ACCOUNT_ID")), key);
}
