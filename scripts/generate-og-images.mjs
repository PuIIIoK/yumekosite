import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";

const catalog = [
  { id: 1, poster: "https://shikimori.one/system/animes/original/40748.jpg" },
  { id: 2, poster: "https://shikimori.one/system/animes/original/38000.jpg" },
  { id: 3, poster: "https://shikimori.one/system/animes/original/44511.jpg" },
  { id: 4, poster: "https://shikimori.one/system/animes/original/30276.jpg" },
  { id: 5, poster: "https://shikimori.one/system/animes/original/49596.jpg" },
  { id: 6, poster: "https://shikimori.one/system/animes/original/5114.jpg" },
  { id: 7, poster: "https://anilibria.top/storage/releases/posters/10153/h5CIKx4FS1YB1xs2cMOQAIHmDc8JllX4.webp" },
  { id: 8, poster: "https://anilibria.top/storage/releases/posters/10155/jhv90futUWSwvjNJb6V9YGy5v8zC3PsJ.webp" },
];

const dir = "public/og";
if (!existsSync(dir)) await mkdir(dir, { recursive: true });

for (const item of catalog) {
  const outPath = `${dir}/${item.id}.jpg`;
  if (existsSync(outPath)) {
    console.log(`[skip] ${outPath}`);
    continue;
  }
  try {
    const res = await fetch(item.poster, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } });
    if (!res.ok) { console.log(`[fail] id=${item.id}: ${res.status}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf).resize(600, 900, { fit: "cover" }).jpeg({ quality: 85 }).toFile(outPath);
    console.log(`[ok] ${outPath}`);
  } catch (e) {
    console.log(`[err] id=${item.id}: ${e.message}`);
  }
}
console.log("Done!");
