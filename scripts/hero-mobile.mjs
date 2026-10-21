// 서브 상단 사진의 모바일용 파일: 세로 화면에서는 사진 가운데만 보이므로 가운데 1200px 만 잘라 webp 로(약 절반 크기).
// 실행: node scripts/hero-mobile.mjs   (public/img/hero/subtitle-N.jpg → subtitle-N-m.webp)
import sharp from 'sharp';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const DIR = fileURLToPath(new URL('../public/img/hero/', import.meta.url));
for (const f of fs.readdirSync(DIR).filter((n) => /^subtitle-\d\.jpg$/.test(n))) {
  const src = DIR + f;
  const { width, height } = await sharp(src).metadata();
  const w = Math.min(1200, width);
  const out = src.replace(/\.jpg$/, '-m.webp');
  await sharp(src).extract({ left: Math.round((width - w) / 2), top: 0, width: w, height }).webp({ quality: 82 }).toFile(out);
  console.log(f, `${width}x${height} → ${w}x${height}`, Math.round(fs.statSync(out).size / 1024) + 'KB', '(pc webp', Math.round(fs.statSync(src.replace(/\.jpg$/, '.webp')).size / 1024) + 'KB)');
}
