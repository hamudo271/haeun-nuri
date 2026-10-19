import type { MetadataRoute } from 'next';
import { NAV } from '@/lib/site';

/** /sitemap.xml — 정적 내보내기라 빌드 때 한 번 만든다. 주소는 항상 운영 도메인 기준 */
export const dynamic = 'force-static';

const BASE = 'https://www.haeun-nuri.com';

// 유튜브·전문칼럼(media)은 글이 D1 에 있어 빌드 때 알 수 없다 → 콘텐츠가 쌓이면 따로 추가
const SKIP_GROUPS = ['media'];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const subs = NAV.filter((g) => !SKIP_GROUPS.includes(g.key)).flatMap((g) => g.items.map((i) => i.href));
  return [
    { url: `${BASE}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    ...subs.map((p) => ({ url: BASE + p, lastModified, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...['/service_rull/', '/personal/'].map((p) => ({ url: BASE + p, lastModified, changeFrequency: 'yearly' as const, priority: 0.3 })),
  ];
}
