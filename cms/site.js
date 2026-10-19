/**
 * 해운누리한의원 — 미디어(유튜브·전문칼럼) 공개 화면 HTML 조각.
 * 리뉴얼 디자인 문법: ( 세리프 라벨 ) + .h2 제목, 금색 강조, 둥근 카드, data-rv 등장 연출(Motion.tsx 가 처리)
 */
import { esc } from './core.js';

export const SITE = {
  name: '해운누리한의원',
  color: { main: '#9a7748', dark: '#2b2019' },
  home: '/',
  urls: { youtube: '/sub/media/page01/', column: '/sub/media/page02/', columnView: '/sub/media/page02/{id}/' },
  authors: ['구가현 대표원장', '윤다은 진료원장', '이근서 진료원장'],
};
const DOCS = {
  구가현: { role: '대표원장', img: '/img/doctors/img-13.jpg' },
  윤다은: { role: '진료원장', img: '/img/doctors/img-14.jpg' },
  이근서: { role: '진료원장', img: '/img/doctors/img-15.png' },
};

const dot = (d) => (d || '').replace(/-/g, '.');
const ytThumb = (id, size = 'hqdefault') => `https://i.ytimg.com/vi/${esc(id)}/${size}.jpg`;

function chips(base, cats, cur, total) {
  if (!cats.length) return '';
  const a = (href, label, on) => `<li><a href="${href}" class="${on ? 'is-on' : ''}">${label}</a></li>`;
  return `<nav class="md-chips" aria-label="카테고리"><ul>${a(base, `전체 <i>${total}</i>`, !cur)}${cats
    .map((c) => a(`${base}?cat=${encodeURIComponent(c.c)}`, `${esc(c.c)} <i>${c.n}</i>`, cur === c.c))
    .join('')}</ul></nav>`;
}
function pager(base, cat, page, pages) {
  if (pages <= 1) return '';
  const q = (p) => `${base}?${cat ? `cat=${encodeURIComponent(cat)}&` : ''}page=${p}`;
  let s = '';
  for (let p = 1; p <= pages; p++) s += `<a href="${q(p)}" class="${p === page ? 'is-on' : ''}"${p === page ? ' aria-current="page"' : ''}>${p}</a>`;
  return `<nav class="md-pager" aria-label="쪽 이동">${page > 1 ? `<a class="pv" href="${q(page - 1)}" aria-label="이전 쪽"></a>` : ''}${s}${page < pages ? `<a class="nx" href="${q(page + 1)}" aria-label="다음 쪽"></a>` : ''}</nav>`;
}
const empty = (t, d) => `<div class="md-empty" data-rv="up"><span class="md-empty-ico" aria-hidden="true"></span><strong>${t}</strong><p>${d}</p></div>`;

/* 유튜브 목록 */
export function ytList(d, cat) {
  const base = SITE.urls.youtube;
  const head = `<div class="md-head" data-rv="up"><p class="label">( Haeun-Nuri TV )</p>
    <h2 class="h2">영상으로 만나는 <em>해운누리 건강 이야기</em></h2>
    <p class="md-lead">원장님이 직접 설명하는 질환과 치료 이야기를 영상으로 편하게 확인하세요.</p></div>`;
  if (!d.total) return `<section class="md">${head}${empty('아직 등록된 영상이 없습니다.', '곧 해운누리한의원의 건강 영상을 소개해 드리겠습니다.')}</section>`;
  let items = d.items;
  let feat = '';
  if (d.page === 1 && !cat && items.length) {
    const f = items[0];
    items = items.slice(1);
    feat = `<article class="md-feat" data-rv="up">
      <button type="button" class="md-feat-media" data-yt="${esc(f.video_id)}" data-title="${esc(f.title)}" aria-label="${esc(f.title)} 영상 재생">
        <img src="${ytThumb(f.video_id, 'maxresdefault')}" onerror="this.onerror=null;this.src='${ytThumb(f.video_id)}'" alt="" loading="eager">
        <span class="md-play" aria-hidden="true"></span></button>
      <div class="md-feat-txt"><p class="md-tag">${f.pinned ? 'Pick' : 'New'}</p>${f.category ? `<span class="md-cat">${esc(f.category)}</span>` : ''}
        <h3>${esc(f.title)}</h3>${f.summary ? `<p class="md-sum">${esc(f.summary)}</p>` : ''}<span class="md-date">${dot(f.published_at)}</span>
        <button type="button" class="md-watch" data-yt="${esc(f.video_id)}" data-title="${esc(f.title)}" data-magnet><i aria-hidden="true"></i><span>영상 보기</span></button></div>
    </article>`;
  }
  const grid = items
    .map(
      (p, k) => `<li data-rv="up" style="--d:${(k % 3) * 90}ms"><button type="button" class="md-card" data-yt="${esc(p.video_id)}" data-title="${esc(p.title)}">
        <span class="md-thumb"><img src="${ytThumb(p.video_id)}" alt="" loading="lazy"><span class="md-play" aria-hidden="true"></span></span>
        ${p.category ? `<span class="md-cat">${esc(p.category)}</span>` : ''}<strong>${esc(p.title)}</strong><span class="md-date">${dot(p.published_at)}</span></button></li>`,
    )
    .join('');
  return `<section class="md">${head}${feat}${chips(base, d.cats, cat, d.total)}${grid ? `<ul class="md-grid md-grid--yt">${grid}</ul>` : ''}${
    !d.items.length ? empty('이 카테고리에는 아직 영상이 없습니다.', '다른 카테고리를 선택해 보세요.') : ''
  }${pager(base, cat, d.page, d.pages)}</section>`;
}

