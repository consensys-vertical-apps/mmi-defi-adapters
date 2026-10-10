# Dot staking on Base

This read adapter reports existing DOT principal positions from the immutable
staking vault. It does not deploy a contract, issue a receipt token, construct
transactions, request signatures/approvals, or write to Dot services.

- Product: https://app.usedot.xyz/staking
- Chain: Base, 8453
- Vault: [0x4032d83Fb4a2B905259aE49aBAD1a1Ac00635066](https://basescan.org/address/0x4032d83Fb4a2B905259aE49aBAD1a1Ac00635066#code)
- Underlying DOT: [0x23A2847d772803f9EFC64B4277b782b06296FE51](https://basescan.org/address/0x23A2847d772803f9EFC64B4277b782b06296FE51#code), 18 decimals
- Vault deployment block: `52348946`
- Vault runtime code hash: `0xdab15b2ef170509fcea7a9f9fb1b2a9ed50b8ace482aa5c614e4137caab507e9`

## Balance and valuation

The position is `staked(user) + sum(exits(user, id).amount)` for every existing
exit ID. A requested exit leaves active stake immediately but remains in custody
through the seven-day cooldown and until the user actually withdraws it. A
completed withdrawal deletes that exit. Consequently pending-only accounts stay
visible, while withdrawn DOT is not counted again here. Liquid wallet balances,
other users' stakes, and direct donations to the vault are not included.

The vault address identifies a **non-transferable contract position**, not an
ERC-20 receipt token. Its underlying is the canonical Base DOT above at a 1:1
rate. The existing price adapter supplies DOT's market price; this adapter does
not invent or hardcode a USD value. If pricing is unavailable, the token quantity
must not be interpreted as a zero-value position.

AI reward credits are not ERC-20 tokens. They can be used for AI or exchanged
under separate cycle rules, so this adapter does not report them as DOT or as
immediately owned/claimable USDC. Users manage rewards in the Dot app.

## Discovery and rollout

Index `Staked(address indexed user,uint256 amount)` at the canonical vault, with
the user in topic 1. The vault does not emit receipt-token Transfer events.
Backfill this event from block `52348946` when enabling the adapter so existing
stakers, including accounts holding only pending withdrawals, are discovered.
No user re-stake or signature is needed to read an existing position.

The adapter uses fixed metadata, so no dynamic metadata database build is needed.
It is registered only on Base and excluded from receipt-token unwrapping lookup.
The explicit `unwrap` method describes its 1:1 DOT denomination for inspection.
Wallet placement, grouping, pricing availability and production enablement remain
the responsibility of the integrating application. An upstream PR alone does not
enable the position in MetaMask.

## Read limits and failure behavior

Every getter uses one explicit block number. An omitted block is resolved once.
Pre-deployment queries return no position; failed/malformed RPC reads propagate
instead of returning zero or a partial total. Like the host library, numeric
block snapshots remain subject to the selected RPC's reorg/finality behavior.

To prevent unbounded RPC work, at most **1,024 lifetime exit IDs per wallet** are
enumerated, in groups of 16 concurrent reads. This includes already withdrawn IDs.
Above that count, the adapter returns an explicit error and no partial position.
It never truncates to recent exits. A complete indexed-exit strategy would be
needed to support wallets beyond this limit; no funds or withdrawal rights are
affected by this display limit.

## Validation

- Unit cases cover active/empty/pending-only/mixed balances, deleted and mature
  exits, exact integer precision, cross-account refresh, block pinning, invalid
  inputs, the 1,024/1,025/huge-count boundary, bounded concurrency and RPC failures.
- Fixed-block Base snapshots cover active principal, pending-only principal,
  an empty account, pre-deployment state and the 1:1 denomination. A real stake
  transaction also exercises the upstream indexer's user-event discovery.
- Only three `view` getters are present in the ABI. All reads target the fixed
  vault; no signer, arbitrary contract target, token mint or transaction path is
  introduced.

These checks assess this read integration, not the security of the existing
staking/reward contracts or the complete wallet application.
