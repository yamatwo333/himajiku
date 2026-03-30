import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const BRAND_DIR = path.join(PUBLIC_DIR, "brand");

const SOURCE_FILES = [
  {
    name: "Login用ロゴ（透過PNG）.png",
    output: "login-lockup.png",
    width: 780,
    padding: 12,
  },
  {
    name: "OGP用ロゴ（透過PNG）.png",
    output: "ogp-logo.png",
    width: 940,
    padding: 16,
  },
  {
    name: "アイコンだけ（透過PNG）.png",
    output: "header-icon.png",
    width: 190,
    padding: 8,
  },
  {
    name: "カタカナだけ(透過PNG).png",
    output: "header-katakana.png",
    width: 560,
    padding: 8,
  },
  {
    name: "文字ロゴだけ（透過PNG）.png",
    output: "wordmark-full.png",
    width: 620,
    padding: 8,
  },
  {
    name: "横並びロゴ（透過PNG）.png",
    output: "horizontal-lockup.png",
    width: 820,
    padding: 8,
  },
];

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

function coreAlpha(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const value = max / 255;
  const colorful = Math.max(0, Math.min(1, (saturation - 0.08) / 0.18));
  const dark = Math.max(0, Math.min(1, (0.7 - value) / 0.28));

  return Math.round(Math.max(colorful, dark) * 255);
}

function dilate(alpha, width, height, radius) {
  const output = new Uint8ClampedArray(alpha.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let max = 0;

      for (let dy = -radius; dy <= radius; dy += 1) {
        const nextY = y + dy;
        if (nextY < 0 || nextY >= height) continue;

        for (let dx = -radius; dx <= radius; dx += 1) {
          const nextX = x + dx;
          if (nextX < 0 || nextX >= width) continue;

          const value = alpha[nextY * width + nextX];
          if (value > max) max = value;
        }
      }

      output[y * width + x] = max;
    }
  }

  return output;
}

async function extractForeground(sourcePath, padding) {
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = new Uint8ClampedArray(info.width * info.height);

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    alpha[p] = coreAlpha(data[i], data[i + 1], data[i + 2]);
  }

  const grownAlpha = dilate(alpha, info.width, info.height, 2);
  const rgba = Buffer.alloc(data.length);

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    rgba[i] = data[i];
    rgba[i + 1] = data[i + 1];
    rgba[i + 2] = data[i + 2];
    rgba[i + 3] = grownAlpha[p] < 16 ? 0 : grownAlpha[p];
  }

  return sharp(rgba, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .trim()
    .extend({
      top: padding,
      right: padding,
      bottom: padding,
      left: padding,
      background: TRANSPARENT,
    });
}

async function findSourceMap() {
  const entries = await readdir(PUBLIC_DIR);

  return new Map(entries.map((entry) => [entry.normalize("NFC"), path.join(PUBLIC_DIR, entry)]));
}

async function buildAsset(sourceMap, asset) {
  const sourcePath = sourceMap.get(asset.name);

  if (!sourcePath) {
    throw new Error(`Source not found: ${asset.name}`);
  }

  const targetPath = path.join(BRAND_DIR, asset.output);
  const image = await extractForeground(sourcePath, asset.padding);

  await image
    .resize({ width: asset.width })
    .png({
      compressionLevel: 9,
      effort: 10,
      adaptiveFiltering: true,
    })
    .toFile(targetPath);
}

async function buildOgpLogo(sourceMap) {
  const sourcePath = sourceMap.get("OGP用ロゴ（透過PNG）.png");

  if (!sourcePath) {
    throw new Error("Source not found: OGP用ロゴ（透過PNG）.png");
  }

  const logoBuffer = await (await extractForeground(sourcePath, 16))
    .resize({ width: 780 })
    .png({
      compressionLevel: 9,
      effort: 10,
      adaptiveFiltering: true,
    })
    .toBuffer();

  const backgroundSvg = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F9FDFF"/>
          <stop offset="100%" stop-color="#E7F5FF"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" rx="36" fill="url(#bg)"/>
      <circle cx="1040" cy="40" r="120" fill="rgba(255,255,255,0.72)"/>
      <circle cx="1120" cy="84" r="104" fill="rgba(255,255,255,0.56)"/>
      <circle cx="60" cy="586" r="112" fill="rgba(255,255,255,0.44)"/>
      <circle cx="150" cy="642" r="108" fill="rgba(255,255,255,0.36)"/>
      <circle cx="270" cy="670" r="94" fill="rgba(255,255,255,0.28)"/>
      <circle cx="1090" cy="590" r="18" fill="rgba(255,255,255,0.78)"/>
      <circle cx="1090" cy="590" r="7" fill="rgba(255,255,255,0.96)"/>
      <circle cx="500" cy="170" r="180" fill="rgba(14,165,233,0.06)"/>
      <circle cx="730" cy="292" r="220" fill="rgba(14,165,233,0.08)"/>
    </svg>
  `);

  await sharp(backgroundSvg)
    .composite([
      {
        input: logoBuffer,
        gravity: "center",
      },
    ])
    .png({
      compressionLevel: 9,
      effort: 10,
      adaptiveFiltering: true,
    })
    .toFile(path.join(PUBLIC_DIR, "og.png"));
}

async function main() {
  await mkdir(BRAND_DIR, { recursive: true });
  const sourceMap = await findSourceMap();

  for (const asset of SOURCE_FILES) {
    await buildAsset(sourceMap, asset);
  }

  await buildOgpLogo(sourceMap);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
