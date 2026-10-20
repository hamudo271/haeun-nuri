// 유입 분석: where visitors come from and which of those sources end in a consultation, a booking and a treatment.
// Every number here comes from the site's own counter (no Google Analytics): a visit is 30 minutes of pages, a visitor
// one browser.
import { $, $$, html, icon, api, toast, num, pct, manwon, delta, today, addDays, md, skeleton, empty, errorBox, KINDS } from "./lib.js";
import { trend, trendLegend, bars, stack, heat, funnel, GROUP_COLORS } from "./charts.js";

const PRESETS = [["today", "오늘"], ["yesterday", "어제"], ["7", "7일"], ["30", "30일"], ["90", "90일"], ["custom", "직접"]];
function rangeOf(p, q) {
  const t = today();
  if (p === "today") return [t, t];
  if (p === "yesterday") return [addDays(t, -1), addDays(t, -1)];
  if (p === "7") return [addDays(t, -6), t];
  if (p === "90") return [addDays(t, -89), t];
  if (p === "custom" && /^\d{4}-\d{2}-\d{2}$/.test(q.get("from") || "") && /^\d{4}-\d{2}-\d{2}$/.test(q.get("to") || "")) return [q.get("from"), q.get("to")];
  return [addDays(t, -29), t];
}
const HIT_LABEL = { tel: "전화 버튼", kakao: "카카오톡 상담", map: "지도·길찾기", book: "예약 링크", sns: "SNS" };
const PAGES = [["/", "메인"], ["/sub/about/page01/", "진료시간"], ["/sub/about/page02/", "오시는 길"], ["/sub/about/page03/", "의료진 소개"], ["/sub/clinic/page01/", "자동차사고"], ["/sub/clinic/page02/", "척추관절"],
  ["/sub/clinic/page07/", "다이어트"], ["/sub/treatment/page01/", "약침치료"], ["/sub/treatment/page02/", "추나요법"], ["/sub/hospital/page01/", "입원실 안내"], ["/sub/media/page02/", "전문칼럼"], ["/sub/board/page01/", "해운누리 소식"]];
const UTM_PRESETS = [["인스타그램 프로필", "instagram", "social", "profile"], ["네이버 블로그 글", "naver", "blog", "blog_post"], ["카카오톡 채널 메시지", "kakao", "message", ""],
  ["당근 광고", "daangn", "cpc", ""], ["유튜브 설명란", "youtube", "social", "video"], ["QR 전단지", "qr", "offline", "flyer"]];