/* 전문칼럼 목록 */
export function colList(d, cat) {
  const base = SITE.urls.column;
  const head = `<div class="md-head" data-rv="up"><p class="label">( Column )</p>
    <h2 class="h2">원장님이 직접 쓰는 <em>전문칼럼</em></h2>
    <p class="md-lead">진료실에서 자주 듣는 질문과 꼭 알아야 할 건강 정보를 해운누리 원장님이 정리했습니다.</p></div>`;
  if (!d.total) return `<section class="md">${head}${empty('아직 등록된 칼럼이 없습니다.', '곧 해운누리 원장님의 전문칼럼을 소개해 드리겠습니다.')}</section>`;
  const grid = d.items
    .map(
      (p, k) => `<li data-rv="up" style="--d:${(k % 3) * 90}ms"><a class="md-ccard" href="${base}${p.id}/">
        <span class="md-cover${p.cover_id ? '' : ' is-empty'}">${p.cover_id ? `<img src="/media/${p.cover_id}" alt="" loading="lazy">` : '<em>Haeun-Nuri<br>Column</em>'}</span>
        <span class="md-ctxt">${p.category ? `<span class="md-cat">${esc(p.category)}</span>` : ''}<strong>${esc(p.title)}</strong>${p.summary ? `<p>${esc(p.summary)}</p>` : ''}
        <span class="md-meta">${p.author ? `${esc(p.author)} · ` : ''}${dot(p.published_at)}</span></span></a></li>`,
    )
    .join('');
  return `<section class="md">${head}${chips(base, d.cats, cat, d.total)}${grid ? `<ul class="md-grid md-grid--col">${grid}</ul>` : empty('이 카테고리에는 아직 칼럼이 없습니다.', '다른 카테고리를 선택해 보세요.')}${pager(base, cat, d.page, d.pages)}</section>`;
}

/* 전문칼럼 본문 */
export function colView({ post: p, newer, older }, preview) {
  const base = SITE.urls.column;
  const name = (p.author || '').split(' ')[0];
  const doc = DOCS[name];
  return `<article class="md-art">
    ${preview && p.status !== 'published' ? '<p class="md-preview">임시저장 글 미리보기 — 관리자에게만 보입니다.</p>' : ''}
    <header class="md-art-head" data-rv="up">
      <a class="md-back" href="${base}">전문칼럼 목록</a>
      ${p.category ? `<span class="md-cat">${esc(p.category)}</span>` : ''}
      <h2>${esc(p.title)}</h2>
      <p class="md-meta">${p.author ? `<b>${esc(p.author)}</b>` : ''}<span>${dot(p.published_at)}</span><span>조회 ${p.views + (preview ? 0 : 1)}</span></p>
    </header>
    ${p.cover_id ? `<figure class="md-art-cover" data-rv="up"><img src="/media/${p.cover_id}" alt=""></figure>` : ''}
    <div class="md-prose">${p.body}</div>
    <footer class="md-art-foot">
      ${
        doc
          ? `<div class="md-author" data-rv="up"><img src="${doc.img}" alt="${esc(name)} ${doc.role}"><div><span class="label">( Written by )</span><strong>${esc(name)} <small>${doc.role}</small></strong><p>해운누리한의원 ${doc.role}이 직접 쓴 글입니다. 궁금한 점은 진료실에서 편하게 물어보세요.</p></div></div>`
          : ''
      }
      <div class="md-share"><button type="button" class="md-copy" data-copy>링크 복사</button><a class="md-list" href="${base}">목록으로</a></div>
      <nav class="md-adj" aria-label="다른 칼럼">
        ${newer ? `<a class="pv" href="${base}${newer.id}/"><small>이전 글</small><span>${esc(newer.title)}</span></a>` : '<span></span>'}
        ${older ? `<a class="nx" href="${base}${older.id}/"><small>다음 글</small><span>${esc(older.title)}</span></a>` : '<span></span>'}
      </nav>
    </footer>
  </article>`;
}
