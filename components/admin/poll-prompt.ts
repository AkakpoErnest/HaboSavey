/** Default rendering brief for generating option B from a photo (by Kit). Staff can edit it per poll. */
export const DEFAULT_OPTION_B_PROMPT = `This is an image of the waterfront of the bay in Kesennuma, Japan, taken in the early evening. Your assignment is to render an image of the waterfront, adding a promenade that runs along the wharf.
The promenade must have a traditional Japanese design using wood as the main material. The promenade should include:
- a wide pathway where residents can stroll along the entire waterfront
- small streetlights with a wooden lantern design, regularly spaced along the pathway
- occasional benches for seating
- planters with green plants and flowers
- a small plaza with a fountain and seating
- include a few people strolling and sitting
- behind the promenade is a marina with many sailboats and pleasure craft
- include the mountainous background from the source image so it is recognizable for people who know the city

Rendering details:
- the image should be photorealistic, not an architectural drawing
- the viewpoint of the image is at street level
- the time of day is late afternoon to early evening
- create a gradated blue early evening sky with no clouds
- lighting should be illuminated
- buildings in the background should have lights on
- the promenade should have a warm, inviting glow`;

/** Kit's A/B briefs (docs/briefs/naiwan-promenade-ab.md): render BOTH options from one source photo. */
export const KIT_WOOD_PROMPT = `This is a street-level photo of the waterfront of the inner bay (Naiwan) in Kesennuma, Japan. Your assignment is to render this same view with a new promenade along the waterfront.
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
- the promenade should have a warm, inviting glow`;
export const KIT_STEEL_PROMPT = `This is a street-level photo of the waterfront of the inner bay (Naiwan) in Kesennuma, Japan. Your assignment is to render this same view with a new promenade along the waterfront.
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
- the promenade should have a warm, inviting glow`;

export const PROMPT_PRESETS = [
  {id: 'wood', labelJa: '伝統的な木の遊歩道（Kit案A）', labelEn: 'Traditional wooden promenade (Kit A)', prompt: KIT_WOOD_PROMPT},
  {id: 'steel', labelJa: 'モダンな石と鋼の遊歩道（Kit案B）', labelEn: 'Modern stone-and-steel promenade (Kit B)', prompt: KIT_STEEL_PROMPT},
  {id: 'classic', labelJa: '木の遊歩道・マリーナ（初期案）', labelEn: 'Wooden promenade + marina (first brief)', prompt: DEFAULT_OPTION_B_PROMPT},
] as const;
