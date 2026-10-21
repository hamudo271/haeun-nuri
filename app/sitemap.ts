import type { MetadataRoute } from 'next';
import { NAV, ORIGIN } from '@/lib/site';
import { SEO } from '@/lib/seo';
import LASTMOD from '@/lib/lastmod.json';

/**
 * /sitemap.xml — 정적 내보내기라 빌드 때 한 번 만든다. 주소는 항상 대표 주소(ORIGIN) 기준.
 * - lastmod: 페이지 내용 파일의 마지막 git 커밋 시각(lib/lastmod.json, scripts/lastmod.mjs). 빌드 날짜를 넣지 않는다 —
 *   전 페이지 날짜가 한꺼번에 바뀌면 검색엔진이 lastmod 를 믿지 않고, 그러면 실제로 바뀐 글의 날짜까지 무시한다.
 * - images: 페이지의 실제 사진(lib/seo.ts images) → 이미지 사이트맵(네이버·구글 이미지 검색).
 * - priority: 진료·치료·입원 0.9 > 병원 소개 0.7 > 미디어 0.6 > 공지 0.5 > 비급여 0.4 > 약관 0.2.
 * 게시판 글 주소(+사진)와 게시판 목록의 최근 수정일은 서버(server/feeds.js)가 내보낼 때 덧붙인다.
 */
export const dynamic = 'force-static';

const TIER: Record<string, { priority: number; changeFrequency: 'weekly' | 'monthly' | 'yearly' }> = {
  clinic: { priority: 0.9, changeFrequency: 'monthly' },
  treatment: { priority: 0.9, changeFrequency: 'monthly' },
  hospital: { priority: 0.9, changeFrequency: 'monthly' },
  about: { priority: 0.7, changeFrequency: 'monthly' },
  media: { priority: 0.6, changeFrequency: 'weekly' },
  board: { priority: 0.5, changeFrequency: 'weekly' },
};
const LEGAL: [string, number][] = [
  ['/nonpay/', 0.4],
  ['/service_rull/', 0.2],
  ['/personal/', 0.2],
];

const entry = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' | 'yearly'): MetadataRoute.Sitemap[number] => {
  const mod = (LASTMOD as Record<string, string>)[path];
  const images = SEO[path]?.images?.map((i) => ORIGIN + i);
  return {
    url: ORIGIN + path,
    ...(mod ? { lastModified: mod } : {}),
    changeFrequency,
    priority,
    ...(images?.length ? { images } : {}),
  };
};

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    entry('/', 1, 'weekly'),
    ...NAV.flatMap((g) => g.items.map((i) => entry(i.href, TIER[g.key].priority, TIER[g.key].changeFrequency))),
    ...LEGAL.map(([p, pr]) => entry(p, pr, 'yearly')),
  ];
}
