// The admin's frame: log-in, the side menu (a tab bar on phones), the address bar as the router, and the check for
// new consultations every 30 seconds while the tab is open (a toast, the count in the menu and the tab's title, and a
// system notification when this device allowed it).
import { $, $$, html, icon, api, toast, busy } from "./lib.js";
import * as dashboard from "./dashboard.js";
import * as consults from "./consults.js";
import * as calendar from "./calendar.js";
import * as analytics from "./analytics.js";
import * as posts from "./posts.js";
import * as settings from "./settings.js";
import * as site from "./site.js";

const app = $("#app");
const ROUTES = [
  [/^\/admin\/?$/, "home", dashboard.render],
  [/^\/admin\/consults\/new\/?$/, "consults", consults.renderNew],
  [/^\/admin\/consults(?:\/(\d+))?\/?$/, "consults", consults.render],
  [/^\/admin\/calendar\/?$/, "calendar", calendar.render],
  [/^\/admin\/stats\/?$/, "stats", analytics.render],
  [/^\/admin\/posts\/?$/, "posts", posts.renderList],
  [/^\/admin\/posts\/(new|\d+)\/?$/, "posts", posts.renderEditor],
  [/^\/admin\/site\/?$/, "site", site.render],
  [/^\/admin\/settings\/?$/, "settings", settings.render],
];
const MENU = [
  ["home", "/admin", "dashboard", "대시보드"],
  ["consults", "/admin/consults", "inbox", "상담 관리"],
  ["calendar", "/admin/calendar", "calendar", "예약 일정"],
  ["stats", "/admin/stats", "chart", "유입 분석"],
  ["posts", "/admin/posts", "file", "게시판"],
  ["site", "/admin/site", "globe", "홈페이지"],
  ["settings", "/admin/settings", "sliders", "설정"],
];

let me = null;
let cleanup = null;
let ctl = null;
let current = null; // { key, render, path }

/* ---------- log-in ---------- */
function renderLogin(info = {}, msg = "") {
  document.title = "관리자 로그인 | 해운누리한의원";
  app.className = "";
  app.innerHTML = String(html`<main class="login">
    <div class="login-card">
      <img class="login-logo" src="/admin/static/logo.png" alt="해운누리한의원" width="179" height="24">
      <h1>관리자 로그인</h1>
      <p class="lead">상담, 예약, 유입 분석과 게시판을 관리합니다.</p>
      <form novalidate>
        <div class="field"><label for="lg-id">아이디</label><input class="input" id="lg-id" name="login" autocomplete="username" autocapitalize="off" spellcheck="false" required></div>
        <div class="field"><label for="lg-pw">비밀번호</label>
          <div class="pw-wrap"><input class="input" id="lg-pw" name="password" type="password" autocomplete="current-password" required>
          <button type="button" class="icon-btn icon-btn-sm" data-peek aria-label="비밀번호 보기">${icon("eye", "i-sm")}</button></div></div>
        <p class="login-msg" role="alert">${msg}</p>
        <button class="btn btn-primary" type="submit">로그인</button>
      </form>
      <p class="login-foot">직원 계정은 대표 관리자가 설정 화면에서 만듭니다. 비밀번호를 잊었다면 대표 관리자에게 초기화를 요청하세요.</p>
    </div>
  </main>`);
  const form = $("form", app);
  const out = $(".login-msg", app);
  if (info && info.db === false) out.textContent = "데이터베이스가 아직 연결되지 않았습니다. Railway에서 Postgres 연결(DATABASE_URL)을 확인해 주세요.";
  $("[data-peek]", app).addEventListener("click", (e) => {
    const pw = $("#lg-pw", app);
    pw.type = pw.type === "password" ? "text" : "password";
    e.currentTarget.innerHTML = String(icon(pw.type === "password" ? "eye" : "eye-off", "i-sm"));
    e.currentTarget.setAttribute("aria-label", pw.type === "password" ? "비밀번호 보기" : "비밀번호 가리기");
  });
  $("#lg-id", app).focus();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    out.textContent = "";
    const login = form.login.value.trim();
    const password = form.password.value;
    if (!login || !password) { out.textContent = "아이디와 비밀번호를 넣어 주세요."; return; }
    await busy($("button[type=submit]", form), async () => {
      try {
        const r = await api("/login", { method: "POST", json: { login, password } });
        start(r.user);
      } catch (err) { out.textContent = err.message; form.password.select(); }
    });
  });
}

