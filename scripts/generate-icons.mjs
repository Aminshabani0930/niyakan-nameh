import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const brandDir = path.join(root, "public", "brand");
const iconsDir = path.join(root, "public", "icons");
const logoPath = path.join(brandDir, "logo-source.png");
const reliefPath = path.join(brandDir, "relief-hero.jpg");
const maskableBackground = "#14100c";
const maxImageBytes = 200 * 1024;

await mkdir(iconsDir, { recursive: true });

const trimmedLogo = await sharp(logoPath)
  .trim({ background: { r: 255, g: 255, b: 255 }, threshold: 8 })
  .png()
  .toBuffer();

function circularMask(size, radius) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="white"/></svg>`,
  );
}

async function circularLogo(size, inset) {
  const diameter = Math.round(size * (1 - inset * 2));
  const mask = circularMask(size, diameter / 2);
  const logo = await sharp(trimmedLogo)
    .resize(diameter, diameter, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: logo,
        left: Math.floor((size - diameter) / 2),
        top: Math.floor((size - diameter) / 2),
      },
      { input: mask, blend: "dest-in" },
    ])
    .png()
    .toBuffer();
}

for (const size of [192, 512]) {
  await writeFile(path.join(iconsDir, `pwa-${size}.png`), await circularLogo(size, 0.04));
}

const maskableSize = 512;
const maskableLogo = await circularLogo(maskableSize, 0.11);
await sharp({
  create: {
    width: maskableSize,
    height: maskableSize,
    channels: 4,
    background: maskableBackground,
  },
})
  .composite([{ input: maskableLogo }])
  .png()
  .toFile(path.join(iconsDir, "pwa-maskable-512.png"));

const appleSize = 180;
const appleLogo = await circularLogo(appleSize, 0.06);
await sharp({
  create: {
    width: appleSize,
    height: appleSize,
    channels: 4,
    background: maskableBackground,
  },
})
  .composite([{ input: appleLogo }])
  .png()
  .toFile(path.join(iconsDir, "apple-touch-icon.png"));

for (const size of [16, 32]) {
  await writeFile(path.join(root, "public", `favicon-${size}.png`), await circularLogo(size, 0.06));
}

for (const width of [900, 1800]) {
  let output;
  for (const quality of [82, 76, 70, 64, 58, 52, 46, 42, 38, 34, 30]) {
    output = await sharp(reliefPath)
      .resize({ width })
      .webp({ quality, effort: 6 })
      .toBuffer();
    if (output.byteLength <= maxImageBytes) break;
  }
  if (output.byteLength > maxImageBytes) {
    throw new Error(`Could not compress relief image to 200 KB at ${width}px wide`);
  }
  await writeFile(path.join(brandDir, `relief-hero-${width}.webp`), output);
  console.log(`relief-hero-${width}.webp: ${Math.ceil(output.byteLength / 1024)} KB`);
}

console.log("Generated PWA icons and optimized relief images.");