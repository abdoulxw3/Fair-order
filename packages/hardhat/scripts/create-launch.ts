import { TokenCreateTransaction, TopicCreateTransaction } from "@hashgraph/sdk";
import { hederaClient, required } from "./lib/config";

async function main() {
  const client = hederaClient();
  const treasury = client.operatorAccountId!;

  const tokenReceipt = await (
    await new TokenCreateTransaction()
      .setTokenName("Fair Launch Token")
      .setTokenSymbol("FLT")
      .setDecimals(8)
      .setInitialSupply(BigInt(required("SALE_SUPPLY_UNITS")))
      .setTreasuryAccountId(treasury)
      .execute(client)
  ).getReceipt(client);

  const topicReceipt = await (
    await new TopicCreateTransaction().setTopicMemo("fair-launch bids").execute(client)
  ).getReceipt(client);

  console.log(`TOKEN_EVM_ADDRESS=0x${tokenReceipt.tokenId!.toSolidityAddress()}`);
  console.log(`TOPIC_ID=${topicReceipt.topicId}`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
