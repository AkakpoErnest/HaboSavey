// Builds the demo poll images into local storage: Naiwan A/B from the photos in scripts/seed-assets, the rest drawn as SVG.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const photo = (file) => sharp(`scripts/seed-assets/${file}`).jpeg({ quality: 86 }).toBuffer();

const W = 1200, H = 800;
const sky = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3ea"/><stop offset="1" stop-color="#eef3ee"/></linearGradient>
<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f9fb0"/><stop offset="1" stop-color="#3f6f82"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#s)"/>
<path d="M0 330 Q200 230 420 300 T820 270 T1200 300 V420 H0Z" fill="#8aa58c"/>
<path d="M0 360 Q300 300 600 350 T1200 340 V430 H0Z" fill="#6f8d77"/>
<rect y="420" width="${W}" height="170" fill="url(#w)"/>
<g fill="#f4efe2"><path d="M760 470 h110 l-16 22 h-80z"/><rect x="805" y="420" width="4" height="50" fill="#4b6660"/></g>
<g fill="#f4efe2"><path d="M960 500 h80 l-12 16 h-58z"/></g>`;
const walk = (fill) => `<rect y="590" width="${W}" height="210" fill="${fill}"/><rect y="580" width="${W}" height="18" fill="#9a9a90"/>`;

const A = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${sky}
<rect y="540" width="${W}" height="60" fill="#a9aaa3"/><rect y="540" width="${W}" height="8" fill="#8c8d86"/>
${walk("#c9c6bb")}
<g stroke="#8c8d86" stroke-width="3">${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 110}" y1="600" x2="${i * 110 - 60}" y2="800"/>`).join("")}</g>
<rect x="140" y="470" width="8" height="140" fill="#6b6b66"/><rect x="120" y="462" width="48" height="10" fill="#6b6b66"/>
<rect x="900" y="470" width="8" height="140" fill="#6b6b66"/><rect x="880" y="462" width="48" height="10" fill="#6b6b66"/>
</svg>`;

const tree = (x, s = 1) => `<g transform="translate(${x} 0) scale(${s} 1)"><rect x="-7" y="560" width="14" height="70" fill="#6d5640"/>
<circle cx="0" cy="525" r="55" fill="#4f7a55"/><circle cx="-30" cy="550" r="38" fill="#5d8a5f"/><circle cx="32" cy="548" r="40" fill="#5d8a5f"/></g>`;
const bench = (x) => `<g fill="#8a5a3c"><rect x="${x}" y="650" width="120" height="14" rx="4"/><rect x="${x}" y="626" width="120" height="10" rx="4"/>
<rect x="${x + 10}" y="664" width="8" height="26" fill="#4b4b48"/><rect x="${x + 102}" y="664" width="8" height="26" fill="#4b4b48"/></g>`;
const lantern = (x) => `<rect x="${x}" y="470" width="6" height="160" fill="#3f4a46"/><circle cx="${x + 3}" cy="466" r="16" fill="#f7d58c"/><circle cx="${x + 3}" cy="466" r="34" fill="#f7d58c" opacity=".25"/>`;

const B = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${sky}
<rect y="560" width="${W}" height="40" fill="#b9b4a5"/>
${walk("#d9c7a5")}
<g stroke="#c4b18c" stroke-width="3">${Array.from({ length: 24 }, (_, i) => `<line x1="${i * 55}" y1="600" x2="${i * 55}" y2="800"/>`).join("")}</g>
<rect x="0" y="600" width="${W}" height="36" fill="#7fa36b"/>
${[60, 330, 610, 890, 1150].map((x) => tree(x)).join("")}
${[170, 460, 750, 1010].map(bench).join("")}
${[250, 540, 820, 1080].map(lantern).join("")}
<g fill="#e46b4a">${[90, 380, 660, 940].map((x) => `<circle cx="${x}" cy="628" r="6"/><circle cx="${x + 16}" cy="632" r="5" fill="#f2c14e"/>`).join("")}</g>
</svg>`;

