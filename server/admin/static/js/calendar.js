// 예약 일정: a month of confirmed bookings, with the requests still waiting for a call shown dashed on the day they
// asked for. A day opens its list below (beside, on a wide screen).
import { $, html, icon, api, pill, phone, hm, kst, today, addDays, ymdParts, KINDS, skeleton, empty, errorBox, num } from "./lib.js";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export async function render(ctx) {
  const { page, setTitle, setActions, setQuery, signal } = ctx;
  setTitle("예약 일정");
  setActions(html`<a class="btn btn-sm" href="/admin/consults?status=booked">${icon("inbox", "i-sm")}예약 상담 목록</a>`);
  let month = /^\d{4}-\d{2}$/.test(ctx.query.get("m") || "") ? ctx.query.get("m") : today().slice(0, 7);
  let sel = /^\d{4}-\d{2}-\d{2}$/.test(ctx.query.get("d") || "") ? ctx.query.get("d") : today();
  let byDay = new Map();
  page.innerHTML = String(html`<div class="grid-main">
    <section class="panel"><div class="panel-body">
      <div class="cal-head">
        <button class="icon-btn" type="button" data-step="-1" aria-label="이전 달">${icon("chevron-left")}</button>
        <h2 data-month></h2>
        <button class="icon-btn" type="button" data-step="1" aria-label="다음 달">${icon("chevron-right")}</button>
        <button class="btn btn-sm" type="button" data-today>오늘</button>
        <span class="spacer"></span>
        <span class="legend hide-m"><span><i style="background:var(--violet)"></i>예약 확정</span><span><i style="border:1px dashed #98a2ad;background:transparent"></i>희망일 (연락 전)</span></span>
      </div>
      <div class="cal" data-cal>${skeleton(3)}</div>
    </div></section>
    <section class="panel" data-agenda></section>
  </div>`);
  const calEl = $("[data-cal]", page);
  const agendaEl = $("[data-agenda]", page);

  const drawAgenda = () => {
    const list = byDay.get(sel) || [];
    const p = ymdParts(sel);
    agendaEl.innerHTML = String(html`<div class="panel-head"><h2>${p.m}월 ${p.d}일 (${DOW[p.w]})</h2><span class="sub">${list.length ? `${num(list.length)}건` : ""}</span></div>
      ${p.w === 0 ? html`<div class="panel-body"><p class="muted small">일요일은 휴진입니다.</p></div>` : ""}
      ${list.length ? html`<ul class="agenda">${list.map((b) => html`<li class="${b.booked_at ? "" : "is-request"}">
          <span class="when">${b.booked_at ? hm(b.booked_at) : "희망"}<small>${b.booked_at ? "" : b.prefer_time || "시간 미정"}</small></span>
          <a class="who" href="/admin/consults/${b.id}"><strong>${b.name}</strong><span>${[b.interest, KINDS[b.kind], b.assignee_name && `담당 ${b.assignee_name}`].filter(Boolean).join(" · ")}</span></a>
          <span class="row" style="gap:6px">${pill(b.status)}<a class="icon-btn icon-btn-sm" href="tel:${b.phone}" aria-label="${b.name} 님에게 전화 (${phone(b.phone)})">${icon("phone", "i-sm")}</a></span></li>`)}</ul>`
        : p.w === 0 ? "" : empty("calendar", "이날 예약이 없습니다", "상담 화면에서 ‘예약 확정’을 누르고 날짜와 시간을 넣으면 여기에 보입니다.")}`);
  };

  const draw = async () => {
    const [y, m] = month.split("-").map(Number);
    $("[data-month]", page).textContent = `${y}년 ${m}월`;
    const first = `${month}-01`;
    const start = addDays(first, -ymdParts(first).w);
    const end = addDays(start, 41);
    let items;
    try { items = (await api(`/bookings?from=${start}&to=${end}`, { signal })).items; } catch (e) { if (e.name !== "AbortError") calEl.innerHTML = String(errorBox(e.message)); return; }
    byDay = new Map();
    items.forEach((b) => {
      const day = b.booked_at ? kst(b.booked_at).ymd : b.prefer_date;
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(b);
    });
    const t = today();
    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const day = addDays(start, i);
      const p = ymdParts(day);
      const list = byDay.get(day) || [];
      const cls = ["cal-day", day.slice(0, 7) !== month && "is-other", day === t && "is-today", day === sel && "is-sel", p.w === 0 && "is-sun"].filter(Boolean).join(" ");
      cells.push(html`<button type="button" class="${cls}" data-day="${day}" aria-pressed="${day === sel}" aria-label="${p.m}월 ${p.d}일${list.length ? `, ${list.length}건` : ""}">
        <span class="cal-n">${p.d}</span>
        ${list.slice(0, 3).map((b) => html`<span class="cal-ev ${b.booked_at ? `t-${b.status}` : "req"}">${b.booked_at ? `${hm(b.booked_at)} ` : "희망 "}${b.name}</span>`)}
        ${list.length > 3 ? html`<span class="cal-more">+${list.length - 3}건 더</span>` : ""}
        <span class="cal-dots" aria-hidden="true">${list.slice(0, 4).map((b) => html`<i class="${b.booked_at ? "" : "req"}"></i>`)}</span></button>`);
    }
    calEl.innerHTML = String(html`${DOW.map((d, i) => html`<div class="cal-dow${i === 0 ? " sun" : i === 6 ? " sat" : ""}">${d}</div>`)}${cells}`);
    drawAgenda();
  };

  page.addEventListener("click", (e) => {
    const day = e.target.closest("[data-day]");
    if (day) {
      sel = day.dataset.day;
      if (sel.slice(0, 7) !== month) { month = sel.slice(0, 7); setQuery({ m: month, d: sel }); draw(); return; }
      setQuery({ d: sel });
      calEl.querySelectorAll("[data-day]").forEach((b) => { const on = b.dataset.day === sel; b.classList.toggle("is-sel", on); b.setAttribute("aria-pressed", on); });
      drawAgenda();
      if (window.innerWidth < 1181) agendaEl.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const stepBtn = e.target.closest("[data-step]");
    if (stepBtn) {
      const [y, m] = month.split("-").map(Number);
      const d = new Date(Date.UTC(y, m - 1 + Number(stepBtn.dataset.step), 1));
      month = d.toISOString().slice(0, 7);
      setQuery({ m: month });
      draw();
    }
    if (e.target.closest("[data-today]")) { sel = today(); month = sel.slice(0, 7); setQuery({ m: "", d: "" }); draw(); }
  });
  await draw();
  const onNew = () => draw();
  window.addEventListener("admin:new-consult", onNew);
  return () => window.removeEventListener("admin:new-consult", onNew);
}
