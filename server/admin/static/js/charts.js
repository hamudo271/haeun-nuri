// Charts drawn by hand: a trend (visitors as a line, consultations as bars, each on its own scale), bar lists,
// a stacked share bar, a weekday × hour heat map and a funnel. No library; they size to their box and redraw on resize.
import { html, esc, num, pct } from "./lib.js";

export const GROUP_COLORS = {
  검색: "#1874b8", 광고: "#d98a1c", 지도: "#2e9e6a", "블로그·카페": "#6a4fd0", SNS: "#d4577b", 메신저: "#c9a100",
  성형앱: "#0b8a9a", "AI 검색": "#8b6cf0", 캠페인: "#a4661b", 오프라인: "#6b7580", "기타 사이트": "#9aa3ad", "직접 방문": "#0e3a63", "직접 등록": "#4b5560",
};
const BLUE = "#1874b8";
const AMBER = "#e09a2e";

function niceMax(v) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
const label = (key, unit) => (unit === "hour" ? `${key}시` : `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`);
const tipLabel = (key, unit) => {
  if (unit === "hour") return `${key}:00 – ${key}:59`;
  const [y, m, d] = key.split("-").map(Number);
  return `${m}월 ${d}일 (${"일월화수목금토"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
};

// visitors (line, left scale) and consultations (bars, right scale)
export function trend(el, rows, { unit = "day", compact = false } = {}) {
  const draw = () => {
    const W = Math.max(280, Math.round(el.clientWidth));
    const H = compact ? 150 : W < 560 ? 190 : 240;
    const pad = { l: 34, r: 30, t: 14, b: 26 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const n = rows.length || 1;
    const vmax = niceMax(Math.max(1, ...rows.map((r) => r.visitors)));
    const cmax = niceMax(Math.max(1, ...rows.map((r) => r.consults)));
    const step = iw / n;
    const x = (i) => pad.l + (i + 0.5) * step;
    const yv = (v) => pad.t + ih - (v / vmax) * ih;
    const yc = (v) => pad.t + ih - (v / cmax) * ih;
    const bw = Math.max(3, Math.min(16, step * 0.46));
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    const every = Math.max(1, Math.ceil(n / (W < 560 ? 5 : 8)));
    const pts = rows.map((r, i) => [x(i), yv(r.visitors)]);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
    const area = pts.length ? `${line}L${pts[pts.length - 1][0].toFixed(1)},${pad.t + ih}L${pts[0][0].toFixed(1)},${pad.t + ih}Z` : "";
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="방문자와 상담 신청 추이">
      <defs><linearGradient id="tg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${BLUE}" stop-opacity="0.18"/><stop offset="1" stop-color="${BLUE}" stop-opacity="0"/></linearGradient></defs>
      <g class="grid">${ticks.map((t) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${(pad.t + ih - t * ih).toFixed(1)}" y2="${(pad.t + ih - t * ih).toFixed(1)}"/>`).join("")}</g>
      <g class="axis">${ticks.map((t) => `<text x="${pad.l - 8}" y="${(pad.t + ih - t * ih + 4).toFixed(1)}" text-anchor="end">${num(Math.round(t * vmax))}</text>`).join("")}
        ${ticks.map((t) => `<text x="${W - pad.r + 8}" y="${(pad.t + ih - t * ih + 4).toFixed(1)}" fill="${AMBER}" style="fill:${AMBER}">${Math.round(t * cmax * 10) / 10}</text>`).join("")}
        ${rows.map((r, i) => (i % every === 0 ? `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(label(r.key, unit))}</text>` : "")).join("")}</g>
      <g>${rows.map((r, i) => (r.consults ? `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${yc(r.consults).toFixed(1)}" width="${bw.toFixed(1)}" height="${(pad.t + ih - yc(r.consults)).toFixed(1)}" rx="2" fill="${AMBER}" opacity="0.9"/>` : "")).join("")}</g>
      <path d="${area}" fill="url(#tg)"/>
      <path d="${line}" fill="none" stroke="${BLUE}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
      ${n <= 45 ? pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" fill="#fff" stroke="${BLUE}" stroke-width="1.6"/>`).join("") : ""}
      <line class="guide" x1="0" x2="0" y1="${pad.t}" y2="${pad.t + ih}" stroke="#9aa6b2" stroke-dasharray="3 3" visibility="hidden"/>
      <rect class="hover" x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih}" fill="transparent"/>
    </svg>`;
    const svg = el.querySelector("svg");
    const guide = svg.querySelector(".guide");
    let tip = null;
    const hide = () => { guide.setAttribute("visibility", "hidden"); if (tip) { tip.remove(); tip = null; } };
    const show = (clientX) => {
      const box = svg.getBoundingClientRect();
      const mx = ((clientX - box.left) / box.width) * W;
      const i = Math.min(n - 1, Math.max(0, Math.floor((mx - pad.l) / step)));
      const r = rows[i];
      if (!r) return;
      guide.setAttribute("x1", x(i)); guide.setAttribute("x2", x(i)); guide.setAttribute("visibility", "visible");
      if (!tip) { tip = document.createElement("div"); tip.className = "chart-tip"; el.append(tip); }
      tip.innerHTML = String(html`<b>${tipLabel(r.key, unit)}</b><span><i style="background:${BLUE}"></i>방문자 ${num(r.visitors)}명</span><br><span><i style="background:${AMBER}"></i>상담 신청 ${num(r.consults)}건</span>`);
      tip.style.left = `${Math.min(Math.max((x(i) / W) * box.width, 70), box.width - 70)}px`;
      tip.style.top = `${(Math.min(yv(r.visitors), yc(r.consults || 0)) / H) * box.height}px`;
    };
    const hover = svg.querySelector(".hover");
    hover.addEventListener("pointermove", (e) => show(e.clientX));
    hover.addEventListener("pointerdown", (e) => show(e.clientX));
    hover.addEventListener("pointerleave", hide);
  };
  draw();
  let t;
  const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(draw, 120); });
  ro.observe(el);
  return () => ro.disconnect();
}
export const trendLegend = () => html`<div class="legend"><span><i style="background:${BLUE}"></i>방문자</span><span><i style="background:${AMBER}"></i>상담 신청</span></div>`;

// a list of labelled bars; value(r) the number, text(r) what is written at the end
export function bars(rows, { value = (r) => r.n, text, label = (r) => r.label, color, max } = {}) {
  const top = max || Math.max(1, ...rows.map(value));
  return html`<ul class="bars">${rows.map((r) => html`<li><span class="lbl" title="${label(r)}">${label(r)}</span>
    <span class="bar"><i style="width:${((value(r) / top) * 100).toFixed(1)}%;${color ? `background:${typeof color === "function" ? color(r) : color}` : ""}"></i></span>
    <span class="v">${text ? text(r) : num(value(r))}</span></li>`)}</ul>`;
}

// how the visits split between the kinds of source
export function stack(groups) {
  const total = groups.reduce((s, g) => s + g.n, 0) || 1;
  return html`<div class="stackbar" role="img" aria-label="유입 분류 비율">${groups.map((g) => html`<i style="width:${((g.n / total) * 100).toFixed(2)}%;background:${GROUP_COLORS[g.label] || "#9aa3ad"}" title="${g.label} ${pct(g.n, total)}"></i>`)}</div>
    <div class="stack-legend">${groups.map((g) => html`<span><i style="background:${GROUP_COLORS[g.label] || "#9aa3ad"}"></i>${g.label}<b>${pct(g.n, total, 0)}</b></span>`)}</div>`;
}

// weekday (월–일) by hour
export function heat(rows, color = BLUE) {
  const m = Array.from({ length: 7 }, () => Array(24).fill(0));
  rows.forEach((r) => { m[(r.dow + 6) % 7][r.hour] = r.n; });
  const max = Math.max(1, ...m.flat());
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  return html`<div class="heat" role="img" aria-label="요일과 시간대별 분포">
    <span></span>${Array.from({ length: 24 }, (_, hr) => html`<span>${hr % 3 === 0 ? hr : ""}</span>`)}
    ${m.map((row, d) => html`<span>${days[d]}</span>${row.map((v, hr) => html`<i class="cell${v ? "" : " zero"}" style="${v ? `background:${color};opacity:${(0.18 + (v / max) * 0.82).toFixed(2)}` : ""}" title="${days[d]} ${hr}시 · ${v}"></i>`)}`)}
  </div>`;
}

// each step's bar and share against the first step (the steps are not nested: a visit can reach the booking page
// without a treatment page, so a share of the step before could pass 100%)
export function funnel(steps) {
  const first = Math.max(1, steps[0]?.n || 0);
  return html`<ol class="funnel">${steps.map((s, i) => html`<li><span class="lbl">${s.label}</span>
    <span class="bar"><i style="width:${Math.min(100, (s.n / first) * 100).toFixed(1)}%"></i></span>
    <span class="v"><b>${num(s.n)}</b><small>${i ? pct(s.n, steps[0].n, 1) : ""}</small></span></li>`)}</ol>`;
}
