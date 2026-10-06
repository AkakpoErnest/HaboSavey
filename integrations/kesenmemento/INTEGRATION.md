# Citizen Sentiment × KesenMemento: integration guide

Hi! This is a small, optional add-on for KesenMemento v2 (Kesennuma Living City). Players can link their
**Citizen Sentiment** account, the Kesennuma civic app where residents vote on A/B city plans, and then:

- collect a **stamp** for each place they visit in the game, and a **badge** for each ship act they finish
- earn **はまらいんやポイント** for those stamps (verified Kesennuma residents only; small amounts with a daily cap)
- see their points and stamps in a small HUD chip

Later, points will move on-chain (Ethereum L2) and can be spent on in-game collectibles. **Nothing about blockchain
touches the game**: our server holds every key, and the game only makes three HTTPS calls.

## What it costs the game

- One file, `cs-connect.js` (~200 lines, no dependencies, plain ES module).
- About 6 lines in the game code (below).
- **Fail-safe:** if our service is down or the player never connects, every call resolves quietly and the game behaves
  exactly as today. `?cs=0` in the URL disables it completely.
- **Privacy:** the game only ever sees the player's display name, points and stamps. It never sees email addresses or votes.

## Steps

1. Copy `cs-connect.js` into `src/anime/ui/`.
2. At startup, for example at the end of the HUD setup in `src/anime/main.js`:
   ```js
   import { createCitizenSentiment } from './ui/cs-connect.js';
   const cs = createCitizenSentiment({
     baseUrl: 'https://<citizen-sentiment-host>',   // we'll send the final URL
     lang: I18N.lang,                               // 'ja' | 'en'
   });
   cs.handleRedirect();   // picks up the token when the player returns from "Connect"
   cs.mountChip();        // optional ready-made chip, top right; or cs.mountChip(yourHudElement)
   ```
   If you'd rather draw your own UI, skip `mountChip()`. Use `cs.isConnected()`, `cs.connect()`, `cs.me()` and
   `cs.onChange(fn)` instead.
3. When the player **arrives** at a place, using your tour stop id (`bay`, `market`, `pier7`, …):
   ```js
   cs.placeVisited(stop.id);
   ```
   A natural spot is where `tour.walkTo(id)` / `tour.flyTo(id)` finishes in `src/anime/world/life/tour.js`. Ideally fire it
   only on an actual arrival, not on a menu click. Each place is sent once per browser.
4. When a **ship act** finishes (1 send-off, 2 longline, 3 the chain home):
   ```js
   cs.actCompleted(1);
   ```
   For example where `actChanged` is detected in `src/anime/ui/ship.js`.
5. If the language toggles: `cs.setLang('en')`.

The chip uses `z-index: 2147482000` at the top right. Move it with `mountChip(parentElement)` if it overlaps your HUD on phones.

## What happens behind the scenes

```
game ──cs.connect()──► https://<cs-host>/ja/connect?app=kesenmemento&return=<current url>&state=<nonce>
     ◄── redirect back with #cs_token=…&cs_state=…  (fragment only: never sent to any server; state is checked)
game ──GET  /api/game/me        Authorization: Bearer <token>   → { displayName, verifiedResident, points, stamps }
game ──POST /api/game/events    {type:'place_visited', placeId} | {type:'act_completed', act} → { newStamp, pointsAwarded }
```
- Tokens last 30 days. On 401 the kit clears the token and shows "Connect" again.
- CORS is open only to the game's origins. Defaults: `http://127.0.0.1:8787`, `http://localhost:8787` and
  `https://kesennuma-living-city-production.up.railway.app`. Tell us about any other origin.
- Events come from the browser, so they could be faked. That's why rewards are tiny, once per stamp and capped per day.
  You don't need to add anti-cheat.

## Trying it locally

1. Run Citizen Sentiment locally (`bash scripts/setup-local-db.sh && npm run dev` in our repo; it runs without any accounts).
2. Run the game: `bun run serve` (port 8787), with `baseUrl: 'http://localhost:3000'`.
3. Click the chip, sign in with any email, tap **連携してゲームに戻る** (connect and return to the game), then walk to a place: a toast and a stamp appear.
   (Points only appear for verified residents. Locally, open `http://localhost:3000/q/cityhall1` once to verify yourself.)

## Mascot note

Hoya Boya (ホヤぼーや) belongs to Kesennuma City. Using him in a game or in collectibles needs the city's approval, so the
kit doesn't use him.

Questions: open an issue on https://github.com/AkakpoErnest/HaboSavey or message Ernest.
