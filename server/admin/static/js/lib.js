// Small helpers every screen of the admin uses: safe HTML, the API, Korean dates in Seoul time, toasts and dialogs.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- HTML that escapes whatever it is given, unless it is already HTML ---------- */
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(String(s ?? ""));
const part = (v) => (v instanceof Raw ? v.s : Array.isArray(v) ? v.map(part).join("") : v === false || v == null ? "" : esc(v));
export function html(strings, ...vals) {
  let out = strings[0];
  vals.forEach((v, i) => { out += part(v) + strings[i + 1]; });
  return new Raw(out);
}
export const icon = (name, cls = "") => raw(`<svg class="i${cls ? ` ${cls}` : ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`);

/* ---------- the server ---------- */
export async function api(path, { method = "GET", json, form, signal } = {}) {
  const init = { method, credentials: "same-origin", headers: { Accept: "application/json" }, signal };
  if (json !== undefined) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(json); }
  if (form) init.body = form;
  let res;
  try { res = await fetch(`/api/admin${path}`, init); } catch (e) {
    if (e.name === "AbortError") throw e;
    throw Object.assign(new Error("서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요."), { status: 0 });
  }
  let data = {};
  try { data = await res.json(); } catch { /* not JSON */ }
  if (res.status === 401 && !path.startsWith("/login")) window.dispatchEvent(new CustomEvent("admin:signed-out"));
  if (!res.ok) throw Object.assign(new Error(data.error || `문제가 생겼습니다 (${res.status}).`), { status: res.status, data });
  return data;
}

/* ---------- Seoul time, in the words a Korean clinic uses ---------- */
const TZ = "Asia/Seoul";
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const partsFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" });
const WDX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export function kst(d) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(d)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, H: +p.hour, M: +p.minute, w: WDX[p.weekday], ymd: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` };
}
export const today = () => kst(Date.now()).ymd;
export const addDays = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
export const ymdParts = (ymd) => { const [y, m, d] = ymd.split("-").map(Number); return { y, m, d, w: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
export const wd = (w) => WD[w];
export const md = (d) => { const k = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? ymdParts(d) : kst(d); return `${k.m}월 ${k.d}일 (${WD[k.w]})`; };
export const hm = (d) => kst(d).hm;
export const full = (d) => { const k = kst(d); return `${k.y}년 ${k.m}월 ${k.d}일 (${WD[k.w]}) ${k.hm}`; };
export function short(d) {
  if (!d) return "";
  const k = kst(d);
  const t = kst(Date.now());
  if (k.ymd === t.ymd) return k.hm;
  if (k.ymd === addDays(t.ymd, -1)) return `어제 ${k.hm}`;
  if (k.y === t.y) return `${k.m}/${k.d} ${k.hm}`;
  return `${k.y}/${k.m}/${k.d}`;
}
export function ago(d) {
  const s = Math.max(0, (Date.now() - new Date(d)) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}일 전`;
  return short(d);
}
export function dur(secs) {
  if (secs == null) return "–";
  const s = Math.round(secs);
  if (s < 60) return `${s}초`;
  if (s < 3600) return `${Math.round(s / 60)}분`;
  if (s < 86400) { const h = Math.floor(s / 3600); const m = Math.round((s % 3600) / 60); return m ? `${h}시간 ${m}분` : `${h}시간`; }
  const d = Math.floor(s / 86400); const h = Math.round((s % 86400) / 3600); return h ? `${d}일 ${h}시간` : `${d}일`;
}
export const phone = (p) => String(p || "").replace(/^(02)(\d{3,4})(\d{4})$/, "$1-$2-$3").replace(/^(01\d|0\d{2})(\d{3,4})(\d{4})$/, "$1-$2-$3");
export const num = (n) => Number(n || 0).toLocaleString("ko-KR");
export const won = (n) => (n == null ? "–" : `${Number(n).toLocaleString("ko-KR")}원`);
export function manwon(n) {
  const v = Number(n || 0);
  if (v >= 1e8) return `${(v / 1e8).toFixed(v % 1e8 ? 1 : 0)}억 원`;
  if (v >= 1e4) return `${Math.round(v / 1e4).toLocaleString("ko-KR")}만 원`;
  return `${v.toLocaleString("ko-KR")}원`;
}
export const pct = (a, b, digits = 1) => (b ? `${((a / b) * 100).toFixed(digits)}%` : "–");
export function delta(now, prev) {
  if (!prev && !now) return html`<span class="delta flat">–</span>`;
  if (!prev) return html`<span class="delta up">새로</span>`;
  const d = ((now - prev) / prev) * 100;
  if (Math.abs(d) < 0.5) return html`<span class="delta flat">변화 없음</span>`;
  return html`<span class="delta ${d > 0 ? "up" : "down"}">${d > 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(0)}%</span>`;
}

