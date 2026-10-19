/**
 * 빌드 뒤 out/_headers 를 만든다(Cloudflare Pages 응답 헤더).
 *  - 스테이징(기본): 전 페이지 X-Robots-Tag: noindex, nofollow
 *  - 운영(NEXT_PUBLIC_SITE_ENV=production): 관리자 화면만 noindex
 * 캐시 규칙은 두 환경 같음.
 */
import { writeFileSync, existsSync } from 'node:fs';

const prod = process.env.NEXT_PUBLIC_SITE_ENV === 'production';
if (!existsSync('out')) throw new Error('out/ 이 없습니다. 먼저 next build 를 실행하세요.');

const rules = [
  prod ? ['/admin/*', 'X-Robots-Tag: noindex, nofollow'] : ['/*', 'X-Robots-Tag: noindex, nofollow'],
  ['/img/*', 'Cache-Control: public, max-age=604800'],
  ['/_next/static/*', 'Cache-Control: public, max-age=31536000, immutable'],
];
writeFileSync('out/_headers', rules.map(([path, header]) => `${path}\n  ${header}\n`).join(''));
console.log(`out/_headers 작성 (${prod ? '운영: 색인 허용' : '스테이징: 전체 noindex'})`);