export async function render(ctx) {
  const { page, setTitle, setActions, setQuery, signal } = ctx;
  setTitle("유입 분석");
  setActions("");
  let preset = PRESETS.some(([k]) => k === ctx.query.get("p")) ? ctx.query.get("p") : "30";
  let [from, to] = rangeOf(preset, ctx.query);
  let heatMode = "visits";
  let chanSort = "sessions";
  let d = null;
  let stopTrend = null;

  page.innerHTML = String(html`
    <div class="lead-line">
      <div class="seg" data-presets role="group" aria-label="기간">${PRESETS.map(([k, l]) => html`<button type="button" data-p="${k}" aria-pressed="${preset === k}">${l}</button>`)}</div>
      <span class="row" data-custom ${preset === "custom" ? "" : "hidden"}><input class="input input-sm" type="date" data-from value="${from}" max="${today()}" aria-label="시작일" style="width:auto"> – <input class="input input-sm" type="date" data-to value="${to}" max="${today()}" aria-label="끝나는 날" style="width:auto"></span>
      <span class="spacer"></span><span class="live is-zero" data-live>지금 홈페이지 –명</span>
    </div>
    <div data-body>${skeleton(8)}</div>`);
  const body = $("[data-body]", page);

  const draw = () => {
    const s = d.summary;
    const p = d.previous;
    const clicks = (x) => (x.events.tel || 0) + (x.events.kakao || 0) + (x.events.book || 0);
    const groups = Object.values(d.channels.reduce((acc, c) => { (acc[c.grp] ||= { label: c.grp, n: 0 }).n += c.sessions; return acc; }, {})).filter((g) => g.n).sort((a, b) => b.n - a.n);
    const hasRevenue = d.channels.some((c) => c.revenue > 0);
    const chans = [...d.channels].sort((a, b) => b[chanSort] - a[chanSort] || b.sessions - a.sessions);
    const maxSessions = Math.max(1, ...d.channels.map((c) => c.sessions));
    const f = d.funnel;
    const period = d.from === d.to ? md(d.from) : `${md(d.from)} – ${md(d.to)}`;
    const noData = !s.sessions && !s.consults;
    body.innerHTML = String(html`
      <p class="muted small" style="margin:-8px 0 14px">${period} · 앞 기간(${md(d.prevFrom)} – ${md(d.prevTo)})과 비교</p>
      <div class="kpis">
        <div class="kpi"><span class="kpi-label">방문자</span><span class="kpi-value">${num(s.visitors)}<small>명</small></span>${delta(s.visitors, p.visitors)}</div>
        <div class="kpi"><span class="kpi-label">방문</span><span class="kpi-value">${num(s.sessions)}<small>회</small></span><span class="kpi-note">새 방문 ${pct(s.new_sessions, s.sessions, 0)} · ${delta(s.sessions, p.sessions)}</span></div>
        <div class="kpi"><span class="kpi-label">페이지뷰</span><span class="kpi-value">${num(s.pageviews)}</span><span class="kpi-note">방문당 ${s.sessions ? (s.pageviews / s.sessions).toFixed(1) : "–"}쪽 · 이탈 ${pct(s.bounces, s.sessions, 0)}</span></div>
        <div class="kpi is-alert"><span class="kpi-label">상담 신청</span><span class="kpi-value">${num(s.consults)}<small>건</small></span><span class="kpi-note">전환율 ${pct(s.web, s.sessions, 2)} · ${delta(s.consults, p.consults)}</span></div>
        <div class="kpi"><span class="kpi-label">예약 · 내원</span><span class="kpi-value">${num(s.booked)}<small> / ${num(s.visited)}</small></span><span class="kpi-note">시술 진행 ${num(s.surgery)}건${s.revenue ? ` · ${manwon(s.revenue)}` : ""}</span></div>
        <div class="kpi"><span class="kpi-label">전화·카톡·예약 클릭</span><span class="kpi-value">${num(clicks(s))}<small>번</small></span>${delta(clicks(s), clicks(p))}</div>
      </div>
      ${noData ? html`<div class="note-box" style="margin-top:16px">${icon("info")}<span>이 기간에는 아직 모인 기록이 없습니다. 홈페이지에 방문이 생기면 바로 쌓이기 시작합니다. 병원 직원이 로그인한 채로 보는 홈페이지와, 설정에서 뺀 IP는 세지 않습니다.</span></div>` : ""}

      <section class="panel mt-20">
        <div class="panel-head"><h2>${d.series.unit === "hour" ? "시간대별" : "날짜별"} 방문과 상담</h2>${trendLegend()}</div>
        <div class="panel-body"><div class="chart" data-trend></div></div>
      </section>

      <section class="panel mt-20">
        <div class="panel-head"><h2>유입 채널</h2><span class="sub hide-m">채널을 누르면 그 채널에서 온 상담을 봅니다</span>
          <div class="seg" role="group" aria-label="정렬"><button type="button" data-sort="sessions" aria-pressed="${chanSort === "sessions"}">방문순</button><button type="button" data-sort="consults" aria-pressed="${chanSort === "consults"}">상담순</button></div></div>
        ${groups.length ? html`<div class="panel-body" style="padding-bottom:6px">${stack(groups)}</div>` : ""}
        ${chans.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>채널</th><th>방문</th><th class="r hide-m">이탈</th><th class="r">상담</th><th class="r">전환율</th><th class="r hide-m">예약</th><th class="r hide-m">내원</th><th class="r hide-m">시술</th>${hasRevenue ? html`<th class="r hide-m">금액</th>` : ""}</tr></thead>
          <tbody>${chans.map((c) => html`<tr>
            <td><div class="cell-main"><i style="width:8px;height:8px;border-radius:2px;flex:none;background:${GROUP_COLORS[c.grp] || "#9aa3ad"}" aria-hidden="true"></i><a class="nowrap" href="/admin/consults?channel=${encodeURIComponent(c.channel)}"><strong>${c.channel}</strong></a></div><div class="cell-sub">${c.grp}</div></td>
            <td><div class="bar-cell"><span class="bar"><i style="width:${((c.sessions / maxSessions) * 100).toFixed(1)}%"></i></span><span class="v">${num(c.sessions)}</span></div></td>
            <td class="r hide-m">${pct(c.bounces, c.sessions, 0)}</td>
            <td class="r"><strong>${num(c.consults)}</strong></td>
            <td class="r">${c.sessions ? pct(c.consults, c.sessions, 1) : "–"}</td>
            <td class="r hide-m">${num(c.booked)}</td><td class="r hide-m">${num(c.visited)}</td><td class="r hide-m">${num(c.surgery)}</td>
            ${hasRevenue ? html`<td class="r hide-m">${c.revenue ? manwon(c.revenue) : "–"}</td>` : ""}</tr>`)}</tbody></table></div>`
          : empty("chart", "아직 채널 기록이 없습니다")}
      </section>

      <div class="grid-2 mt-20">
        <section class="panel"><div class="panel-head"><h2>검색어</h2><span class="sub">검색·광고에서 넘어온 말</span></div>
          ${d.keywords.length ? html`<div class="table-wrap"><table class="tbl tbl-compact"><thead><tr><th>검색어</th><th>채널</th><th class="r">방문</th><th class="r">상담</th></tr></thead>
            <tbody>${d.keywords.map((k) => html`<tr><td><strong>${k.keyword}</strong></td><td class="muted">${k.channel}</td><td class="r">${num(k.sessions)}</td><td class="r">${num(k.consults)}</td></tr>`)}</tbody></table></div>`
            : empty("search", "잡힌 검색어가 없습니다", "네이버·구글은 검색어를 대부분 감춥니다. 광고 링크에 검색어 태그(n_keyword, utm_term)를 달면 여기에 보입니다.")}</section>
        <section class="panel"><div class="panel-head"><h2>캠페인 링크 (UTM)</h2></div>
          ${d.campaigns.length ? html`<div class="table-wrap"><table class="tbl tbl-compact"><thead><tr><th>소스 / 매체</th><th>캠페인</th><th class="r">방문</th><th class="r">상담</th></tr></thead>
            <tbody>${d.campaigns.map((c) => html`<tr><td>${[c.source, c.medium].filter(Boolean).join(" / ") || "–"}</td><td>${c.campaign || "–"}</td><td class="r">${num(c.sessions)}</td><td class="r">${num(c.consults)}</td></tr>`)}</tbody></table></div>`
            : empty("link", "캠페인 링크로 들어온 방문이 없습니다", "아래 ‘캠페인 링크 만들기’로 만든 주소를 인스타그램, 블로그, 전단지 QR에 쓰면 어디서 왔는지 정확히 나뉩니다.")}</section>
      </div>

      <section class="panel mt-20">
        <div class="panel-head"><h2>유입 URL</h2><span class="sub">다른 사이트가 알려 주는 만큼의 주소 · 대부분은 사이트 주소까지만 옵니다</span></div>
        ${d.refUrls.length ? html`<div class="table-wrap"><table class="tbl tbl-compact"><thead><tr><th>들어온 주소</th><th class="hide-m">채널</th><th class="r">방문</th><th class="r">상담</th></tr></thead>
          <tbody>${d.refUrls.map((u) => html`<tr><td class="wrap">${/^https?:\/\//.test(u.ref_url) ? html`<a href="${u.ref_url}" target="_blank" rel="noopener noreferrer" title="${u.ref_url}" style="word-break:break-all">${u.ref_url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 90)}</a>` : u.ref_url.slice(0, 90)}</td><td class="hide-m muted nowrap">${u.channel}</td><td class="r">${num(u.sessions)}</td><td class="r">${num(u.consults)}</td></tr>`)}</tbody></table></div>`
          : empty("link", "다른 사이트에서 들어온 기록이 없습니다", "검색, 블로그, SNS 같은 다른 사이트의 링크를 눌러 들어오면 그 주소가 여기에 쌓입니다. 앱(카카오톡, 인스타그램)에서 열면 주소가 남지 않는 경우가 많습니다.")}
      </section>

      <div class="grid-main mt-20">
        <section class="panel"><div class="panel-head"><h2>상담 통계</h2><span class="sub">종류별 · 이 기간</span></div>
          ${d.kinds.length ? html`<div class="table-wrap"><table class="tbl tbl-compact"><thead><tr><th>종류</th><th class="r">신청</th><th class="r">연락 대기</th><th class="r">예약</th><th class="r">내원</th><th class="r">시술</th></tr></thead>
            <tbody>${d.kinds.map((k) => html`<tr><td><a href="/admin/consults?kind=${k.kind}&from=${d.from}&to=${d.to}">${KINDS[k.kind] || k.kind}</a></td><td class="r"><strong>${num(k.n)}</strong></td><td class="r">${num(k.waiting)}</td><td class="r">${num(k.booked)}</td><td class="r">${num(k.visited)}</td><td class="r">${num(k.surgery)}</td></tr>`)}</tbody>
            <tfoot><tr><td><strong>합계</strong></td>${["n", "waiting", "booked", "visited", "surgery"].map((f) => html`<td class="r"><strong>${num(d.kinds.reduce((a, k) => a + k[f], 0))}</strong></td>`)}</tr></tfoot></table></div>`
            : empty("inbox", "이 기간에 들어온 상담이 없습니다")}</section>
        <section class="panel"><div class="panel-head"><h2>월별 상담</h2><span class="sub">최근 12개월</span></div>
          <div class="panel-body">${d.months.length ? bars(Object.values(d.months.reduce((acc, m) => { (acc[m.month] ||= { label: `${Number(m.month.slice(0, 4))}년 ${Number(m.month.slice(5))}월`, n: 0 }).n += m.n; return acc; }, {})), { color: "#e09a2e", text: (r) => `${num(r.n)}건` })
            : empty("chart", "기록이 없습니다")}</div></section>
      </div>

      <section class="panel mt-20">
        <div class="panel-head"><h2>상담까지 가는 길</h2><span class="sub">이 기간의 방문 기준</span></div>
        <div class="panel-body">${funnel([
          { label: "방문", n: s.sessions }, { label: "시술 페이지를 봄", n: f.treatment }, { label: "상담·예약 페이지", n: f.counsel },
          { label: "전화·카톡·신청서", n: Math.max(f.contact, f.form) }, { label: "상담 신청", n: s.web }, { label: "예약", n: s.booked }, { label: "내원", n: s.visited }, { label: "시술 진행", n: s.surgery },
        ])}<p class="help" style="margin-top:10px">오른쪽 비율은 전체 방문 대비입니다. 예약·내원·시술은 이 기간에 들어온 상담이 지금 어느 단계에 있는지로 셉니다(직접 등록한 상담 포함).</p></div>
      </section>

      <div class="grid-2 mt-20">
        <section class="panel"><div class="panel-head"><h2>처음 들어온 페이지</h2></div>
          ${d.landings.length ? html`<div class="table-wrap"><table class="tbl tbl-compact"><thead><tr><th>페이지</th><th class="r">방문</th><th class="r">이탈</th><th class="r">상담</th></tr></thead>
            <tbody>${d.landings.map((r) => html`<tr><td><a href="${r.path}" target="_blank" rel="noopener">${r.title}</a></td><td class="r">${num(r.sessions)}</td><td class="r">${pct(r.bounces, r.sessions, 0)}</td><td class="r">${num(r.consults)}</td></tr>`)}</tbody></table></div>` : empty("file", "기록이 없습니다")}</section>
        <section class="panel"><div class="panel-head"><h2>많이 본 페이지</h2></div>
          ${d.pages.length ? html`<div class="table-wrap"><table class="tbl tbl-compact"><thead><tr><th>페이지</th><th class="r">조회</th><th class="r">방문</th></tr></thead>
            <tbody>${d.pages.map((r) => html`<tr><td><a href="${r.path}" target="_blank" rel="noopener">${r.title}</a></td><td class="r">${num(r.views)}</td><td class="r">${num(r.sessions)}</td></tr>`)}</tbody></table></div>` : empty("file", "기록이 없습니다")}</section>
      </div>

      <div class="grid-3 mt-20">
        <section class="panel"><div class="panel-head"><h2>기기</h2></div><div class="panel-body">${d.devices.length ? bars(d.devices, { text: (r) => pct(r.n, s.sessions, 0) }) : empty("smartphone", "기록이 없습니다")}</div></section>
        <section class="panel"><div class="panel-head"><h2>브라우저 · 앱</h2></div><div class="panel-body">${d.browsers.length ? bars(d.browsers, { text: (r) => pct(r.n, s.sessions, 0) }) : empty("globe", "기록이 없습니다")}</div></section>
        <section class="panel"><div class="panel-head"><h2>관심 부위</h2><span class="sub">상담 기준</span></div><div class="panel-body">${d.interests.length ? bars(d.interests, { color: "#e09a2e" }) : empty("inbox", "상담이 없습니다")}</div></section>
      </div>

      <div class="grid-main mt-20">
        <section class="panel"><div class="panel-head"><h2>요일 · 시간대</h2>
          <div class="seg" role="group" aria-label="보기"><button type="button" data-heat="visits" aria-pressed="${heatMode === "visits"}">방문</button><button type="button" data-heat="consults" aria-pressed="${heatMode === "consults"}">상담</button></div></div>
          <div class="panel-body">${heat(heatMode === "visits" ? d.heat : d.heatConsults, heatMode === "visits" ? "#1874b8" : "#e09a2e")}
            <p class="help" style="margin-top:10px">상담이 몰리는 시간에 전화를 받을 사람이 있는지 확인해 보세요.</p></div></section>
        <section class="panel"><div class="panel-head"><h2>누른 버튼</h2><span class="sub">어느 페이지에서</span></div>
          ${d.clicks.length ? html`<div class="table-wrap"><table class="tbl tbl-compact"><thead><tr><th>버튼</th><th>페이지</th><th class="r">횟수</th></tr></thead>
            <tbody>${d.clicks.map((c) => html`<tr><td>${HIT_LABEL[c.kind] || c.kind}</td><td class="muted">${c.title}</td><td class="r">${num(c.n)}</td></tr>`)}</tbody></table></div>`
            : empty("phone", "눌린 버튼이 없습니다", "전화, 카카오톡 상담, 지도, 예약 링크를 누르면 여기에 셉니다.")}</section>
      </div>

      <section class="panel mt-20" id="utm">
        <div class="panel-head"><h2>캠페인 링크 만들기</h2><span class="sub hide-m">광고·SNS·전단지마다 다른 주소를 쓰면 채널이 정확히 나뉩니다</span></div>
        <div class="panel-body stack">
          <div class="chips">${UTM_PRESETS.map(([l], i) => html`<button class="chip" type="button" data-utm="${i}">${l}</button>`)}</div>
          <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
            <div class="field"><label for="u-page">연결할 페이지</label><select class="select" id="u-page">${PAGES.map(([p, l]) => html`<option value="${p}">${l}</option>`)}</select></div>
            <div class="field"><label for="u-src">소스 (어디서)</label><input class="input" id="u-src" placeholder="instagram" autocomplete="off"></div>
            <div class="field"><label for="u-med">매체 (어떻게)</label><input class="input" id="u-med" placeholder="social, cpc, qr" autocomplete="off"></div>
            <div class="field"><label for="u-cmp">캠페인 이름</label><input class="input" id="u-cmp" placeholder="2026_10_교통사고_블로그" autocomplete="off"></div>
          </div>
          <div class="utm-out"><input class="input" id="u-out" readonly aria-label="만든 주소"><button class="btn btn-primary" type="button" data-copy-utm>${icon("copy", "i-sm")}복사</button></div>
          <p class="help">매체에 <code>cpc</code>, <code>paid</code>, <code>ad</code>를 쓰면 ‘광고’로 따로 모읍니다. 소스는 영문 소문자로 맞춰 쓰는 것이 좋습니다.</p>
        </div>
      </section>`);
    if (stopTrend) stopTrend();
    stopTrend = trend($("[data-trend]", body), d.series.rows, { unit: d.series.unit });
    const live = $("[data-live]", page);
    live.textContent = `지금 홈페이지 ${num(d.live.now)}명`;
    live.classList.toggle("is-zero", !d.live.now);
    live.title = d.live.pages.map((x) => `${x.title} ${x.n}`).join("\n");
    wireUtm();
  };

  const wireUtm = () => {
    const f = { page: $("#u-page", body), src: $("#u-src", body), med: $("#u-med", body), cmp: $("#u-cmp", body), out: $("#u-out", body) };
    const make = () => {
      const u = new URL(f.page.value, location.origin);
      const clean = (v) => v.trim().replace(/\s+/g, "_");
      if (f.src.value.trim()) u.searchParams.set("utm_source", clean(f.src.value).toLowerCase());
      if (f.med.value.trim()) u.searchParams.set("utm_medium", clean(f.med.value).toLowerCase());
      if (f.cmp.value.trim()) u.searchParams.set("utm_campaign", clean(f.cmp.value));
      f.out.value = f.src.value.trim() ? u.toString() : "";
      f.out.placeholder = "소스를 넣으면 주소가 만들어집니다";
    };
    ["change", "input"].forEach((ev) => [f.page, f.src, f.med, f.cmp].forEach((x) => x.addEventListener(ev, make)));
    $$("[data-utm]", body).forEach((b) => b.addEventListener("click", () => {
      const [, so, me, ca] = UTM_PRESETS[Number(b.dataset.utm)];
      f.src.value = so; f.med.value = me; f.cmp.value = ca; make(); f.cmp.focus();
    }));
    $("[data-copy-utm]", body).addEventListener("click", async () => {
      if (!f.out.value) { f.src.focus(); return; }
      try { await navigator.clipboard.writeText(f.out.value); toast("주소를 복사했습니다."); } catch { f.out.select(); }
    });
    make();
  };

  const load = async () => {
    try { d = await api(`/stats?from=${from}&to=${to}`, { signal }); } catch (e) { if (e.name !== "AbortError") body.innerHTML = String(errorBox(e.message)); return; }
    draw();
  };
  page.addEventListener("click", (e) => {
    const p = e.target.closest("[data-p]");
    if (p) {
      preset = p.dataset.p;
      $$("[data-p]", page).forEach((b) => b.setAttribute("aria-pressed", b === p));
      $("[data-custom]", page).hidden = preset !== "custom";
      if (preset === "custom") { setQuery({ p: "custom", from, to }); return; }
      [from, to] = rangeOf(preset, new URLSearchParams());
      setQuery({ p: preset === "30" ? "" : preset, from: "", to: "" });
      body.innerHTML = String(skeleton(8));
      load();
      return;
    }
    const s = e.target.closest("[data-sort]");
    if (s) { chanSort = s.dataset.sort; draw(); return; }
    const h = e.target.closest("[data-heat]");
    if (h) { heatMode = h.dataset.heat; draw(); }
  });
  $$("[data-from], [data-to]", page).forEach((i) => i.addEventListener("change", () => {
    const a = $("[data-from]", page).value;
    const b = $("[data-to]", page).value;
    if (!a || !b || a > b) return;
    from = a; to = b;
    setQuery({ p: "custom", from, to });
    load();
  }));
  await load();
  // only the "지금" count refreshes by itself; the rest stays as read (and the link builder keeps what was typed)
  const every = setInterval(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const l = await api("/stats/live", { signal });
      const live = $("[data-live]", page);
      live.textContent = `지금 홈페이지 ${num(l.now)}명`;
      live.classList.toggle("is-zero", !l.now);
      live.title = l.pages.map((x) => `${x.title} ${x.n}`).join("\n");
    } catch { /* next time */ }
  }, 30000);
  return () => { clearInterval(every); if (stopTrend) stopTrend(); };
}