/* ---------- words the admin shares ---------- */
export const STATUS = {
  new: "신규", contacting: "연락 중", booked: "예약 확정", visited: "내원", surgery: "시술 진행",
  hold: "보류", closed: "상담 종료", noshow: "노쇼", canceled: "취소", spam: "스팸",
};
export const FLOW = ["new", "contacting", "booked", "visited", "surgery"];
export const SIDE = ["hold", "closed", "noshow", "canceled", "spam"];
export const KINDS = { tel: "전화 상담", sms: "문자 상담", cost: "비용 상담", booking: "예약 신청", event: "이벤트 신청", model: "리얼모델 신청", manual: "직접 등록", online: "온라인 상담", import: "예전 상담" };
export const INTERESTS = ["눈", "코", "귀족·무턱 보형물", "중년 눈", "리프팅·안면거상", "피부·쁘띠", "남자 눈·코", "기타"];
export const MANUAL = ["전화 문의", "내원", "카카오톡 채널", "인스타그램 DM", "네이버 톡톡", "소개", "기타"];
export const pill = (st) => html`<span class="pill t-${st}">${STATUS[st] || st}</span>`;

/* ---------- toasts ---------- */
export function toast(msg, { bad = false, link } = {}) {
  let box = $(".toasts");
  if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite"); document.body.append(box); }
  const t = document.createElement("div");
  t.className = `toast${bad ? " is-bad" : ""}`;
  t.append(msg);
  if (link) { const a = document.createElement("a"); a.href = link.href; a.textContent = link.label; t.append(a); }
  box.append(t);
  setTimeout(() => { t.classList.add("is-out"); setTimeout(() => t.remove(), 250); }, link ? 6000 : 3200);
}

/* ---------- a question before something that cannot be undone ---------- */
export function confirmBox({ title, body = "", ok = "확인", danger = false }) {
  return new Promise((resolve) => {
    const d = document.createElement("dialog");
    d.className = "dlg";
    d.innerHTML = String(html`<form method="dialog"><div class="dlg-body"><h2>${title}</h2>${body ? html`<p>${body}</p>` : ""}</div>
      <div class="dlg-foot"><button class="btn" value="no">취소</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" value="yes" autofocus>${ok}</button></div></form>`);
    d.addEventListener("close", () => { resolve(d.returnValue === "yes"); d.remove(); });
    document.body.append(d);
    d.showModal();
  });
}

export function lightbox(src, alt = "") {
  const d = document.createElement("dialog");
  d.className = "lightbox";
  d.innerHTML = String(html`<img src="${src}" alt="${alt}"><button class="icon-btn" aria-label="닫기">${icon("x")}</button>`);
  d.addEventListener("click", () => d.close());
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  d.showModal();
}

// a button that shows it is working while its promise runs
export async function busy(btn, fn) {
  if (!btn) return fn();
  btn.classList.add("is-busy");
  btn.disabled = true;
  try { return await fn(); } finally { btn.classList.remove("is-busy"); btn.disabled = false; }
}

export const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const skeleton = (n = 4) => html`<div class="panel"><div class="panel-body">${Array.from({ length: n }, (_, i) => html`<div class="skel skel-line" style="width:${[92, 76, 84, 60, 88, 70][i % 6]}%"></div>`)}</div></div>`;
export const empty = (ic, title, text = "") => html`<div class="empty">${icon(ic)}<strong>${title}</strong>${text ? html`<p>${text}</p>` : ""}</div>`;
export const errorBox = (msg) => html`<div class="error-box">${icon("alert")}<span>${msg}</span></div>`;
