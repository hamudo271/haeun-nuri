// 대시보드: who is waiting for a call (oldest first), today's and tomorrow's bookings, and the last two weeks.
import { $, html, icon, api, num, pct, dur, md, hm, ago, phone, KINDS, today, addDays, skeleton, empty, errorBox, pill, kst } from "./lib.js";
import { trend, trendLegend } from "./charts.js";

const late = (d) => {
  const min = (Date.now() - new Date(d)) / 60000;
  return min > 180 ? "is-very-late" : min > 60 ? "is-late" : "";
};

export async function render(ctx) {
  const { page, setTitle, setActions, signal } = ctx;
  setTitle("대시보드");
  setActions(html`<a class="btn btn-sm" href="/admin/consults/new">${icon("plus", "i-sm")}상담 직접 등록</a>`);
  page.innerHTML = String(skeleton(6));
  let d;
  let stop = null;
  const load = async () => {
    try { d = await api("/dashboard", { signal }); } catch (e) { if (e.name !== "AbortError") page.innerHTML = String(errorBox(e.message)); return; }
    const t = kst(Date.now());
    const tomorrow = addDays(today(), 1);
    const m = d.month;
    page.innerHTML = String(html`
      <div class="lead-line"><h2>${md(today())}</h2><span class="live${d.live ? "" : " is-zero"}">지금 홈페이지 ${num(d.live)}명</span>
        <span class="spacer"></span><span class="muted small">${t.hm} 기준</span></div>
      <div class="kpis">
        <a class="kpi${d.waiting.length ? " is-alert" : ""}" href="/admin/consults?status=new"><span class="kpi-label">${icon("inbox", "i-sm")}연락 기다림</span><span class="kpi-value">${num(d.waiting.length)}<small>건</small></span><span class="kpi-note">연락 중 ${num(d.contacting)}건</span></a>
        <a class="kpi" href="/admin/consults?from=${today()}&to=${today()}"><span class="kpi-label">${icon("plus", "i-sm")}오늘 들어온 상담</span><span class="kpi-value">${num(d.consultsToday)}<small>건</small></span><span class="kpi-note">이번 달 ${num(m.consults)}건</span></a>
        <a class="kpi" href="/admin/stats?p=today"><span class="kpi-label">${icon("users", "i-sm")}오늘 방문자</span><span class="kpi-value">${num(d.visitors)}<small>명</small></span><span class="kpi-note">방문 ${num(d.sessions)}회</span></a>
        <a class="kpi" href="/admin/calendar"><span class="kpi-label">${icon("calendar", "i-sm")}오늘·내일 예약</span><span class="kpi-value">${num(d.bookings.length)}<small>건</small></span><span class="kpi-note">이번 달 예약 ${num(m.booked)}건</span></a>
        <a class="kpi${d.smsWait ? " is-alert" : ""}" href="/admin/consults?reply=wait"><span class="kpi-label">${icon("message", "i-sm")}문자 답변 대기</span><span class="kpi-value">${num(d.smsWait || 0)}<small>건</small></span><span class="kpi-note">답하면 목록에서 체크</span></a>
        <div class="kpi"><span class="kpi-label">${icon("clock", "i-sm")}첫 연락까지</span><span class="kpi-value">${dur(d.responseSecs)}</span><span class="kpi-note">최근 30일 중앙값</span></div>
      </div>

      <div class="grid-main mt-20">
        <section class="panel">
          <div class="panel-head"><h2>바로 연락할 상담</h2><span class="sub">오래 기다린 순</span><a class="btn btn-sm btn-ghost" href="/admin/consults?status=new">전체 보기</a></div>
          ${d.waiting.length ? html`<ul class="wait-list">${d.waiting.map((c) => html`<li class="wait">
              <div class="wait-name">${c.read_at ? "" : html`<span class="dot-unread" title="아직 열어 보지 않음"></span>`}<a href="/admin/consults/${c.id}">${c.name}</a>
                ${c.repeat ? html`<span class="tag tag-warn">재문의 ${c.repeat}</span>` : ""}<span class="tag">${KINDS[c.kind]}</span>${c.interest ? html`<span class="tag tag-blue">${c.interest}</span>` : ""}</div>
              <div class="wait-meta">${phone(c.phone)} · ${c.prefer_date ? `희망 ${md(c.prefer_date)}${c.prefer_time ? ` ${c.prefer_time}` : ""} · ` : ""}${c.message || "내용 없음"}${c.channel ? ` · ${c.channel}` : ""}</div>
              <div class="wait-acts"><span class="age ${late(c.created_at)}" title="접수 ${hm(c.created_at)}">${ago(c.created_at)}</span>
                <a class="btn btn-sm" href="tel:${c.phone}">${icon("phone", "i-sm")}<span class="hide-m">전화</span></a>
                <a class="btn btn-sm btn-primary" href="/admin/consults/${c.id}">열기</a></div>
            </li>`)}</ul>` : empty("check", "기다리는 상담이 없습니다", "새 신청이 들어오면 여기에 가장 먼저 뜨고, 메뉴의 숫자로도 알려 드립니다.")}
        </section>

        <div class="stack">
          <section class="panel">
            <div class="panel-head"><h2>오늘과 내일 예약</h2><a class="btn btn-sm btn-ghost" href="/admin/calendar">일정 보기</a></div>
            ${d.bookings.length ? html`<ul class="agenda">${d.bookings.map((b) => html`<li>
                <span class="when">${hm(b.booked_at)}<small>${kst(b.booked_at).ymd === tomorrow ? "내일" : "오늘"}</small></span>
                <a class="who" href="/admin/consults/${b.id}"><strong>${b.name}</strong><span>${[b.interest, b.assignee_name && `담당 ${b.assignee_name}`].filter(Boolean).join(" · ") || phone(b.phone)}</span></a>
                ${pill(b.status)}</li>`)}</ul>` : empty("calendar", "잡힌 예약이 없습니다", "상담에서 ‘예약 확정’을 누르고 날짜와 시간을 넣으면 여기에 보입니다.")}
          </section>
          <section class="panel">
            <div class="panel-head"><h2>이번 달</h2><span class="sub">${t.m}월 1일부터</span></div>
            <div class="panel-body"><dl class="kv">
              <dt>상담 신청</dt><dd class="num"><strong>${num(m.consults)}</strong>건</dd>
              <dt>예약</dt><dd class="num"><strong>${num(m.booked)}</strong>건 <span class="muted">(${pct(m.booked, m.consults)})</span></dd>
              <dt>내원</dt><dd class="num"><strong>${num(m.visited)}</strong>건 <span class="muted">(${pct(m.visited, m.consults)})</span></dd>
              <dt>시술 진행</dt><dd class="num"><strong>${num(m.surgery)}</strong>건 <span class="muted">(${pct(m.surgery, m.consults)})</span></dd>
            </dl></div>
          </section>
        </div>
      </div>

      <div class="grid-main mt-20">
        <section class="panel">
          <div class="panel-head"><h2>최근 14일</h2>${trendLegend()}</div>
          <div class="panel-body"><div class="chart" data-trend></div></div>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>유입 채널</h2><span class="sub">최근 30일</span><a class="btn btn-sm btn-ghost" href="/admin/stats">자세히</a></div>
          ${d.channels.length ? html`<div class="table-wrap"><table class="tbl tbl-compact"><thead><tr><th>채널</th><th class="r">방문</th><th class="r">상담</th></tr></thead>
            <tbody>${d.channels.map((c) => html`<tr><td>${c.channel}</td><td class="r">${num(c.sessions)}</td><td class="r"><strong>${num(c.consults)}</strong></td></tr>`)}</tbody></table></div>`
            : empty("chart", "아직 모인 방문 기록이 없습니다", "홈페이지에 방문이 생기면 어디서 들어왔는지 여기에 쌓입니다.")}
        </section>
      </div>`);
    if (stop) stop();
    stop = trend($("[data-trend]", page), d.series.rows, { unit: d.series.unit, compact: true });
  };
  await load();
  const onNew = () => load();
  window.addEventListener("admin:new-consult", onNew);
  const every = setInterval(() => { if (document.visibilityState === "visible") load(); }, 120000);
  return () => { window.removeEventListener("admin:new-consult", onNew); clearInterval(every); if (stop) stop(); };
}
