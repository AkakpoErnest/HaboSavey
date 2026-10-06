# Ethereum network and wallet recommendation

Prepared 2026-10-06 (JST) for Citizen Sentiment and the KesenMemento integration. Research recommendation only; no accounts, contracts, paid plans or wallets have been created.

## Recommendation

Pilot on **Base Sepolia with Privy email authentication and app-paid gas**, while retaining the Postgres participation ledger as the source of truth. First prove account recovery, the existing Supabase identity mapping, sponsored contract calls, and game reconnect/revocation. Mainnet deployment is a separate decision after measured costs and integration tests. Base is an Ethereum L2, not Ethereum mainnet: confirm this satisfies Ernest's stated Ethereum preference before deployment.

This choice is an engineering inference: Base provides a documented fee model and Privy documents email authentication, existing-auth integration, and sponsorship on Base/Base Sepolia. It is not a claim that this combination is cheapest or has verified Japanese customer support. [Base fees](https://docs.base.org/specifications/transactions/network-fees), [Privy authentication](https://docs.privy.io/authentication), [Privy sponsorship](https://docs.privy.io/wallets/gas-and-asset-management/gas/overview).

## Networks

| Network | Fee considerations | Pilot network | Assessment for this app |
|---|---|---|---|
| Ethereum mainnet | Gas used multiplied by base plus priority fee. Cost varies with demand and ETH price. | Sepolia | Benchmark compatibility; avoid committing to per-participation mainnet transactions before costing. |
| Base | L2 execution plus L1 publication/security cost; execution floor alone is not total cost. | Base Sepolia | Preferred initial integration target. |
| OP Mainnet | Execution, L1 data and operator fee components. | OP Sepolia | Viable alternative; compare complete receipts, not just gas price. |
| Arbitrum One | L2 execution and parent-chain data posting affect total fees. | Arbitrum Sepolia | Viable alternative; benchmark the same contract operations. |

Sources: [Ethereum fees](https://ethereum.org/developers/docs/gas/), [Base fees](https://docs.base.org/specifications/transactions/network-fees), [OP fee model](https://docs.optimism.io/op-stack/transactions/fees), [Arbitrum gas and fees](https://docs.arbitrum.io/how-arbitrum-works/deep-dives/gas-and-fees). Privy's [supported sponsorship networks](https://docs.privy.io/wallets/gas-and-asset-management/gas/overview) include all four mainnets and the four testnets above. Testnet results establish functionality, not mainnet dollar pricing.

## Cost worksheet — assumptions, not quotes

Planning workload: 1,000 residents × 3 civic actions/week × 4.33 weeks = **12,990 civic actions/month**. If each action mints separately, that is 12,990 mint transactions. Add an assumed one deposit/resident/month: 1,000 deposits. Game rewards and collectible mints are additional; visiting all 51 places once would add up to 51,000 first-visit events across the cohort. They need not each become an immediate on-chain transaction.

Illustrative mainnet sensitivity only, assuming 100,000 gas/mint, 150,000 gas/deposit, and ETH at $2,000. These gas figures are placeholders, not measurements of our contracts; ETH price and gas prices are not current quotes.

| Assumed effective gas price | Per mint | Per deposit | Monthly 12,990 mints + 1,000 deposits |
|---|---:|---:|---:|
| 1 gwei | $0.20 | $0.30 | $2,898 |
| 10 gwei | $2.00 | $3.00 | $28,980 |
| 30 gwei | $6.00 | $9.00 | $86,940 |

Formula: gas × gwei × 10^-9 × ETH/USD. For L2s, include chain-specific data/operator components and wallet/paymaster overhead. Do not apply the mainnet table to L2s.

For any measured **all-in** L2 fee, a planning sensitivity of $0.005/$0.02/$0.10 per transaction would imply $69.95/$279.80/$1,399.00 for 13,990 transactions. These are hypothetical budget scenarios, not a price ranking of the networks. Wallet subscriptions, active-user charges, sponsorship service fees, RPC, retries and game activity are excluded.

Before selecting production budgets: run `forge test --gas-report`; estimate actual mint/deposit/collectible calls and smart-account overhead; collect complete fee quotes at multiple times; record median and p95. Use idempotent queued settlement, an explicit ledger-to-chain checkpoint and a clear pending/confirmed state. Never mint independently from both game callbacks and civic rewards without a shared deduplication design.

## Wallet/provider comparison

| Provider | Email and sponsorship evidence | Project fit and unresolved cost/support questions |
|---|---|---|
| Privy | Email OTP and existing-auth integration; managed app-paid sponsorship. | First pilot choice. Avoid a second independent user identity; prove Supabase mapping. Sponsorship includes network costs and a service fee; obtain an actual plan quote. |
| thirdweb | In-app wallet email verification and sponsored execution are documented. | Strong alternative for a game integration. Test the chosen wallet execution mode and stable account address; account abstraction is not a drop-in authorization fix. Confirm current paid-plan and sponsorship billing. |
| Alchemy Wallet APIs (Account Kit successor path) | Email/social/passkey wallets and gas policies are documented. | Good option when granular sponsorship controls matter. Mainnet sponsorship requires a paid plan; testnets available across plans. Verify SDK maturity and identity integration before migration. |
| Coinbase Smart Wallet / CDP Paymaster | Official guide documents Base and Base Sepolia paymaster integration. | Base-focused alternative. Email-only onboarding and recovery for the exact selected Coinbase product were not verified in this review; do not conflate Smart Wallet, embedded wallet and exchange accounts. Prove the requirement before selection. |

Sources: [Privy auth](https://docs.privy.io/authentication), [Privy fees/sponsorship](https://docs.privy.io/wallets/gas-and-asset-management/gas/overview), [thirdweb email wallet API](https://portal.thirdweb.com/typescript/v5/inAppWallet), [thirdweb sponsorship](https://portal.thirdweb.com/wallets/sponsor-gas), [Alchemy wallet introduction](https://www.alchemy.com/docs/wallets/concepts/intro-to-account-kit), [Alchemy sponsorship policies](https://www.alchemy.com/docs/wallets/transactions/sponsor-gas/sponsorship-policy-management), [Coinbase paymaster integration](https://docs.cdp.coinbase.com/paymaster/guides/wagmi-viem-integration).

**Japan support:** none of these technical pages establishes a Japan-specific service/support commitment or local data residency. Obtain provider confirmation of Japanese resident eligibility, contracting entity, support hours/language, data handling and recovery before production. Japanese UI is our responsibility; do not equate worldwide chain accessibility with vendor availability.

**Older residents:** keep the existing email entry point, readable Japanese, clear retry states and an assisted recovery path. No seed phrases, network selector, bridging or ETH purchase in ordinary participation. Explain game permissions in plain language and allow disconnection. Validate this with actual target users on older phones; these are design goals, not tested usability claims.

## Fit with the current implementation

The current game link token authorizes off-chain game APIs; it is not an embedded wallet or an on-chain signature. The game owner should receive only the client integration and narrow API access. Server minting authority must stay server-side. Wallet identity and permission must be independently verified, not inferred from a browser-supplied wallet address.

Before the pilot, resolve the token-secret/state checks and reward-cap concurrency issues recorded in CONVERSATION.md, apply the game migration to an isolated test DB, and test account switching/revocation. No contract deployment is implied by this document. The game's client-reported visits remain forgeable; a low cap reduces exposure but does not prove physical presence or completion.

Final choice for the next experiment: **Base Sepolia + Privy, app-paid gas, off-chain ledger retained**, with thirdweb as the fallback if the existing-auth or recovery trial fails. Mainnet pricing, Japan provider availability and user recovery remain explicit validation gates.
