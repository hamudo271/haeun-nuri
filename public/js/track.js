/* 해운누리한의원 — 방문 집계 (server/stats.js). 서버가 모든 공개 페이지에 넣는다. 쿠키·이름 없음. */
/* ---------- the clinic's own visit counter (server/stats.js): no cookie and no name ----------
   A random visitor number and visit number stay in this browser (localStorage "fb-a"), with where the first visit
   and this visit came from. Each page sends one small beacon; a visit's first page also sends its referrer and its
   link tags (utm_…). Taps on the phone number, KakaoTalk, the map and outside links are counted too. The
   consultation forms (상담 신청서가 생기면) send the same numbers, so /admin can tell which channel brought a consultation. */
(() => {
  "use strict";
  if (!/^https?:$/.test(location.protocol) || /^\/admin(\/|$)/.test(location.pathname)) return;
  const KEY = "fb-a";
  const now = Date.now();
  const rid = () => {
    try { return Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(36)).join("").slice(0, 20); } catch (e) { return (Math.random().toString(36).slice(2) + now.toString(36)).slice(0, 20); }
  };
  let st = {};
  try { st = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { st = {}; }
  const q = location.search.slice(0, 600);
  const tagged = /[?&](utm_|gclid=|gbraid=|wbraid=|fbclid=|n_media=|n_query=|n_keyword=|NaPm=)/.test(q);
  const ref = document.referrer.slice(0, 600);
  let refHost = "";
  try { refHost = ref ? new URL(ref).host : ""; } catch (e) { refHost = ""; }
  const outside = !!refHost && refHost !== location.host;
  // a new visit after 30 minutes away, or when the visitor arrives again from another place or a tagged link
  const fresh = !st.s || now - (st.t || 0) > 30 * 60 * 1000 || tagged || (outside && refHost !== st.rh);
  if (!st.v || String(st.v).length < 8) st.v = rid();
  if (fresh) {
    const touch = { r: ref, q, l: location.pathname, at: now };
    st.s = rid();
    st.e = touch;
    st.rh = refHost;
    if (!st.f) st.f = touch;
  }
  st.t = now;
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode: this page still counts */ }
  const send = (extra) => {
    const body = JSON.stringify(Object.assign({ v: st.v, s: st.s, p: location.pathname }, extra));
    try { if (navigator.sendBeacon && navigator.sendBeacon("/api/v", body)) return; } catch (e) { /* fall through */ }
    try { fetch("/api/v", { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {}); } catch (e) { /* offline */ }
  };
  send(fresh ? { r: ref, q } : {});
  const KINDS = [
    [/^tel:/, "tel"],
    [/pf\.kakao\.com|open\.kakao\.com/, "kakao"],
    [/booking\.naver\.com/, "book"],
    [/map\.naver\.com|naver\.me\/|place\.naver\.com|map\.kakao\.com|kakaomap|google\.[a-z.]+\/maps|maps\.app\.goo\.gl|tmap/, "map"],
    [/instagram\.com|youtube\.com|youtu\.be|blog\.naver\.com|facebook\.com|tiktok\.com|threads\.(net|com)/, "sns"],
  ];
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    const hit = KINDS.find(([re]) => re.test(href));
    if (hit) send({ k: hit[1], t: href.slice(0, 200) });
    else if (/^https?:/.test(href) && a.host !== location.host) send({ k: "out", t: href.slice(0, 200) });
  }, true);
  window.fbTrack = {
    ids: () => ({ vid: st.v, sid: st.s }),
    touch: () => ({ f: st.f, e: st.e }),
    send: (k, t) => send({ k, t: String(t || "").slice(0, 200) }),
  };
})();
