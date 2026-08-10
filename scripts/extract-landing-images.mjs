// One-off script: extract base64 images from the marketing HTML into public/assets/landing/
// Usage: node scripts/extract-landing-images.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const HTML = path.resolve("reina/LANDING PAGE/fit-infinity-website.html");
const OUT = path.resolve("public/assets/landing");

fs.mkdirSync(OUT, { recursive: true });
const html = fs.readFileSync(HTML, "utf8");

const extMap = { jpeg: "jpg", "svg+xml": "svg" };
const slug = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);

// Match <img ...> and <a ...> tags that contain a data URI so we can grab nearby alt/context.
const imgTagRe = /<(img|a)\b[^>]*?data:image\/([a-z0-9+.-]+);base64,([A-Za-z0-9+/=]+)[^>]*>/gi;

const seen = new Map(); // hash -> filename
const manifest = [];
let idx = 0;
let m;
while ((m = imgTagRe.exec(html)) !== null) {
  const tag = m[0];
  let ext = m[2].toLowerCase();
  ext = extMap[ext] ?? ext;
  const data = m[3];
  const altMatch = tag.match(/alt="([^"]*)"/i);
  const alt = altMatch ? altMatch[1] : "";
  const buf = Buffer.from(data, "base64");
  const hash = crypto.createHash("md5").update(buf).digest("hex").slice(0, 8);

  if (seen.has(hash)) {
    manifest.push({ idx, alt, file: seen.get(hash), dup: true });
    idx++;
    continue;
  }
  const base = slug(alt) || `img-${hash}`;
  const file = `${String(idx).padStart(2, "0")}-${base}.${ext}`;
  fs.writeFileSync(path.join(OUT, file), buf);
  seen.set(hash, file);
  manifest.push({ idx, alt, file, bytes: buf.length });
  idx++;
}

fs.writeFileSync(path.join(OUT, "_manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Extracted ${seen.size} unique images (${idx} total refs) -> ${OUT}`);
for (const item of manifest) {
  console.log(
    `${String(item.idx).padStart(2, "0")}  ${item.dup ? "(dup) " : ""}alt="${item.alt}"  ->  ${item.file}` +
      (item.bytes ? `  [${(item.bytes / 1024).toFixed(0)} KB]` : ""),
  );
}
