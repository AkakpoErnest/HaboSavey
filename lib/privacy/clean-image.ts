import sharp from "sharp";

const MAX_SIDE = 2048;

/**
 * Re-encodes an uploaded photo: applies EXIF orientation, then drops ALL metadata
 * (GPS, camera serials, timestamps) and caps the size. sharp strips metadata by default.
 *
 * TODO(phase 2): automatic face / licence-plate blurring before publication. For now the human
 * moderation queue is the safeguard, and moderators should reject photos showing identifiable people.
 */
export async function cleanImage(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}
