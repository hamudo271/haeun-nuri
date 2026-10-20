import type { MetadataRoute } from 'next';
import { NAV } from '@/lib/site';

/** /sitemap.xml — 정적 내보내기라 빌드 때 한 번 만든다. 주소는 항상 운영 도메인 기준 */
export const dynamic = 'force-static';

const BASE = 'https://www.haeun-nuri.com';

// 게시판 글 주소는 서버(server/server.js)가 /sitemap.xml 을 내보낼 때 데이터베이스에서 덧붙인다
const SKIP_GROUPS: string[] = [];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const subs = NAV.filter((g) => !SKIP_GROUPS.includes(g.key)).flatMap((g) => g.items.map((i) => i.href));
  return [
    { url: `${BASE}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    ...subs.map((p) => ({ url: BASE + p, lastModified, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...['/service_rull/', '/personal/', '/nonpay/'].map((p) => ({ url: BASE + p, lastModified, changeFrequency: 'yearly' as const, priority: 0.3 })),
  ];
}
