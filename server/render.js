// HTML for the board the clinic writes to (해운누리 소식 · 전문칼럼 · 유튜브). The pages around it are the ones Next.js
// built (out/); the server puts these pieces into their #cms-root. Everything a writer types is escaped; only the few
// marks the admin toolbar inserts become tags. The classes are the site's own (app/globals.css: .board, .md-*).

export const CATS = { news: "해운누리 소식", column: "전문칼럼", video: "유튜브" };
export const PARTS = {}; // 얼굴본의 전후사진 부위: 해운누리에는 없음
// where each board lives on the site
export const BASE = { news: "/sub/board/page01/", column: "/sub/media/page02/", video: "/sub/media/page01/" };
export const postUrl = (p) => (p.cat === "video" ? BASE.video : `${BASE[p.cat] || BASE.news}${p.id}/`);

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const ymd = (d) => new Date(new Date(d).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10); // Korean day
const dot = (d) => ymd(d).replace(/-/g, ".");

export function youtubeId(url) {
  const s = String(url || "").trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}
const ytThumb = (id, size = "hqdefault") => `https://i.ytimg.com/vi/${esc(id)}/${size}.jpg`;

// **굵게**, [글자](주소) inside a line
function inline(text) {
  let t = esc(text);
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|tel:|mailto:)[^\s)]+)\)/g, (m, label, href) =>
    `<a href="${href}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ""}${/^\/files\//.test(href) ? " download" : ""}>${label}</a>`);
  return t;
}

export function figure(m, alt) {
  return `<figure><img src="/media/${m.id}" alt="${esc(alt)}" width="${m.width}" height="${m.height}" loading="lazy" decoding="async"></figure>`;
}

