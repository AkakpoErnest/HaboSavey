# Brief: Naiwan promenade A/B images (Kit, 2026-10-07)

**Deliverable:** two photorealistic renders of the *same* Naiwan waterfront source photo, used as option A and option B of the
featured demo poll (`/ja/poll` → slug `promenade`). Both are AI concept images and are labelled "AIイメージ / AI image" in the app.

| | Design | Proposed poll label (ja / en) |
|---|---|---|
| **A** | Traditional Japanese, **wood** | 伝統的な木の遊歩道 / Traditional wooden promenade |
| **B** | Sleek modern Japanese, **steel + patterned stone** | モダンな石と鋼の遊歩道 / Modern stone-and-steel promenade |

**Inputs needed:** one real source photo of the Naiwan waterfront (street level), the same for A and B.
**Output spec:** 3:2 landscape, ≥1600 px wide, JPEG; same framing for A and B so the comparison is fair.

---

## Prompt for image A
The promenade must have a traditional Japanese design using wood as the main material. The promenade should include:
- a wide boardwalk pathway, where residents can stroll along the waterfront
- the pathway should have gentle curves and wrap around the bay
- small streetlights with a wooden lantern design
- path lights that illuminate the walkway
- trees that provide shade regularly spaced along the pathway
- occasional benches for seating
- planters with green plants and flowers
- a small plaza with a fountain and seating
- include a few people strolling and sitting
- behind the promenade is a marina with many sailboats and pleasure craft
- behind the marina some city buildings should be visible as in the source image
- include the hilly background from the source image so it is recognizable for people who know the city

Rendering details:
- the image should be photorealistic, not an architectural drawing
- the viewpoint of the image is at street level
- the time of day is just before dusk in the early evening
- the sun does not shine on the harbor at this time
- create a gradated blue sky with almost no clouds
- lighting should be illuminated
- buildings and boats in the background should have lights on
- the promenade should have a warm, inviting glow

## Prompt for image B
The promenade must have a sleek and modern Japanese design using steel as the main material. The promenade should include:
- a wide pathway in patterned stone, where residents can stroll along the waterfront
- the pathway should have gentle curves and wrap around the bay
- small streetlights with a metal lantern design
- path lights that illuminate the walkway
- trees that provide shade regularly spaced along the pathway
- occasional benches for seating
- planters with green plants and flowers
- a small plaza with a fountain and seating
- include a few people strolling and sitting
- behind the promenade is a marina with many sailboats and pleasure craft
- behind the marina some city buildings should be visible as in the source image
- include the hilly background from the source image so it is recognizable for people who know the city

Rendering details:
- the image should be photorealistic, not an architectural drawing
- the viewpoint of the image is at street level
- the time of day is just before dusk in the early evening
- the sun does not shine on the harbor at this time
- create a gradated blue sky with almost no clouds
- lighting should be illuminated
- buildings and boats in the background should have lights on
- the promenade should have a warm, inviting glow *(the pasted text was cut off at "glo…"; completed to match A. Kit, please confirm nothing followed)*

---

## Plan (Claude)
1. **Generate**: both renders from the one source photo with OpenAI `gpt-image-2` (needs API credits on the account; the key is already
   on Netlify), or in ChatGPT if Kit prefers. Do 2–3 tries each and pick the pair with matching framing and light.
2. ✅ **App (done 2026-10-07)**: added both prompts as presets ("Traditional wood" / "Modern steel") in the staff poll form's AI panel (`components/admin/poll-prompt.ts`),
   with an option to generate **A from the photo too**, so staff can recreate this kind of A/B themselves.
3. **Demo poll**: replace the `promenade` poll's A/B images and labels with the two renders, AI-labelled on both. Upload to Netlify Blobs,
   update Neon, and clear test votes before the presentation (with Ernest's OK).
4. **Verify**: phone-size check of `/ja/poll` and `/ja/poll/result`, then commit, push and update the README.

**Blocked on:** (a) the Naiwan source photo, (b) Kit's OpenAI API key with credits (replaces the current key on Netlify).

**How staff do it (once the key is in):** `/ja/admin/polls` → New poll → "Source photo for AI" → open "Generate A with AI" (preset: Kit A wood)
and "Generate B with AI" (preset: Kit B steel) → pick the best of each → labels → tick "Show this poll at /poll" → Create.