// ── Neighbourhood park: today (bare lawn, fence) vs idea (trees, playground, benches, flowers) ──
const parkSky = `<rect width="${W}" height="${H}" fill="#dbe9e3"/><circle cx="1020" cy="140" r="70" fill="#f4d9a0"/>
<path d="M0 360 Q300 250 620 330 T1200 300 V520 H0Z" fill="#9db69a"/>`;
const PARK_A = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parkSky}
<rect y="470" width="${W}" height="330" fill="#b9c79a"/>
<g stroke="#8d8a7e" stroke-width="6">${Array.from({ length: 13 }, (_, i) => `<line x1="${60 + i * 90}" y1="520" x2="${60 + i * 90}" y2="610"/>`).join("")}<line x1="40" y1="540" x2="1160" y2="540"/><line x1="40" y1="585" x2="1160" y2="585"/></g>
<rect x="520" y="430" width="160" height="60" fill="#c9c3b3"/><rect x="560" y="400" width="80" height="34" fill="#a49e8f"/>
</svg>`;
const kid = (x) => `<g><circle cx="${x}" cy="610" r="9" fill="#5a4a3a"/><rect x="${x - 7}" y="619" width="14" height="24" rx="5" fill="#e46b4a"/></g>`;
const PARK_B = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parkSky}
<rect y="470" width="${W}" height="330" fill="#9fc27f"/>
<path d="M0 700 Q600 610 1200 700 V800 H0Z" fill="#e3d2ad"/>
${[90, 300, 930, 1120].map((x) => tree(x, 1.1)).join("").replaceAll("560", "540").replaceAll("525", "505")}
<g><rect x="470" y="520" width="12" height="120" fill="#c0566b"/><rect x="620" y="520" width="12" height="120" fill="#c0566b"/><rect x="465" y="512" width="172" height="12" rx="6" fill="#d97a8c"/>
<line x1="510" y1="524" x2="510" y2="600" stroke="#5a4a3a" stroke-width="3"/><line x1="540" y1="524" x2="540" y2="600" stroke="#5a4a3a" stroke-width="3"/><rect x="502" y="598" width="46" height="8" rx="3" fill="#f4c47a"/>
<path d="M660 640 L760 560 L780 560 L780 640Z" fill="#8fc9d1"/><rect x="760" y="540" width="40" height="22" fill="#f4c47a"/></g>
${[210, 820].map((x) => bench(x).replaceAll('y="650"', 'y="690"').replaceAll('y="626"', 'y="666"').replaceAll('y="664"', 'y="704"')).join("")}
${kid(560)}${kid(700)}
<g>${Array.from({ length: 22 }, (_, i) => `<circle cx="${40 + i * 53}" cy="${730 + (i % 3) * 18}" r="7" fill="${["#f2a7b4", "#f4c47a", "#ffffff"][i % 3]}"/>`).join("")}</g>
</svg>`;

// ── Town-centre street: today (wide grey road, cars) vs idea (trees, wide pavement, benches, lanterns) ──
const shops = (fill1, fill2) => `<rect x="0" y="230" width="300" height="260" fill="${fill1}"/><rect x="300" y="190" width="260" height="300" fill="${fill2}"/>
<rect x="640" y="210" width="280" height="280" fill="${fill1}"/><rect x="920" y="250" width="280" height="240" fill="${fill2}"/>
<g fill="#f6efe0">${[40, 160, 340, 450, 680, 800, 960, 1080].map((x) => `<rect x="${x}" y="300" width="70" height="60"/>`).join("")}</g>`;
const car = (x, c) => `<g><rect x="${x}" y="600" width="170" height="54" rx="16" fill="${c}"/><rect x="${x + 30}" y="572" width="100" height="40" rx="12" fill="${c}"/><circle cx="${x + 40}" cy="660" r="16" fill="#333"/><circle cx="${x + 130}" cy="660" r="16" fill="#333"/></g>`;
const STREET_A = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#e3e6e8"/>
${shops("#cfc8bd", "#b9b2a6")}
<rect y="490" width="${W}" height="40" fill="#c9c6bf"/><rect y="530" width="${W}" height="270" fill="#7d7f80"/>
<g fill="#f4f1e6">${Array.from({ length: 8 }, (_, i) => `<rect x="${40 + i * 150}" y="660" width="80" height="10"/>`).join("")}</g>
${car(120, "#5d7fa3")}${car(560, "#c9c9c9")}${car(900, "#a05252")}
<rect x="600" y="420" width="8" height="110" fill="#666"/><rect x="580" y="410" width="48" height="14" fill="#666"/>
</svg>`;
const STREET_B = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#e7efe9"/>
${shops("#e9c9a5", "#d79b7c")}
<g>${[150, 450, 760, 1050].map((x) => `<path d="M${x - 55} 230 h110 l-15 40 h-80z" fill="#c0566b" opacity=".85"/>`).join("")}</g>
<rect y="490" width="${W}" height="210" fill="#e3d2ad"/>
<g stroke="#d1bd94" stroke-width="3">${Array.from({ length: 24 }, (_, i) => `<line x1="${i * 55}" y1="490" x2="${i * 55}" y2="700"/>`).join("")}</g>
<rect y="700" width="${W}" height="100" fill="#8e9192"/>
${[90, 400, 720, 1040].map((x) => tree(x, 1)).join("").replaceAll("560", "520").replaceAll("525", "485").replaceAll("550", "510").replaceAll("548", "508")}
${[220, 560, 870].map((x) => bench(x).replaceAll('y="650"', 'y="620"').replaceAll('y="626"', 'y="596"').replaceAll('y="664"', 'y="634"')).join("")}
${[300, 640, 980].map((x) => lantern(x).replaceAll('y="470"', 'y="500"').replaceAll('cy="466"', 'cy="496"')).join("")}
<g>${[330, 600, 950].map((x) => `<g><circle cx="${x}" cy="560" r="10" fill="#5a4a3a"/><rect x="${x - 8}" y="570" width="16" height="34" rx="6" fill="${["#214e43", "#e46b4a", "#5d7fa3"][(x / 10) % 3 | 0]}"/></g>`).join("")}</g>
</svg>`;

const images = {
  "naiwan-a.jpg": await photo("naiwan-a.png"),
  "naiwan-b.jpg": await photo("naiwan-b.png"),
  "park-a.jpg": await sharp(Buffer.from(PARK_A)).jpeg({ quality: 88 }).toBuffer(),
  "park-b.jpg": await sharp(Buffer.from(PARK_B)).jpeg({ quality: 88 }).toBuffer(),
  "street-a.jpg": await sharp(Buffer.from(STREET_A)).jpeg({ quality: 88 }).toBuffer(),
  "street-b.jpg": await sharp(Buffer.from(STREET_B)).jpeg({ quality: 88 }).toBuffer(),
};

if (process.env.STORAGE_DRIVER === "netlify-blobs") {
  // Hosted on Netlify: upload into the site's blob store (needs NETLIFY_SITE_ID + NETLIFY_AUTH_TOKEN).
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: "citizen-sentiment", siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_AUTH_TOKEN });
  for (const [name, bytes] of Object.entries(images)) {
    await store.set(`poll-images/seed/${name}`, new Uint8Array(bytes).buffer, { metadata: { contentType: "image/jpeg" } });
  }
  console.log("seed images uploaded to Netlify Blobs");
} else {
  const dir = ".data/storage/poll-images/seed";
  await mkdir(dir, { recursive: true });
  for (const [name, bytes] of Object.entries(images)) await writeFile(`${dir}/${name}`, bytes);
  console.log("seed images written to", dir);
}