/* ---------- the frame ---------- */
function start(user) {
  me = user;
  app.className = "";
  const nav = () => MENU.map(([key, href, ic, label]) => html`<a href="${href}" data-nav="${key}">${icon(ic)}<span>${label}</span>${key === "consults" ? html`<span class="badge" data-badge hidden></span>` : ""}</a>`);
  app.innerHTML = String(html`<div class="shell">
    <aside class="side">
      <a class="brand" href="/admin"><img src="/admin/static/logo.png" alt="해운누리한의원" width="120" height="16"><span class="brand-tag">관리자</span></a>
      <nav class="nav" aria-label="관리 메뉴">${nav()}</nav>
      <div class="side-foot">
        <a class="side-link" href="/" target="_blank" rel="noopener">${icon("external", "i-sm")}홈페이지 보기</a>
        <div class="me"><span class="avatar" aria-hidden="true">${me.name.slice(0, 1)}</span><span class="me-name"><strong data-me-name>${me.name}</strong><small>${me.role === "owner" ? "대표 관리자" : "직원"} · ${me.login}</small></span>
          <button class="icon-btn icon-btn-sm" type="button" data-logout aria-label="로그아웃" title="로그아웃">${icon("logout", "i-sm")}</button></div>
      </div>
    </aside>
    <div class="main">
      <header class="top">
        <button class="icon-btn only-m" type="button" data-back aria-label="뒤로" hidden>${icon("arrow-left")}</button>
        <h1 class="top-title" data-title></h1>
        <div class="top-actions" data-actions></div>
      </header>
      <main class="page" id="page" tabindex="-1"></main>
    </div>
    <nav class="tabbar" aria-label="관리 메뉴">
      ${MENU.slice(0, 4).map(([key, href, ic], i) => html`<a href="${href}" data-nav="${key}">${icon(ic)}<span>${["홈", "상담", "일정", "유입"][i]}</span>${key === "consults" ? html`<span class="badge" data-badge hidden></span>` : ""}</a>`)}
      <button type="button" data-more data-nav="more">${icon("menu")}<span>더보기</span></button>
    </nav>
  </div>`);
  $$("[data-logout]").forEach((b) => b.addEventListener("click", logout));
  $("[data-more]").addEventListener("click", openMore);
  $("[data-back]").addEventListener("click", () => (history.length > 1 ? history.back() : go("/admin")));
  const top = $(".top");
  const onScroll = () => top.classList.toggle("is-stuck", window.scrollY > 4);
  window.addEventListener("scroll", onScroll, { passive: true });
  route();
  pulse();
}

function openMore() {
  const d = document.createElement("dialog");
  d.className = "sheet";
  d.innerHTML = String(html`<div class="sheet-grip"></div>
    <a href="/admin/posts">${icon("file")}게시판</a>
    <a href="/admin/site">${icon("globe")}홈페이지 (팝업·비급여·광고 코드)</a>
    <a href="/admin/settings">${icon("sliders")}설정</a>
    <a href="/" target="_blank" rel="noopener">${icon("external")}홈페이지 보기</a>
    <button type="button" class="sheet-item" data-logout>${icon("logout")}로그아웃 <span class="muted small">(${me.name})</span></button>`);
  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("a")) d.close(); });
  $("[data-logout]", d).addEventListener("click", () => { d.close(); logout(); });
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  d.showModal();
}

async function logout() {
  await api("/logout", { method: "POST" }).catch(() => {});
  stopPulse();
  me = null;
  history.replaceState(null, "", "/admin");
  renderLogin({}, "");
  toast("로그아웃했습니다.");
}

/* ---------- the router ---------- */
export function go(url, { replace = false } = {}) {
  const u = new URL(url, location.origin);
  if (u.pathname + u.search === location.pathname + location.search && !replace) return route();
  history[replace ? "replaceState" : "pushState"](null, "", u.pathname + u.search + u.hash);
  route();
}
// change the query without redrawing the screen (filters that the screen already applied)
export const setQuery = (params) => {
  const u = new URL(location.href);
  Object.entries(params).forEach(([k, v]) => (v === "" || v == null ? u.searchParams.delete(k) : u.searchParams.set(k, v)));
  history.replaceState(null, "", u.pathname + u.search);
};

