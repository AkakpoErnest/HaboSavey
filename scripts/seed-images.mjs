// Draws the two demo poll images (A: today's seawall, B: green waterfront) into local storage.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

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

const dir = ".data/storage/poll-images/seed";
await mkdir(dir, { recursive: true });
await sharp(Buffer.from(A)).jpeg({ quality: 88 }).toFile(`${dir}/naiwan-a.jpg`);
await sharp(Buffer.from(B)).jpeg({ quality: 88 }).toFile(`${dir}/naiwan-b.jpg`);
console.log("seed images written to", dir);
