# Fair Order

A scaffold-hbar template for a token sale where bids are ordered by Hedera Consensus Service (HCS) timestamps instead of gas auctions. Early bidders get their allocation first, nobody can front-run, and anyone can recompute the result from the public mirror node.

Once the claim window closes, the proceeds can seed a SaucerSwap HBAR/token pool.

## How it works

1. **Bid.** Bidders send `{"v":1,"units":"<amount>"}` to an HCS topic. The bidder is the message payer, so nobody can bid on behalf of another account.
2. **Settle.** `launch:settle` reads the topic from the mirror node in consensus order and allocates first-come-first-served, up to a per-wallet cap and the total supply. It writes a Merkle tree of the allocations.
3. **Publish.** The owner publishes the Merkle root to the `FairLaunch` contract. Anyone can rerun step 2 and compare roots.
4. **Claim.** Each bidder calls `claim(amount, proof)` and pays `amount * tinybarPerUnit` in HBAR to receive the HTS token.
5. **Seed.** After the deadline the owner calls `seedLiquidity` to pair the raised HBAR with unclaimed tokens on SaucerSwap, then `sweep` for anything left.

Services used: HCS (ordering), HTS (sale token), smart contracts (claims), SaucerSwap (liquidity).

## Prerequisites

- Node.js 20.18.3 or later
- A Hedera testnet account with an ECDSA key, from the [Hedera Portal](https://portal.hedera.com), funded from the faucet. A 20-token bid at the default price costs 20 HBAR to claim, so fund the account with at least 25.

## Quick start

```bash
npm create scaffold-hbar@latest -- --template abdoulxw3/Fair-order
cd <project>
cp packages/hardhat/.env.example packages/hardhat/.env
```

Set `HEDERA_ACCOUNT_ID`, `DEPLOYER_PRIVATE_KEY` and `ROUTER_ADDRESS` in `packages/hardhat/.env` (see the table below), then run the steps in order:

```bash
npm run hardhat:test
npm run launch:create -w packages/hardhat
```

`launch:create` prints `TOKEN_EVM_ADDRESS` and `TOPIC_ID`. Add both to `.env`, then continue:

```bash
npm run hardhat:deploy -- --network hederaTestnet
```

Deploy prints `LAUNCH_ADDRESS`. Add it to `.env`, then run the sale:

```bash
npm run launch:bid -w packages/hardhat -- 2000000000
npm run launch:settle -w packages/hardhat
npm run launch:publish -w packages/hardhat -- --network hederaTestnet
npm run launch:claim -w packages/hardhat -- --network hederaTestnet
```

The bid above is 20 tokens (the token has 8 decimals). Settle waits on the mirror node, so give it about 10 seconds after bidding. Publishing opens a 24-hour claim window.

To use the UI, create `packages/nextjs/.env.local`:

```
NEXT_PUBLIC_LAUNCH_ADDRESS=<LAUNCH_ADDRESS>
NEXT_PUBLIC_TOPIC_ID=<TOPIC_ID>
```

Then run `npm run next:start` and connect a wallet on Hedera Testnet (chain ID 296, RPC `https://testnet.hashio.io/api`). The page lists the bid log and lets the connected account claim its allocation.

Any bidder other than the deployer must associate the sale token with their account before claiming.

## Environment variables

Set these in `packages/hardhat/.env`.

| Variable | Purpose |
| --- | --- |
| `HEDERA_ACCOUNT_ID` | Testnet account ID, for example `0.0.1234` |
| `DEPLOYER_PRIVATE_KEY` | Hex ECDSA private key of that account |
| `SALE_SUPPLY_UNITS` | Total supply in smallest units |
| `WALLET_CAP_UNITS` | Maximum allocation per account |
| `TINYBAR_PER_UNIT` | Price in tinybars per smallest token unit |
| `TOKEN_EVM_ADDRESS` | Printed by `launch:create` |
| `TOPIC_ID` | Printed by `launch:create` |
| `ROUTER_ADDRESS` | SaucerSwap V1 router. On testnet use `0x0000000000000000000000000000000000004b40` (contract `0.0.19264`) |
| `LAUNCH_ADDRESS` | Printed by deploy |

Never commit `.env`. It is already in `.gitignore`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run hardhat:test` | Contract and allocation tests |
| `npm run lint` | Compiles the contracts and type-checks both packages |
| `npm run launch:create -w packages/hardhat` | Creates the HTS token and the HCS topic |
| `npm run hardhat:deploy -- --network hederaTestnet` | Deploys `FairLaunch` and funds it with the supply |
| `npm run launch:bid -w packages/hardhat -- <units>` | Posts a bid to the topic |
| `npm run launch:settle -w packages/hardhat` | Builds allocations and the Merkle tree from the topic |
| `npm run launch:publish -w packages/hardhat -- --network hederaTestnet` | Publishes the root and opens the claim window |
| `npm run launch:claim -w packages/hardhat -- --network hederaTestnet` | Claims the signer's allocation |
| `npm run next:start` | Runs the frontend |
| `npm run next:build` | Builds the frontend |

## Layout

```
packages/hardhat/contracts/FairLaunch.sol   claims and liquidity seeding
packages/hardhat/scripts/lib/allocate.ts    allocation rule
packages/hardhat/scripts/lib/mirror.ts      reads bids from the mirror node
packages/hardhat/scripts/                   create, deploy, bid, settle, publish, claim
packages/hardhat/test/                      contract and allocation tests
packages/nextjs/app/page.tsx                bid log and claim UI
```

## Adapting it

- Change the rule in `allocate.ts`. Any deterministic function of the ordered bids works, because anyone can recompute the published root and compare.
- Claims are paid in HBAR. To sell for another HTS token, replace the `msg.value` check in `claim` with a `transferFrom`.
- Change the claim window length with `CLAIM_WINDOW_SECONDS` in `scripts/publish.ts`.

## Testnet run

The full flow (bid, settle, publish, claim) was run on Hedera testnet:

- [Claim transaction](https://hashscan.io/testnet/transaction/0xbdefd3cf511ae548e99be564375153d1f591ec28ac74ee72ce385a8f939c47b7)
- [FairLaunch contract](https://hashscan.io/testnet/contract/0x245b3bc3de77500f0f79e344889fb99dcc9ba441)
- [HCS bid topic](https://hashscan.io/testnet/topic/0.0.10816688)

## Limits

- The owner chooses the claim window and publishes the root. Trust in the result comes from anyone being able to recompute it from the topic, not from the contract verifying HCS.
- `seedLiquidity` is tested against a mock router only. It has not been run against SaucerSwap on testnet, and no script wraps it yet.
- Inside the Hedera EVM, `msg.value` is in tinybars. The frontend and `claim.ts` convert to the weibar units that JSON-RPC expects.

MIT licensed.
