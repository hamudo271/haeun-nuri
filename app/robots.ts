import type { MetadataRoute } from 'next';

/**
 * /robots.txt — 스테이징·운영 같은 규칙.
 * 스테이징 차단은 robots.txt 가 아니라 noindex(메타 + X-Robots-Tag 헤더)로 한다.
 * robots.txt 로 막으면 검색엔진이 noindex 를 읽지 못하고, 점검 도구도 사이트를 못 훑는다.
 */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/'] },
    sitemap: 'https://www.haeun-nuri.com/sitemap.xml',
  };
}
