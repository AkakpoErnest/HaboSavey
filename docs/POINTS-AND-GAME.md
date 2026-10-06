# Points on-chain + KesenMemento game integration

Game: [KesenMemento v2 / Kesennuma Living City](https://github.com/ss251/kesenmemento-v2) (MIT, by ss251): a 3D
anime-style replica of real Kesennuma in the browser (three.js, Bun), with 51 real places, interiors and a three-act tuna
longliner story. It has no accounts or economy today, so the integration adds both, lightly.

## Flow
```
Citizen Sentiment (this repo)                         chain (EVM L2, TBD)                 KesenMemento (game)
verified resident votes/answers/scans ─► points_ledger ─► HamaPoints.award (mint)
                                                         │ "Send to game": depositTo(vault)
"Connect" button in game ◄── signed link token ──────────┤                                 ◄─ HUD chip: points, stamps
game events (place visited, ship act done) ─► POST /api/game/events ─► GameVault.reward (capped)
"buy" in game ─► POST /api/game/buy ─► GameVault.buyItem ─► KesennumaCollectibles (soulbound)
```
- **One trusted relayer = our backend.** It holds the game-server key (GAME_ROLE) and the minter key, so the game repo
  stays a static app and never holds keys. Game events are client-side and therefore forgeable, so rewards stay small,
  once per place/act, under the vault's daily budget.
- **Collectibles idea (fits the game):** a 51-place **memento stamp rally** (one ERC-1155 id per place in
  `data/landmarks.json`, earned by visiting in-game, or bought with points), ship-act badges, and fish species from the
  live 気仙沼漁協 arrivals. No Hoya Boya artwork without the city's approval.
- **Polls in the world:** a sign at a poll's place (e.g. 内湾) links to the Citizen Sentiment poll, and option B could later
  be shown in 3D.

## Contracts (`contracts/`, Foundry, 16 tests passing)
- `HamaPoints`: ERC-20, 0 decimals; mint by MINTER_ROLE only; wallet-to-wallet transfers revert; `depositTo(project)` only
  into allow-listed projects; projects may send back.
- `GameVault`: credits from deposits; `buyItem` burns points and mints a collectible; `reward` mints within a daily
  budget; `withdraw` returns unspent credits.
- `KesennumaCollectibles`: ERC-1155, soulbound unless the admin enables transfers.

## Open decisions (Ernest)
1. Chain + embedded-wallet provider (Codex is writing `docs/points-chain-options.md`).
2. Coordination with the game's owner (ss251): the game-side "Connect" + HUD chip goes in as a PR to their repo or a fork.
3. Name: "Hoya Boya points" needs Kesennuma City's approval; default "はまらいんやポイント".
4. Legal review (Payment Services Act) before mainnet.
