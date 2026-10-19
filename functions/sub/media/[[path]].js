/**
 * 해운누리 미디어 공개 화면
 *  /sub/media/page01/          유튜브 목록(?cat=&page=)
 *  /sub/media/page02/          전문칼럼 목록
 *  /sub/media/page02/:id/      전문칼럼 본문(?preview=1 은 관리자만 임시저장 글도 보임)
 * 정적으로 만든 화면 틀(Next.js)에 #cms-root 내용을 끼워 넣어 돌려준다 → 검색엔진이 글을 읽을 수 있다.
 */
import { listPublic, getPublic, isAdmin, bumpViews, plain, esc } from '../../../cms/core.js';
import { ytList, colList, colView, SITE } from '../../../cms/site.js';

const shell = (env, url, p) => env.ASSETS.fetch(new Request(new URL(p, url.origin)));

async function notFound(env, url) {
  const r = await shell(env, url, '/404.html');
  return new Response(r.body, { status: 404, headers: r.headers });
}

export async function onRequestGet(ctx) {
  const { request, env, params } = ctx;
  const url = new URL(request.url);
  const seg = [].concat(params.path || []).filter(Boolean);
  if (seg.length === 0) return Response.redirect(new URL('/sub/media/page01/', url.origin).toString(), 302);
  const last = seg[seg.length - 1];
  if (last.includes('.')) return ctx.next(); // Next.js 가 만든 .txt 등 정적 파일
  if (!url.pathname.endsWith('/')) return Response.redirect(new URL(url.pathname + '/' + url.search, url.origin).toString(), 301);

  const db = env.DB;
  const page = Math.max(1, parseInt(url.searchParams.get('page'), 10) || 1);
  const cat = (url.searchParams.get('cat') || '').slice(0, 40);
  let html;
  let shellPath;
  let meta = null;

  if (seg.length === 1 && seg[0] === 'page01') {
    html = ytList(await listPublic(db, 'youtube', { page, cat, per: 13 }), cat);
    shellPath = '/sub/media/page01/';
  } else if (seg.length === 1 && seg[0] === 'page02') {
    html = colList(await listPublic(db, 'column', { page, cat, per: 12 }), cat);
    shellPath = '/sub/media/page02/';
  } else if (seg.length === 2 && seg[0] === 'page02' && /^\d+$/.test(seg[1])) {
    const preview = url.searchParams.has('preview') && (await isAdmin(request, db));
    const r = await getPublic(db, +seg[1], { preview });
    if (!r) return notFound(env, url);
    if (r.post.status === 'published' && !preview) ctx.waitUntil(bumpViews(db, r.post.id));
    html = colView(r, preview);
    shellPath = '/sub/media/page02/view/';
    const p = r.post;
    meta = {
      title: `${p.title} | 전문칼럼 | ${SITE.name}`,
      desc: (p.summary || plain(p.body)).slice(0, 150),
      image: p.cover_id ? `${url.origin}/media/${p.cover_id}` : null,
      ld: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: p.title,
        datePublished: p.published_at,
        dateModified: (p.updated_at || '').slice(0, 10),
        author: p.author ? { '@type': 'Person', name: p.author } : undefined,
        publisher: { '@type': 'MedicalClinic', name: SITE.name },
        image: p.cover_id ? [`${url.origin}/media/${p.cover_id}`] : undefined,
        mainEntityOfPage: url.origin + url.pathname,
      },
    };
  } else if (seg.length === 2 && seg[0] === 'page02' && seg[1] === 'view') {
    return Response.redirect(new URL('/sub/media/page02/', url.origin).toString(), 302);
  } else {
    return ctx.next();
  }

  const base = await shell(env, url, shellPath);
  let rw = new HTMLRewriter().on('#cms-root', {
    element(el) {
      el.setInnerContent(html, { html: true });
    },
  });
  if (meta) {
    rw = rw
      .on('title', { element: (el) => el.setInnerContent(meta.title) })
      .on('meta[name="description"]', { element: (el) => el.setAttribute('content', meta.desc) })
      .on('meta[property="og:title"]', { element: (el) => el.setAttribute('content', meta.title) })
      .on('meta[property="og:description"]', { element: (el) => el.setAttribute('content', meta.desc) })
      .on('head', {
        element(el) {
          if (meta.image) el.append(`<meta property="og:image" content="${esc(meta.image)}">`, { html: true });
          el.append(`<link rel="canonical" href="${esc(url.origin + url.pathname)}">`, { html: true });
          el.append(`<script type="application/ld+json">${JSON.stringify(meta.ld).replace(/</g, '\\u003c')}</script>`, { html: true });
        },
      });
  }
  const out = rw.transform(base);
  const h = new Headers(out.headers);
  h.set('cache-control', 'no-store');
  h.delete('etag');
  return new Response(out.body, { status: 200, headers: h });
}