async function route() {
  if (!me) return;
  const path = location.pathname;
  const found = ROUTES.find(([re]) => re.test(path));
  if (!found) { go("/admin", { replace: true }); return; }
  const [re, key, render] = found;
  const params = path.match(re).slice(1);
  pulseNow(); // the count in the menu is fresh on every screen, not only every 30 seconds
  $$("[data-nav]").forEach((a) => (a.dataset.nav === key ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  const deep = /\/(\d+|new)\/?$/.test(path);
  $("[data-back]").hidden = !deep;
  // the same screen with another item (a consultation in the side pane): the screen updates itself
  if (current && current.render === render && current.update) {
    const kept = await current.update({ params, query: new URLSearchParams(location.search) });
    if (kept !== false) return;
  }
  if (cleanup) { try { cleanup(); } catch { /* already gone */ } cleanup = null; }
  if (ctl) ctl.abort();
  ctl = new AbortController();
  const page = $("#page");
  page.innerHTML = "";
  setTitle("");
  setActions("");
  window.scrollTo(0, 0);
  current = { render, key };
  const ctx = {
    page, params, me, signal: ctl.signal, go, setQuery, setTitle, setActions,
    query: new URLSearchParams(location.search),
    onUpdate: (fn) => { current.update = fn; },
    refreshPulse: pulseNow,
  };
  try {
    cleanup = (await render(ctx)) || null;
  } catch (e) {
    if (e.name === "AbortError") return;
    if (e.status === 401) return;
    console.error(e);
    page.innerHTML = String(html`<div class="error-box">${icon("alert")}<span>${e.message || "화면을 불러오지 못했습니다."}</span></div>`);
  }
}
function setTitle(t) {
  $("[data-title]").textContent = t;
  document.title = `${unread ? `(${unread}) ` : ""}${t ? `${t} | ` : ""}관리자 | 해운누리한의원`;
}
function setActions(h) { $("[data-actions]").innerHTML = String(h || ""); }

document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a || !me || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank" || a.hasAttribute("download")) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || !u.pathname.startsWith("/admin")) return;
  e.preventDefault();
  go(u.pathname + u.search + u.hash);
});
window.addEventListener("popstate", route);
window.addEventListener("admin:signed-out", () => {
  if (!me) return;
  me = null;
  stopPulse();
  renderLogin({}, "로그인이 끝났습니다. 다시 로그인해 주세요. (12시간 동안 사용하지 않으면 자동으로 로그아웃됩니다)");
});
window.addEventListener("admin:me", (e) => { me = { ...me, ...e.detail }; $$("[data-me-name]").forEach((el) => { el.textContent = me.name; }); });

/* ---------- new consultations while the admin is open ---------- */
let unread = 0;
let latest = null;
let timer = null;
async function pulseNow() {
  if (!me) return;
  try {
    const p = await api("/pulse");
    unread = p.open;
    $$("[data-badge]").forEach((b) => { b.hidden = !p.open; b.textContent = p.open > 99 ? "99+" : p.open; });
    document.title = document.title.replace(/^\(\d+\) /, "");
    if (unread) document.title = `(${unread}) ${document.title}`;
    if (latest !== null && p.latest > latest) {
      const href = `/admin/consults/${p.latest}`;
      toast("새 상담 신청이 들어왔습니다.", { link: { href, label: "열기" } });
      try {
        if (localStorage.getItem("fb-admin-notify") === "1" && "Notification" in window && Notification.permission === "granted") {
          const n = new Notification("해운누리 · 새 상담", { body: "관리자에서 확인해 주세요.", icon: "/admin/static/icon-192.png", tag: "consult" });
          n.onclick = () => { window.focus(); go(href); n.close(); };
        }
      } catch { /* notifications off */ }
      window.dispatchEvent(new CustomEvent("admin:new-consult", { detail: p }));
    }
    latest = p.latest;
  } catch { /* offline for a moment */ }
}
function pulse() {
  stopPulse();
  pulseNow();
  timer = setInterval(() => { if (document.visibilityState === "visible") pulseNow(); }, 30000);
  document.addEventListener("visibilitychange", onVisible);
}
function onVisible() { if (document.visibilityState === "visible") pulseNow(); }
function stopPulse() { clearInterval(timer); timer = null; latest = null; document.removeEventListener("visibilitychange", onVisible); }

/* ---------- start ---------- */
(async () => {
  let info;
  try { info = await api("/me"); } catch (e) {
    app.innerHTML = String(html`<main class="login"><div class="login-card"><img class="login-logo" src="/admin/static/logo.png" alt="해운누리한의원" width="179" height="24"><h1>연결할 수 없습니다</h1><p class="lead">${e.message}</p><form><button class="btn btn-primary" type="button" data-retry>다시 시도</button></form></div></main>`);
    $("[data-retry]", app).addEventListener("click", () => location.reload());
    return;
  }
  if (info.user) start(info.user);
  else renderLogin(info);
})();
