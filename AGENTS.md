# AGENTS.md

Guidance for AI coding agents working in this repository.

## Layout

- `packages/hardhat`: Solidity contracts (`contracts/`), TypeScript scripts (`scripts/`), tests (`test/`)
- `packages/nextjs`: Next.js App Router frontend, one page

## Commands

- `npm run hardhat:test` runs contract and allocation tests
- `npm run lint` compiles the contracts and type-checks both packages
- `npm run next:build` builds the frontend

Run all three before finishing a change.

## Conventions

- Solidity 0.8.24, custom errors, no revert strings, OpenZeppelin 5.0.2
- Inside the Hedera EVM, `msg.value` and balances are tinybars. JSON-RPC wallets send weibar (1 tinybar = 1e10 weibar)
- Merkle leaves are `keccak256(bytes.concat(keccak256(abi.encode(account, amount))))`, matching `@openzeppelin/merkle-tree`. Keep the contract and `settle.ts` in agreement
- Bidders are identified by the HCS message payer, never by message content
- Allocation logic lives only in `scripts/lib/allocate.ts` and must stay deterministic so anyone can recompute it

## Do not

- Commit `.env` or private keys
- Add comments that restate the code
- Put application logic in the mock contracts
