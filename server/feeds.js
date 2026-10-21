// /sitemap.xml and /rss.xml, built from the posts the server reads. Pure functions (no database) so they can be
// checked on their own: server.js does the queries and hands the rows over.
import * as R from "./render.js";

const NAME = "해운누리한의원";
const iso = (d) => new Date(d).toISOString();
const cdata = (s) => `<![CDATA[${String(s).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
// the body's pictures are "/media/12"; a feed reader or a crawler needs the whole address
const absolute = (site, html) => html.replace(/(<img src=")\//g, `$1${site}/`);

/**
 * The sitemap Next.js built (pages only, no dates) plus every published post.
 * - a board's list page gets the date of its newest change, so a crawler sees the list moved when a post is added
 * - each post carries its pictures (image sitemap: 네이버·구글 이미지 검색)
 * - 유튜브 posts have no page of their own (they open on YouTube), so only their list page is listed
 */
export function sitemapXml(site, built, posts, pics) {
  const latest = {};
  for (const p of posts) {
    const t = new Date(p.updated_at).getTime();
    if (!latest[p.cat] || t > latest[p.cat]) latest[p.cat] = t;
  }
  let xml = built.includes('xmlns:image=')
    ? built
    : built.replace('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">');
  for (const [cat, base] of Object.entries(R.BASE)) {
    if (!latest[cat]) continue;
    const loc = `<loc>${site}${base}</loc>`;
    xml = xml.replace(loc, `${loc}\n<lastmod>${iso(latest[cat])}</lastmod>`);
  }
  const urls = posts.filter((p) => p.cat !== "video").map((p) => {
    const imgs = (pics.get(p.id) || []).slice(0, 10)
      .map((m) => `<image:image><image:loc>${site}/media/${m.id}</image:loc></image:image>`).join("");
    return `<url><loc>${site}${R.postUrl(p)}</loc><lastmod>${iso(p.updated_at)}</lastmod>${imgs}</url>\n`;
  });
  return xml.replace("</urlset>", `${urls.join("")}</urlset>`);
}

/**
 * RSS 2.0 for 네이버 서치어드바이저 · 구글: 해운누리 소식 and 전문칼럼, newest first.
 * Every link is a page on this site (유튜브 posts point to youtube.com, which a site's feed should not carry).
 * The whole article goes in content:encoded so a reader or a crawler gets more than the first lines.
 */
export function rssXml(site, posts, pics) {
  const own = posts.filter((p) => p.cat !== "video");
  const built = own.length ? Math.max(...own.map((p) => new Date(p.updated_at).getTime())) : Date.now();
  const items = own.map((p) => {
    const link = `${site}${R.postUrl(p)}`;
    const list = pics.get(p.id) || [];
    const body = absolute(site, R.bodyHtml(p.body, list, new Set(), p.title));
    const cover = list[0] ? `<p><img src="${site}/media/${list[0].id}" alt="${R.esc(p.title)}"></p>` : "";
    const html = /\[사진\s*1\]/.test(p.body || "") ? body : cover + body;
    return [
      "    <item>",
      `      <title>${R.esc(p.title)}</title>`,
      `      <link>${R.esc(link)}</link>`,
      `      <guid isPermaLink="true">${R.esc(link)}</guid>`,
      `      <description>${R.esc(R.excerpt(p.body, 300) || `${NAME} ${R.CATS[p.cat]}`)}</description>`,
      `      <content:encoded>${cdata(html)}</content:encoded>`,
      `      <category>${R.esc(R.CATS[p.cat] || "")}</category>`,
      `      <dc:creator>${NAME}</dc:creator>`,
      `      <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>`,
      "    </item>",
    ].join("\n");
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${NAME}</title>
    <link>${site}/</link>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>부산 해운대 장산역 ${NAME}의 소식과 원장 전문칼럼</description>
    <language>ko</language>
    <lastBuildDate>${new Date(built).toUTCString()}</lastBuildDate>
    <image>
      <url>${site}/img/brand/logo-brown.png</url>
      <title>${NAME}</title>
      <link>${site}/</link>
    </image>
${items.join("\n")}
  </channel>
</rss>
`;
}
