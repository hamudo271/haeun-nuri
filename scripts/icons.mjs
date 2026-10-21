// 파비콘·홈 화면 아이콘: public/icons/mark.svg(로고 무늬, 추나 페이지 마스크 SVG 와 같은 원본) → PNG
// 실행: node scripts/icons.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const DIR = fileURLToPath(new URL('../public/icons/', import.meta.url));
const svg = fs.readFileSync(DIR + 'mark.svg');
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const ivory = { r: 247, g: 244, b: 239, alpha: 1 };
// 투명 배경(브라우저 탭·검색 결과): 무늬가 꽉 차게. 홈 화면(apple-touch-icon)은 iOS 가 모서리를 깎으므로 아이보리 배경 + 여백
const jobs = [
  ['favicon-32.png', 32, clear, 0.04],
  ['icon-192.png', 192, clear, 0.04],
  ['icon-512.png', 512, clear, 0.04],
  ['apple-touch-icon.png', 180, ivory, 0.16],
];
for (const [name, size, bg, pad] of jobs) {
  const inner = Math.round(size * (1 - pad * 2));
  const mark = await sharp(svg, { density: 1200 }).resize(inner, inner, { fit: 'contain', background: clear }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } }).composite([{ input: mark, gravity: 'centre' }]).png({ compressionLevel: 9 }).toFile(DIR + name);
  console.log(name, size, Math.round(fs.statSync(DIR + name).size / 1024) + 'KB');
}
