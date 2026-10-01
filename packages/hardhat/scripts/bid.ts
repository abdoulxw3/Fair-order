import { TopicId, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { hederaClient, required } from "./lib/config";

async function main() {
  const units = process.argv[2];
  if (!units || !/^\d+$/.test(units)) {
    throw new Error("Usage: npm run launch:bid -w packages/hardhat -- <units>");
  }

  const client = hederaClient();
  const receipt = await (
    await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(required("TOPIC_ID")))
      .setMessage(JSON.stringify({ v: 1, units }))
      .execute(client)
  ).getReceipt(client);

  console.log(`Bid recorded at sequence ${receipt.topicSequenceNumber}`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
