import sharp from "sharp";
import type { EditedImage, ImageEditor } from "../image-editor";

/**
 * Local-mode stand-in when no image-AI key is configured: a colour grade plus a "DEMO" badge,
 * so the whole create → vote flow can be tried without spending money. Never used in production.
 */
export function mockEditor(): ImageEditor {
  let n = 0;
  return {
    name: "mock",
    async edit(image): Promise<EditedImage> {
      const variant = n++ % 3;
      const { width = 1024 } = await sharp(image).metadata();
      const badgeW = Math.round(width * 0.42);
      const badgeH = Math.round(badgeW * 0.22);
      const badge = Buffer.from(
        `<svg width="${badgeW}" height="${badgeH}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" rx="${badgeH / 4}" fill="rgba(0,0,0,0.55)"/>
          <text x="50%" y="62%" text-anchor="middle" font-family="sans-serif" font-weight="700"
            font-size="${Math.round(badgeH * 0.42)}" fill="#fff">AI DEMO · variant ${variant + 1}</text>
        </svg>`,
      );
      const bytes = await sharp(image)
        .modulate({ brightness: 1.06 + variant * 0.03, saturation: 1.3 + variant * 0.15, hue: [0, 12, -12][variant] })
        .composite([{ input: badge, gravity: "southeast" }])
        .jpeg({ quality: 85 })
        .toBuffer();
      return { bytes, mimeType: "image/jpeg" };
    },
  };
}
