import type { MetadataRoute } from 'next';
import { NAV } from '@/lib/site';

/** /sitemap.xml — 정적 내보내기라 빌드 때 한 번 만든다. 주소는 항상 운영 도메인 기준 */
export const dynamic = 'force-static';

const BASE = 'https://www.haeun-nuri.com';

// 게시판 글 주소(+사진)와 게시판 목록의 최근 수정일은 서버(server/feeds.js)가 /sitemap.xml 을 내보낼 때 덧붙인다
const SKIP_GROUPS: string[] = [];

// 고정 페이지에는 lastmod 를 넣지 않는다: 빌드할 때마다 전 페이지 날짜가 바뀌면 검색엔진이 lastmod 를 믿지 않게 되고,
// 그러면 칼럼처럼 실제로 바뀐 글의 날짜까지 무시한다
export default function sitemap(): MetadataRoute.Sitemap {
  const subs = NAV.filter((g) => !SKIP_GROUPS.includes(g.key)).flatMap((g) => g.items.map((i) => i.href));
  return [
    { url: `${BASE}/`, changeFrequency: 'weekly', priority: 1 },
    ...subs.map((p) => ({ url: BASE + p, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...['/nonpay/', '/service_rull/', '/personal/'].map((p) => ({ url: BASE + p, changeFrequency: 'yearly' as const, priority: 0.3 })),
  ];
}