// The body: blank lines part paragraphs, "## " a subhead, "- " a list, "[사진 2]" on its own line the second picture
export function bodyHtml(body, pics, used, title) {
  const out = [];
  let para = [];
  let list = [];
  const flushP = () => { if (para.length) { out.push(`<p>${para.map(inline).join("<br>")}</p>`); para = []; } };
  const flushL = () => { if (list.length) { out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`); list = []; } };
  for (const raw of String(body || "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    const pic = line.match(/^\[사진\s*(\d+)\]$/);
    if (!line) { flushP(); flushL(); continue; }
    if (pic) {
      flushP(); flushL();
      const m = pics[Number(pic[1]) - 1];
      if (m) { used.add(m.id); out.push(figure(m, `${title} 사진 ${pic[1]}`)); }
      continue;
    }
    if (/^##\s+/.test(line)) { flushP(); flushL(); out.push(`<h3>${inline(line.replace(/^##\s+/, ""))}</h3>`); continue; }
    if (/^[-•·]\s+/.test(line)) { flushP(); list.push(line.replace(/^[-•·]\s+/, "")); continue; }
    flushL();
    para.push(line);
  }
  flushP(); flushL();
  return out.join("\n");
}

export function plain(body) {
  return String(body || "")
    .replace(/\[사진\s*\d+\]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/^##\s+|^[-•·]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
export const excerpt = (body, n = 110) => { const t = plain(body); return t.length > n ? `${t.slice(0, n).trim()}…` : t; };

/* ---------- lists ---------- */
function pager(base, page, pages) {
  if (pages <= 1) return "";
  const q = (p) => `${base}?page=${p}`;
  let s = "";
  for (let p = 1; p <= pages; p++) s += `<a href="${q(p)}" class="${p === page ? "is-on" : ""}"${p === page ? ' aria-current="page"' : ""}>${p}</a>`;
  return `<nav class="md-pager" aria-label="쪽 이동">${page > 1 ? `<a class="pv" href="${q(page - 1)}" aria-label="이전 쪽"></a>` : ""}${s}${page < pages ? `<a class="nx" href="${q(page + 1)}" aria-label="다음 쪽"></a>` : ""}</nav>`;
}
const empty = (t, d) => `<div class="md-empty" data-rv="up"><span class="md-empty-ico" aria-hidden="true"></span><strong>${t}</strong><p>${d}</p></div>`;
const tools = () => ""; // 얼굴본처럼 직원에게만 보이는 수정 버튼은 다음 단계에서

// 해운누리 소식: the numbered list the static page had
export function newsList({ items, total, page, pages, per }) {
  const head = `<div class="blk-head center" data-rv="up"><p class="label">( Notice )</p><h2 class="blk-title">해운누리한의원 소식과 공지</h2></div>`;
  if (!total) return `${head}${empty("아직 등록된 소식이 없습니다.", "해운누리한의원의 새 소식을 이곳에서 알려 드리겠습니다.")}`;
  const rows = items.map((p, i) => `<li><a href="${postUrl(p)}"><span class="no">${String(total - (page - 1) * per - i).padStart(2, "0")}</span><span class="tt">${esc(p.title)}</span><span class="dt">${ymd(p.created_at)} · 관리자</span></a></li>`).join("");
  return `${head}<ul class="board" data-rv="up">${rows}</ul>${pager(BASE.news, page, pages)}`;
}

// 전문칼럼: cards with the first picture as the cover
export function columnList({ items, total, page, pages }) {
  const head = `<div class="md-head" data-rv="up"><p class="label">( Column )</p>
    <h2 class="h2">원장님이 직접 쓰는 <em>전문칼럼</em></h2>
    <p class="md-lead">진료실에서 자주 듣는 질문과 꼭 알아야 할 건강 정보를 해운누리 원장님이 정리했습니다.</p></div>`;
  if (!total) return `<section class="md">${head}${empty("아직 등록된 칼럼이 없습니다.", "곧 해운누리 원장님의 전문칼럼을 소개해 드리겠습니다.")}</section>`;
  const grid = items.map((p, k) => `<li data-rv="up" style="--d:${(k % 3) * 90}ms"><a class="md-ccard" href="${postUrl(p)}">
        <span class="md-cover${p.pic ? "" : " is-empty"}">${p.pic ? `<img src="/media/${p.pic}?s=t" alt="" loading="lazy">` : "<em>Haeun-Nuri<br>Column</em>"}</span>
        <span class="md-ctxt"><strong>${esc(p.title)}</strong>${p.body ? `<p>${esc(excerpt(p.body, 90))}</p>` : ""}
        <span class="md-meta">${dot(p.created_at)}</span></span></a></li>`).join("");
  return `<section class="md">${head}<ul class="md-grid md-grid--col">${grid}</ul>${pager(BASE.column, page, pages)}</section>`;
}

// 유튜브: the newest one large on the first page, the rest in a grid; a card opens the video over the page (MediaClient)
export function videoList({ items, total, page, pages }) {
  const head = `<div class="md-head" data-rv="up"><p class="label">( Haeun-Nuri TV )</p>
    <h2 class="h2">영상으로 만나는 <em>해운누리 건강 이야기</em></h2>
    <p class="md-lead">원장님이 직접 설명하는 질환과 치료 이야기를 영상으로 편하게 확인하세요.</p></div>`;
  if (!total) return `<section class="md">${head}${empty("아직 등록된 영상이 없습니다.", "곧 해운누리한의원의 건강 영상을 소개해 드리겠습니다.")}</section>`;
  let rest = items;
  let feat = "";
  if (page === 1 && items.length) {
    const f = items[0];
    const id = youtubeId(f.youtube);
    rest = items.slice(1);
    feat = `<article class="md-feat" data-rv="up">
      <button type="button" class="md-feat-media" data-yt="${esc(id)}" data-title="${esc(f.title)}" aria-label="${esc(f.title)} 영상 재생">
        <img src="${ytThumb(id, "maxresdefault")}" onerror="this.onerror=null;this.src='${ytThumb(id)}'" alt="" loading="eager">
        <span class="md-play" aria-hidden="true"></span></button>
      <div class="md-feat-txt"><p class="md-tag">New</p>
        <h3>${esc(f.title)}</h3>${f.body ? `<p class="md-sum">${esc(excerpt(f.body, 140))}</p>` : ""}<span class="md-date">${dot(f.created_at)}</span>
        <button type="button" class="md-watch" data-yt="${esc(id)}" data-title="${esc(f.title)}" data-magnet><i aria-hidden="true"></i><span>영상 보기</span></button></div>
    </article>`;
  }
  const grid = rest.map((p, k) => {
    const id = youtubeId(p.youtube);
    return `<li data-rv="up" style="--d:${(k % 3) * 90}ms"><button type="button" class="md-card" data-yt="${esc(id)}" data-title="${esc(p.title)}">
        <span class="md-thumb"><img src="${ytThumb(id)}" alt="" loading="lazy"><span class="md-play" aria-hidden="true"></span></span>
        <strong>${esc(p.title)}</strong><span class="md-date">${dot(p.created_at)}</span></button></li>`;
  }).join("");
  return `<section class="md">${head}${feat}${grid ? `<ul class="md-grid md-grid--yt">${grid}</ul>` : ""}${pager(BASE.video, page, pages)}</section>`;
}

/* ---------- a post's own page ---------- */
const hiddenNote = (p) => (p.published ? "" : '<p class="md-preview">숨김 상태입니다. 관리자에게만 보입니다.</p>');

function bodyWithPics(p, pics) {
  const used = new Set();
  const body = bodyHtml(p.body, pics, used, p.title);
  const rest = pics.filter((m) => !used.has(m.id));
  return { body, rest };
}

export function newsView(p, pics, nav) {
  const { body, rest } = bodyWithPics(p, pics);
  const more = rest.map((m, i) => figure(m, `${p.title} 사진 ${i + 1}`)).join("");
  const link = (q, label) => (q ? `<a class="btn btn-line" href="${postUrl({ ...q, cat: "news" })}">${label}</a>` : "");
  return `${hiddenNote(p)}<div class="post-head" data-rv="up"><p class="label">( Notice )</p><h1>${esc(p.title)}</h1><p class="post-meta">${ymd(p.created_at)} · 관리자 ${tools(p.id)}</p></div>
        <div class="post-body md-prose">${more}${body}</div>
        <div class="post-nav">${link(nav.prev, "이전글")}<a class="btn btn-gold" href="${BASE.news}">목록</a>${link(nav.next, "다음글")}</div>`;
}

export function columnView(p, pics, nav) {
  const { body, rest } = bodyWithPics(p, pics);
  const cover = rest.shift();
  const more = rest.map((m, i) => figure(m, `${p.title} 사진 ${i + 2}`)).join("");
  const link = (q, cls, label) => (q ? `<a class="${cls}" href="${postUrl({ ...q, cat: "column" })}"><small>${label}</small><span>${esc(q.title)}</span></a>` : "<span></span>");
  return `<article class="md-art">${hiddenNote(p)}
    <header class="md-art-head" data-rv="up">
      <a class="md-back" href="${BASE.column}">전문칼럼 목록</a>
      <h1>${esc(p.title)}</h1>
      <p class="md-meta"><span>${dot(p.created_at)}</span>${tools(p.id)}</p>
    </header>
    ${cover ? `<figure class="md-art-cover" data-rv="up"><img src="/media/${cover.id}" alt="" width="${cover.width}" height="${cover.height}"></figure>` : ""}
    <div class="md-prose">${body}${more}</div>
    <footer class="md-art-foot">
      <div class="md-share"><button type="button" class="md-copy" data-copy>링크 복사</button><a class="md-list" href="${BASE.column}">목록으로</a></div>
      <nav class="md-adj" aria-label="다른 칼럼">${link(nav.prev, "pv", "이전 글")}${link(nav.next, "nx", "다음 글")}</nav>
    </footer>
  </article>`;
}

/* ---------- 메인 팝업 (홈페이지 → 메인 팝업) ---------- */
// The main page has no popup of its own: the server adds this layer when there are popups for today.
export function popupLayer(slides) {
  return `<div class="hn-pop" data-hn-pop hidden role="dialog" aria-modal="true" aria-label="알림">
  <div class="hn-pop-card"><ul class="hn-pop-track">${slides}</ul>
    <div class="hn-pop-foot"><button type="button" data-hn-pop-today>오늘 하루 보지 않기</button><button type="button" data-hn-pop-close>닫기</button></div></div>
</div>
<style>.hn-pop{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:16px;background:rgba(20,14,10,.55)}.hn-pop[hidden]{display:none}.hn-pop-card{width:min(440px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 24px 60px rgba(0,0,0,.3)}.hn-pop-track{list-style:none;margin:0;padding:0;display:flex;overflow-x:auto;scroll-snap-type:x mandatory}.hn-pop-track li{flex:0 0 100%;scroll-snap-align:start}.hn-pop-track img{display:block;width:100%;height:auto}.hn-pop-foot{display:flex;justify-content:space-between;background:#2b2019}.hn-pop-foot button{flex:1;padding:14px;border:0;background:none;color:#fff;font:inherit;font-size:14px;cursor:pointer}.hn-pop-foot button+button{border-left:1px solid rgba(255,255,255,.2)}</style>
<script>(()=>{const el=document.querySelector("[data-hn-pop]");if(!el)return;const K="hn-pop-until";let until=0;try{until=+localStorage.getItem(K)||0}catch(e){}if(Date.now()<until)return;el.hidden=false;const close=()=>{el.hidden=true};el.querySelector("[data-hn-pop-close]").onclick=close;el.querySelector("[data-hn-pop-today]").onclick=()=>{const d=new Date();d.setHours(24,0,0,0);try{localStorage.setItem(K,String(d.getTime()))}catch(e){}close()};el.addEventListener("click",(e)=>{if(e.target===el)close()});document.addEventListener("keydown",(e)=>{if(e.key==="Escape")close()})})();</script>`;
}
