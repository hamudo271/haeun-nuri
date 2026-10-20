// 상담 관리: the list with its filters, one consultation beside it (or on its own page on a phone), and the form for a
// consultation that came by phone, in person or by KakaoTalk.
import {
  $, $$, html, raw, icon, api, toast, confirmBox, lightbox, busy, debounce,
  STATUS, FLOW, SIDE, KINDS, INTERESTS, MANUAL, pill, phone, num, won, short, full, ago, md, hm, kst, today, addDays, skeleton, empty, errorBox,
} from "./lib.js";

// where it came from: the old admin's separate boards, as tabs over the list (server: SOURCES in consult.js)
const SRC_TABS = [["", "전체", ""], ["web", "홈페이지", " 문의"], ["model", "리얼모델", " 신청"], ["manual", "카톡·전화", " 기록"]];  // the tail drops on a phone
const WEB_KINDS = ["tel", "sms", "cost", "booking", "event", "online"];
const SRC_EMPTY = {
  web: ["inbox", "홈페이지로 들어온 문의가 없습니다", "전화 상담·문자 상담·비용 상담·예약 신청·이벤트 신청서와 예전 온라인 상담 게시판의 문의가 여기에 모입니다."],
  model: ["user", "리얼모델 신청이 없습니다", "홈페이지 리얼모델 신청서로 들어온 신청이 여기에 모입니다."],
  manual: ["message", "카톡·전화로 받은 상담 기록이 없습니다", "카카오톡 채널 대화와 전화 상담은 홈페이지에 저절로 쌓이지 않습니다. 위의 ‘직접 등록’에서 들어온 경로를 고르고 남기면 이 탭에 모입니다."],
};
const TABS = [["", "전체"], ["new", "신규"], ["contacting", "연락 중"], ["booked", "예약 확정"], ["visited", "내원"], ["surgery", "시술 진행"], ["hold", "보류"], ["closed", "상담 종료"], ["noshow", "노쇼"], ["canceled", "취소"], ["spam", "스팸"]];
const PERIODS = [["", "전체 기간"], ["today", "오늘"], ["7", "최근 7일"], ["30", "최근 30일"], ["month", "이번 달"]];
const GROUPS = ["검색", "광고", "지도", "블로그·카페", "SNS", "메신저", "성형앱", "AI 검색", "캠페인", "기타 사이트", "직접 방문", "직접 등록", "예전 사이트"];
const SLOTS = (() => { const out = []; for (let h = 9; h <= 19; h += 1) for (const m of ["00", "30"]) if (!(h === 19 && m === "30")) out.push(`${String(h).padStart(2, "0")}:${m}`); return out; })();
const HIT = { tel: "전화 버튼을 눌렀습니다", kakao: "카카오톡 상담을 열었습니다", map: "지도·길찾기를 열었습니다", book: "예약 링크를 열었습니다", sns: "SNS 링크를 열었습니다", out: "다른 사이트로 나갔습니다", form: "신청서를 쓰기 시작했습니다", consult: "상담을 신청했습니다" };
const TL_ICON = { note: "message", status: "activity", assign: "user", booking: "calendar", edit: "pencil", system: "info" };

let USERS = null;
const users = async () => (USERS ||= (await api("/users/names")).users);

function range(p) {
  const t = today();
  if (p === "today") return { from: t, to: t };
  if (p === "7") return { from: addDays(t, -6), to: t };
  if (p === "30") return { from: addDays(t, -29), to: t };
  if (p === "month") return { from: `${t.slice(0, 8)}01`, to: t };
  return {};
}
const readQuery = (q) => ({ status: q.get("status") || "", reply: q.get("reply") || "", kind: q.get("kind") || "", grp: q.get("grp") || "", channel: q.get("channel") || "", assignee: q.get("assignee") || "", q: q.get("q") || "", period: q.get("period") || "", from: q.get("from") || "", to: q.get("to") || "" });
function apiQuery(f, pageNo = 1) {
  const p = new URLSearchParams();
  const r = f.from || f.to ? { from: f.from, to: f.to } : range(f.period);
  for (const [k, v] of Object.entries({ status: f.status, reply: f.reply, kind: f.kind, grp: f.grp, channel: f.channel, assignee: f.assignee, q: f.q, ...r })) if (v) p.set(k, v);
  if (pageNo > 1) p.set("page", pageNo);
  return p;
}
const bookedISO = (date, time) => (date && time ? `${date}T${time}:00+09:00` : null);
// 문자 상담 only: answered or still waiting
const replyChip = (c, button = true) => {
  if (c.kind !== "sms") return "";
  const done = !!c.replied_at;
  const label = done ? "답변 완료" : "답변 대기";
  const title = done ? `${full(c.replied_at)}${c.replied_by ? ` · ${c.replied_by}` : ""} 답변 완료 (누르면 대기로 되돌립니다)` : "문자로 답한 뒤 누르면 답변 완료로 바뀝니다";
  return button
    ? html`<button type="button" class="reply-chip ${done ? "is-done" : "is-wait"}" data-reply="${c.id}" aria-pressed="${done}" title="${title}">${icon(done ? "check" : "clock", "i-sm")}${label}</button>`
    : html`<span class="reply-chip ${done ? "is-done" : "is-wait"}">${icon(done ? "check" : "clock", "i-sm")}${label}</span>`;
};

/* ---------- the list, and a consultation beside it ---------- */
export async function render(ctx) {
  const { page, setTitle, setActions, me, signal } = ctx;
  setTitle("상담 관리");
  let f = readQuery(ctx.query);
  let items = [];
  let total = 0;
  let pageNo = 1;
  let counts = {};
  let detailId = ctx.params[0] ? Number(ctx.params[0]) : null;
  let loading = null;

  const actions = () => setActions(html`${me.role === "owner" ? html`<a class="btn btn-sm hide-m" data-export href="/api/admin/consults/export.csv?${apiQuery(f).toString()}" download title="지금 목록의 조건 그대로, 메모까지 모두 담습니다">${icon("download", "i-sm")}CSV 내려받기${total ? html` <span class="muted">${num(total)}건</span>` : ""}</a>` : ""}
    <a class="btn btn-sm btn-primary" href="/admin/consults/new">${icon("plus", "i-sm")}<span>직접 등록</span></a>`);
  actions();
  const list = await users().catch(() => []);
  page.innerHTML = String(html`<div class="split${detailId ? " has-detail" : ""}" data-split>
    <div class="list-pane">
      <div class="src-tabs" data-src role="group" aria-label="받은 곳"></div>
      <div class="filters">
        <label class="search"><span class="sr-only">검색</span>${icon("search", "i-sm")}<input class="input" type="search" data-q placeholder="이름, 전화번호, 내용, 메모" value="${f.q}"></label>
        <select class="select" data-f="period" aria-label="기간">${PERIODS.map(([v, l]) => html`<option value="${v}" ${f.period === v ? "selected" : ""}>${l}</option>`)}</select>
        <select class="select" data-f="kind" aria-label="종류"><option value="">모든 종류</option><option value="web" ${f.kind === "web" ? "selected" : ""}>홈페이지 문의 전체</option>${Object.entries(KINDS).map(([v, l]) => html`<option value="${v}" ${f.kind === v ? "selected" : ""}>${l}</option>`)}</select>
        <select class="select" data-f="grp" aria-label="유입"><option value="">모든 유입</option>${GROUPS.map((g) => html`<option ${f.grp === g ? "selected" : ""}>${g}</option>`)}</select>
        <select class="select" data-f="assignee" aria-label="담당"><option value="">모든 담당</option><option value="me" ${f.assignee === "me" ? "selected" : ""}>내 담당</option><option value="none" ${f.assignee === "none" ? "selected" : ""}>담당 없음</option>
          ${list.filter((u) => u.active).map((u) => html`<option value="${u.id}" ${String(f.assignee) === String(u.id) ? "selected" : ""}>${u.name}</option>`)}</select>
      </div>
      <div class="reply-bar" data-reply-bar hidden></div>
      ${f.channel ? html`<p class="row small" style="margin:-4px 0 12px"><span class="tag tag-blue">${f.channel}</span><a class="muted" href="#" data-clear-channel>채널 거르기 해제</a></p>` : ""}
      <div class="seg" data-tabs role="group" aria-label="상태" style="margin-bottom:14px"></div>
      <div data-list>${skeleton(5)}</div>
    </div>
    <div class="detail-pane" data-detail></div>
  </div>`);
  const split = $("[data-split]", page);
  const tabsEl = $("[data-tabs]", page);
  const listEl = $("[data-list]", page);
  const detailEl = $("[data-detail]", page);

  const replyBar = $("[data-reply-bar]", page);
  const drawReply = (r) => {
    if (!r || (!r.wait && !r.done)) { replyBar.hidden = true; return; }
    replyBar.hidden = false;
    replyBar.innerHTML = String(html`<span class="reply-bar-label">${icon("message", "i-sm")}문자 상담</span>
      <button type="button" data-reply-filter="wait" aria-pressed="${f.reply === "wait"}" class="${r.wait ? "has-wait" : ""}">답변 대기 <b>${num(r.wait)}</b></button>
      <button type="button" data-reply-filter="done" aria-pressed="${f.reply === "done"}">답변 완료 <b>${num(r.done)}</b></button>
      ${f.reply ? html`<button type="button" class="btn btn-sm btn-ghost" data-reply-filter="">모두 보기</button>` : ""}`);
  };
  const srcEl = $("[data-src]", page);
  const drawSrc = (s) => {
    if (!s) return;
    const cur = WEB_KINDS.includes(f.kind) ? "web" : SRC_TABS.some(([k]) => k === f.kind) ? f.kind : "";
    srcEl.innerHTML = String(html`${SRC_TABS.map(([v, l, tail]) => html`<button type="button" data-src-tab="${v}" aria-pressed="${v === cur}">${l}${tail ? html`<span class="src-tail">${tail}</span>` : ""}<span class="n">${num(v ? s[v] : s.all)}</span></button>`)}`);
  };
  const drawTabs = () => {
    const all = Object.entries(counts).filter(([k]) => k !== "spam").reduce((s, [, n]) => s + n, 0);
    tabsEl.innerHTML = String(html`${TABS.map(([v, l]) => html`<button type="button" data-tab="${v}" aria-pressed="${f.status === v}">${l}<span class="n">${num(v ? counts[v] || 0 : all)}</span></button>`)}`);
  };
  const row = (c) => html`<tr class="is-link${c.read_at ? "" : " is-unread"}${c.id === detailId ? " is-current" : ""}" data-id="${c.id}">
      <td class="nowrap"><div class="cell-main">${c.read_at ? "" : html`<span class="dot-unread" title="아직 열어 보지 않음"></span>`}<span>${short(c.created_at)}</span></div><div class="cell-sub">${ago(c.created_at)}</div></td>
      <td><div class="cell-main"><a href="/admin/consults/${c.id}"><strong>${c.name}</strong></a>${c.repeat ? html`<span class="tag tag-warn" title="같은 번호로 들어온 다른 상담">재문의 ${c.repeat}</span>` : ""}${c.files ? html`<span class="tag" title="사진">${icon("image", "i-sm")}${c.files}</span>` : ""}${c.notes ? html`<span class="tag" title="메모">${icon("message", "i-sm")}${c.notes}</span>` : ""}</div>
        <div class="cell-sub">${c.message || (c.prefer_date ? `희망 ${md(c.prefer_date)} ${c.prefer_time || ""}` : "")}</div></td>
      <td class="nowrap">${c.phone ? phone(c.phone) : html`<span class="muted">–</span>`}</td>
      <td><div>${KINDS[c.kind] || c.kind}</div><div class="cell-sub">${[c.topic, c.interest].filter(Boolean).join(" · ")}</div>${c.kind === "sms" ? html`<div class="reply-cell">${replyChip(c)}${c.sms_opened_at ? html`<span class="tag" title="고객 휴대폰에서 문자 앱이 열렸습니다">문자 앱 열림</span>` : ""}</div>` : ""}</td>
      <td><div>${c.channel || "–"}</div><div class="cell-sub">${c.keyword ? `“${c.keyword}”` : c.grp !== c.channel ? c.grp || "" : ""}</div></td>
      <td><select class="select select-sm t-${c.status}" data-quick="${c.id}" aria-label="${c.name} 님 상태">${Object.entries(STATUS).map(([k, l]) => html`<option value="${k}" ${k === c.status ? "selected" : ""}>${l}</option>`)}</select>
        ${c.booked_at ? html`<div class="cell-sub">${md(c.booked_at)} ${hm(c.booked_at)}</div>` : ""}</td>
      <td class="nowrap">${c.assignee_name || html`<span class="muted">–</span>`}</td></tr>`;
  const card = (c) => html`<a class="ccard${c.read_at ? "" : " is-unread"}${c.id === detailId ? " is-current" : ""}" href="/admin/consults/${c.id}${location.search}" data-id="${c.id}" ${c.id === detailId ? raw('aria-current="true"') : ""}>
      <div class="ccard-top">${c.read_at ? "" : html`<span class="dot-unread"></span>`}<strong>${c.name}</strong>${c.repeat ? html`<span class="tag tag-warn">재문의 ${c.repeat}</span>` : ""}<span class="spacer"></span>${replyChip(c, false)}${pill(c.status)}</div>
      <div class="ccard-meta">${[KINDS[c.kind] || c.kind, c.topic, c.interest, c.channel].filter(Boolean).join(" · ")} · ${ago(c.created_at)}</div>
      ${c.message ? html`<div class="ccard-msg">${c.message}</div>` : ""}</a>`;
  const drawList = () => {
    if (!items.length) {
      listEl.innerHTML = String(html`<div class="panel">${f.q || f.kind || f.grp || f.channel || f.assignee || f.period || f.status || f.reply
        ? empty("search", "조건에 맞는 상담이 없습니다", "검색어나 거르기를 바꿔 보세요.")
        : empty("inbox", "아직 들어온 상담이 없습니다", "홈페이지의 전화 상담·문자 상담·예약 신청·리얼모델 신청이 여기에 모입니다. 전화나 카카오톡으로 받은 상담은 ‘직접 등록’으로 남기세요.")}</div>`);
      const only = SRC_EMPTY[f.kind] && !(f.q || f.grp || f.channel || f.assignee || f.period || f.status || f.reply);
      if (only) listEl.innerHTML = String(html`<div class="panel">${empty(...SRC_EMPTY[f.kind])}</div>`);
      return;
    }
    const compact = split.classList.contains("has-detail");
    listEl.innerHTML = String(html`
      <div class="panel hide-m${compact ? " col-hide" : ""}"><div class="table-wrap"><table class="tbl"><thead><tr><th>접수</th><th>이름</th><th>연락처</th><th>종류·관심</th><th>유입</th><th>상태</th><th>담당</th></tr></thead>
        <tbody>${items.map(row)}</tbody></table></div></div>
      <div class="ccards ${compact ? "" : "show-m"}">${items.map(card)}</div>
      ${items.length < total ? html`<div class="more-row"><button class="btn" type="button" data-more>더 보기 <span class="muted">(${num(total - items.length)}건 남음)</span></button></div>` : html`<p class="more-row muted small">모두 ${num(total)}건</p>`}`);
  };
  const load = async (more = false) => {
    if (loading) loading.abort();
    loading = new AbortController();
    const mine = loading;
    pageNo = more ? pageNo + 1 : 1;
    try {
      const r = await api(`/consults?${apiQuery(f, pageNo)}`, { signal: mine.signal });
      items = more ? items.concat(r.items) : r.items;
      total = r.total;
      counts = r.counts;
      if (!more) actions(); // the CSV button carries the count of what it will hold
      drawSrc(r.sources);
      drawReply(r.reply);
      drawTabs();
      drawList();
    } catch (e) { if (e.name !== "AbortError") listEl.innerHTML = String(errorBox(e.message)); }
  };
  const syncUrl = () => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
    history.replaceState(null, "", `${location.pathname}${p.toString() ? `?${p}` : ""}`);
    actions();
  };

  // filters
  $("[data-q]", page).addEventListener("input", debounce((e) => { f.q = e.target.value.trim(); syncUrl(); load(); }, 300));
  $$("[data-f]", page).forEach((s) => s.addEventListener("change", () => { f[s.dataset.f] = s.value; if (s.dataset.f === "period") { f.from = ""; f.to = ""; } syncUrl(); load(); }));
  srcEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-src-tab]");
    if (!b) return;
    f.kind = b.dataset.srcTab;
    const sel = $('[data-f="kind"]', page);
    if (sel) sel.value = f.kind;
    syncUrl(); load();
  });
  tabsEl.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (!b) return; f.status = b.dataset.tab; syncUrl(); load(); });
  page.addEventListener("click", (e) => {
    if (e.target.closest("[data-more]")) { load(true); return; }
    const rf = e.target.closest("[data-reply-filter]");
    if (rf) { f.reply = rf.dataset.replyFilter; if (f.reply) f.status = ""; syncUrl(); load(); return; }
    const rb = e.target.closest("[data-reply]");
    if (rb) {
      const id = Number(rb.dataset.reply);
      const it = items.find((x) => x.id === id);
      const on = !it.replied_at;
      rb.disabled = true;
      api(`/consults/${id}`, { method: "PATCH", json: { replied: on } })
        .then(() => { toast(`${it.name} 님: ${on ? "답변 완료" : "답변 대기"}`); load(); ctx.refreshPulse(); if (id === detailId) openDetail(id); })
        .catch((err) => { rb.disabled = false; toast(err.message, { bad: true }); });
      return;
    }
    if (e.target.closest("[data-clear-channel]")) { e.preventDefault(); f.channel = ""; syncUrl(); ctx.go(location.pathname + location.search, { replace: true }); return; }
    const tr = e.target.closest("tr[data-id]");
    if (tr && !e.target.closest("a, select, button")) ctx.go(`/admin/consults/${tr.dataset.id}${location.search}`);
  });
  page.addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-quick]");
    if (!sel) return;
    const id = Number(sel.dataset.quick);
    const it = items.find((x) => x.id === id);
    if (sel.value === "booked" && !it.booked_at) { sel.value = it.status; ctx.go(`/admin/consults/${id}?book=1`); return; }
    if (sel.value === "spam" && !(await confirmBox({ title: "스팸으로 옮길까요?", body: "스팸은 목록과 통계에서 빠지고 30일 뒤 자동으로 지워집니다.", ok: "스팸으로 옮기기" }))) { sel.value = it.status; return; }
    try {
      await api(`/consults/${id}`, { method: "PATCH", json: { status: sel.value } });
      toast(`${it.name} 님: ‘${STATUS[sel.value]}’`);
      load();
      ctx.refreshPulse();
      if (id === detailId) openDetail(id);
    } catch (err) { sel.value = it.status; toast(err.message, { bad: true }); }
  });

  // one consultation
  const openDetail = async (id) => {
    detailId = id;
    split.classList.toggle("has-detail", !!id);
    $$("tr[data-id]", listEl).forEach((tr) => tr.classList.toggle("is-current", Number(tr.dataset.id) === id));
    drawList();
    if (!id) { detailEl.innerHTML = ""; ctx.setTitle("상담 관리"); return; }
    await detail(detailEl, id, {
      me, ctx,
      onChange: () => load(),
      onRead: (cid) => { const it = items.find((x) => x.id === cid); if (it && !it.read_at) { it.read_at = new Date().toISOString(); drawList(); ctx.refreshPulse(); } },
      back: () => ctx.go(`/admin/consults${location.search}`),
    });
  };
  ctx.onUpdate(async ({ params, query }) => {
    const nf = readQuery(query);
    if (JSON.stringify(nf) !== JSON.stringify(f)) { f = nf; load(); }
    const id = params[0] ? Number(params[0]) : null;
    if (id !== detailId || id) await openDetail(id);
    return true;
  });
  const onNew = () => load();
  window.addEventListener("admin:new-consult", onNew);
  await load();
  if (detailId) await openDetail(detailId);
  return () => window.removeEventListener("admin:new-consult", onNew);
}

/* ---------- one consultation ---------- */
async function detail(el, id, { me, ctx, onChange, onRead, back }) {
  el.innerHTML = String(skeleton(8));
  let d;
  try { d = await api(`/consults/${id}`); } catch (e) { el.innerHTML = String(errorBox(e.message)); return; }
  onRead(id);
  const c = d.consult;
  const names = await users().catch(() => []);
  ctx.setTitle(`${c.name} 님`);
  const bk = c.booked_at ? kst(c.booked_at) : null;
  const interestOpts = [...new Set([...INTERESTS, ...(c.interest ? [c.interest] : [])])];
  const src = [...new Set([c.grp, c.channel].filter(Boolean))];
  const campaign = [c.source, c.medium, c.campaign].filter(Boolean).join(" / ");
  el.innerHTML = String(html`<div class="detail">
    <section class="panel d-head">
      <div class="row"><button class="btn btn-sm btn-ghost" type="button" data-back>${icon("arrow-left", "i-sm")}목록</button><span class="spacer"></span><span class="muted small">#${c.id}</span></div>
      <div class="d-title"><h2>${c.name}</h2>${pill(c.status)}${d.others.length ? html`<span class="tag tag-warn">같은 번호 상담 ${d.others.length}건 더</span>` : ""}</div>
      <p class="d-sub">${KINDS[c.kind]}${c.kind === "manual" && c.channel ? ` (${c.channel})` : ""} · ${full(c.created_at)} 접수 · ${ago(c.created_at)}</p>
      ${c.phone ? html`<div class="d-contact"><span class="d-phone">${phone(c.phone)}</span>
        <a class="btn btn-sm btn-primary" href="tel:${c.phone}">${icon("phone", "i-sm")}전화</a>
        <a class="btn btn-sm" href="sms:${c.phone}">${icon("message", "i-sm")}문자</a>
        <button class="btn btn-sm" type="button" data-copy>${icon("copy", "i-sm")}번호 복사</button></div>`
        : html`<div class="d-contact"><span class="d-phone muted">연락처 없음</span><span class="muted small">예전 온라인 상담 게시판의 글이라 번호가 남아 있지 않습니다.</span></div>`}
      <div class="steps" role="group" aria-label="상태 바꾸기">
        ${FLOW.map((s) => html`<button type="button" data-status="${s}" aria-pressed="${c.status === s}" class="${c.status === s ? `t-${s}` : ""}">${STATUS[s]}</button>`)}
        <span class="sep" aria-hidden="true"></span>
        ${SIDE.map((s) => html`<button type="button" data-status="${s}" aria-pressed="${c.status === s}" class="${c.status === s ? `t-${s}` : ""}">${STATUS[s]}</button>`)}
      </div>
      ${c.kind === "sms" ? html`<div class="reply-box ${c.replied_at ? "is-done" : "is-wait"}">
        <div class="reply-box-text">${icon(c.replied_at ? "check" : "clock")}<div>
          <strong>${c.replied_at ? "문자 답변 완료" : "문자 답변 대기 중"}</strong>
          <span>${c.replied_at ? `${full(c.replied_at)}${c.replied_by ? ` · ${c.replied_by}` : ""}` : "고객에게 문자로 답한 뒤 ‘답변 완료’를 눌러 주세요."}</span>
          ${c.sms_opened_at ? html`<span class="small">고객 휴대폰에서 문자 앱이 열렸습니다 (${short(c.sms_opened_at)}). 문자 받는 휴대폰에서 고객 문자를 확인하세요.</span>` : ""}</div></div>
        ${c.replied_at ? html`<button class="btn btn-sm" type="button" data-reply-toggle="0">대기로 되돌리기</button>` : html`<button class="btn btn-primary" type="button" data-reply-toggle="1">${icon("check", "i-sm")}답변 완료</button>`}
      </div>` : ""}
      <form class="booking-form" data-booking ${c.status === "booked" && !c.booked_at ? "" : "hidden"}>
        <div class="field"><label for="bk-d">예약 날짜</label><input class="input" id="bk-d" type="date" name="date" value="${bk ? bk.ymd : c.prefer_date || ""}" required></div>
        <div class="field"><label for="bk-t">시간</label><select class="select" id="bk-t" name="time">${SLOTS.map((s) => html`<option ${bk && bk.hm === s ? "selected" : ""}>${s}</option>`)}</select></div>
        <button class="btn btn-primary" type="submit">예약 확정</button>
      </form>
    </section>

    <section class="panel">
      <div class="panel-head"><h3>상담 정보</h3></div>
      <div class="panel-body"><div class="d-fields">
        <div class="field"><label for="f-as">담당</label><select class="select" id="f-as" data-save="assignee"><option value="">없음</option>
          ${names.filter((u) => u.active || u.id === c.assignee).map((u) => html`<option value="${u.id}" ${u.id === c.assignee ? "selected" : ""}>${u.name}${u.id === me.id ? " (나)" : ""}</option>`)}</select></div>
        <div class="field"><label for="f-in">관심 부위</label><select class="select" id="f-in" data-save="interest"><option value="">선택 안 함</option>
          ${interestOpts.map((v) => html`<option ${v === c.interest ? "selected" : ""}>${v}</option>`)}</select></div>
        <div class="field"><span class="label">예약 일시</span>
          <div class="row"><strong class="num">${bk ? `${md(c.booked_at)} ${bk.hm}` : html`<span class="muted">없음</span>`}</strong><button class="btn btn-sm" type="button" data-edit-booking>${bk ? "바꾸기" : "넣기"}</button>${bk ? html`<button class="btn btn-sm btn-ghost" type="button" data-clear-booking>지우기</button>` : ""}</div></div>
        <div class="field"><label for="f-am">금액 <span class="muted">(시술 진행 때)</span></label><input class="input" id="f-am" inputmode="numeric" data-save="amount" placeholder="예: 1500000" value="${c.amount ?? ""}">${c.amount ? html`<span class="hint">${won(c.amount)}</span>` : ""}</div>
      </div></div>
    </section>

    <section class="panel">
      <div class="panel-head"><h3>신청 내용</h3></div>
      <div class="panel-body stack">
        ${c.topic ? html`<dl class="kv"><dt>신청 이벤트</dt><dd><strong>${c.topic}</strong></dd></dl>` : ""}
        ${c.kind === "cost" && c.interest ? html`<dl class="kv"><dt>궁금한 시술</dt><dd><strong>${c.interest}</strong></dd></dl>` : ""}
        ${c.prefer_date || c.prefer_time || c.age || c.gender ? html`<dl class="kv">
          ${c.prefer_date ? html`<dt>희망 날짜</dt><dd>${md(c.prefer_date)}</dd>` : ""}
          ${c.prefer_time ? html`<dt>희망 시간</dt><dd>${c.prefer_time}</dd>` : ""}
          ${c.age ? html`<dt>나이</dt><dd>${c.age}</dd>` : ""}${c.gender ? html`<dt>성별</dt><dd>${c.gender}</dd>` : ""}</dl>` : ""}
        ${c.message ? html`<p class="msg">${c.message}</p>` : html`<p class="muted">남긴 글이 없습니다.</p>`}
        ${d.files.length ? html`<div><p class="label small strong" style="margin-bottom:8px">보낸 사진 ${d.files.length}장</p><div class="photos">${d.files.map((p, i) => html`<button type="button" data-photo="${p.id}" aria-label="사진 ${i + 1} 크게 보기"><img src="/api/admin/consult-files/${p.id}?s=t" alt="" loading="lazy"></button>`)}</div></div>` : ""}
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><h3>메모와 기록</h3><span class="sub">통화 내용과 다음 약속을 남겨 두세요</span></div>
      <div class="panel-body">
        <ol class="timeline" data-timeline>
          <li class="tl-sys"><span class="tl-dot">${icon("plus")}</span><div><div class="tl-head"><strong>접수</strong><time>${short(c.created_at)}</time></div><div class="tl-body">${KINDS[c.kind]}${c.channel ? ` · ${c.channel}에서` : ""}</div></div></li>
          ${d.notes.map((n) => html`<li class="${n.kind === "note" ? "tl-note" : "tl-sys"}"><span class="tl-dot">${icon(TL_ICON[n.kind] || "info")}</span><div>
            <div class="tl-head"><strong>${n.who || "시스템"}</strong><time title="${full(n.at)}">${short(n.at)}</time>${n.kind === "note" && (n.user_id === me.id || me.role === "owner") ? html`<button class="btn btn-sm btn-ghost" type="button" data-del-note="${n.id}" style="height:24px;padding:0 6px">지우기</button>` : ""}</div>
            <div class="tl-body">${n.body}</div></div></li>`)}
        </ol>
        <form class="composer" data-note>
          <label class="sr-only" for="note-in">메모</label>
          <textarea class="textarea" id="note-in" name="body" rows="3" placeholder="예: 10/2 오후 통화 — 눈매교정 비용 문의, 토요일 상담 원함"></textarea>
          <div class="row"><span class="muted small hide-m">Ctrl+Enter로 저장</span><button class="btn btn-primary btn-sm" type="submit">메모 저장</button></div>
        </form>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><h3>어디서 왔나</h3></div>
      <div class="panel-body stack">
        ${c.kind === "manual" ? html`<p class="muted">직접 등록한 상담입니다. 들어온 경로: <strong>${c.channel || "기타"}</strong></p>` : html`<dl class="kv">
          <dt>이번 방문</dt><dd>${src.length ? src.join(" · ") : "알 수 없음"}${c.referrer ? html` <span class="muted">(${c.referrer})</span>` : ""}</dd>
          ${c.keyword ? html`<dt>검색어</dt><dd><strong>“${c.keyword}”</strong></dd>` : ""}
          ${campaign ? html`<dt>캠페인</dt><dd>${campaign}</dd>` : ""}
          <dt>처음 온 경로</dt><dd>${c.first_channel || "알 수 없음"}${c.first_at ? html` <span class="muted">· ${md(c.first_at)}</span>` : ""}</dd>
          ${d.visits ? html`<dt>방문 횟수</dt><dd>${num(d.visits)}번째 방문에서 신청</dd>` : ""}
          ${c.landing ? html`<dt>들어온 페이지</dt><dd><a href="${c.landing}" target="_blank" rel="noopener">${c.landing_title || c.landing}</a></dd>` : ""}
          ${c.page ? html`<dt>신청한 페이지</dt><dd><a href="${c.page}" target="_blank" rel="noopener">${c.page_title || c.page}</a></dd>` : ""}
          <dt>기기</dt><dd>${[c.device, c.browser].filter(Boolean).join(" · ") || "–"}</dd></dl>`}
        ${d.journey.length ? html`<div><p class="label small strong" style="margin-bottom:6px">신청 전에 본 것</p><ol class="journey">${d.journey.map((j) => html`<li><time>${hm(j.at)}</time>
          ${j.kind === "pv" ? html`<span>${j.title || j.path}</span>` : html`<span class="ev">${HIT[j.kind] || j.kind}</span>`}</li>`)}</ol></div>` : ""}
      </div>
    </section>

    ${d.others.length ? html`<section class="panel"><div class="panel-head"><h3>같은 번호의 다른 상담</h3></div>
      <ul class="agenda">${d.others.map((o) => html`<li><span class="when">${kst(o.created_at).m}/${kst(o.created_at).d}<small>${kst(o.created_at).y}</small></span>
        <a class="who" href="/admin/consults/${o.id}"><strong>${KINDS[o.kind]}</strong><span>${o.interest || "관심 부위 없음"}</span></a>${pill(o.status)}</li>`)}</ul></section>` : ""}

    ${me.role === "owner" ? html`<section class="panel"><div class="panel-body row"><div class="spacer"><strong>이 상담 지우기</strong><p class="muted small">메모와 사진까지 모두 지워지고 되돌릴 수 없습니다. 개인정보 파기 요청이 있을 때 쓰세요.</p></div>
      <button class="btn btn-danger" type="button" data-delete>${icon("trash", "i-sm")}지우기</button></div></section>` : ""}
  </div>`);

  const patch = async (json, msg = "저장했습니다.") => {
    try { await api(`/consults/${id}`, { method: "PATCH", json }); toast(msg); onChange(); await detail(el, id, { me, ctx, onChange, onRead, back }); ctx.refreshPulse(); } catch (e) { toast(e.message, { bad: true }); }
  };
  $("[data-back]", el).addEventListener("click", back);
  $("[data-reply-toggle]", el)?.addEventListener("click", (e) => {
    const on = e.currentTarget.dataset.replyToggle === "1";
    patch({ replied: on }, on ? "답변 완료로 표시했습니다." : "답변 대기로 되돌렸습니다.");
  });
  $("[data-copy]", el)?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(phone(c.phone)); toast("번호를 복사했습니다."); } catch { toast("복사하지 못했습니다.", { bad: true }); } });
  const bookingForm = $("[data-booking]", el);
  $$("[data-status]", el).forEach((b) => b.addEventListener("click", async () => {
    const s = b.dataset.status;
    if (s === c.status) return;
    if (s === "booked" && !c.booked_at) { bookingForm.hidden = false; bookingForm.date.focus(); return; }
    if (s === "spam" && !(await confirmBox({ title: "스팸으로 옮길까요?", body: "스팸은 목록과 통계에서 빠지고 30일 뒤 자동으로 지워집니다.", ok: "스팸으로 옮기기" }))) return;
    patch({ status: s }, `‘${STATUS[s]}’으로 바꿨습니다.`);
  }));
  bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const at = bookedISO(bookingForm.date.value, bookingForm.time.value);
    if (!at) { bookingForm.date.focus(); return; }
    const json = { booked_at: at };
    if (!["booked", "visited", "surgery"].includes(c.status)) json.status = "booked";
    patch(json, "예약을 잡았습니다.");
  });
  $("[data-edit-booking]", el).addEventListener("click", () => { bookingForm.hidden = false; bookingForm.date.focus(); });
  if (new URLSearchParams(location.search).get("book") === "1" && !c.booked_at) { bookingForm.hidden = false; bookingForm.scrollIntoView({ block: "center" }); bookingForm.date.focus(); }
  $("[data-clear-booking]", el)?.addEventListener("click", () => patch({ booked_at: null }, "예약 일시를 지웠습니다."));
  $$("[data-save]", el).forEach((input) => input.addEventListener("change", () => patch({ [input.dataset.save]: input.value })));
  $$("[data-photo]", el).forEach((b) => b.addEventListener("click", () => lightbox(`/api/admin/consult-files/${b.dataset.photo}`, "보낸 사진")));
  const noteForm = $("[data-note]", el);
  const saveNote = async () => {
    const body = noteForm.body.value.trim();
    if (!body) { noteForm.body.focus(); return; }
    await busy($("button[type=submit]", noteForm), async () => {
      try { await api(`/consults/${id}/notes`, { method: "POST", json: { body } }); toast("메모를 남겼습니다."); await detail(el, id, { me, ctx, onChange, onRead, back }); onChange(); } catch (e) { toast(e.message, { bad: true }); }
    });
  };
  noteForm.addEventListener("submit", (e) => { e.preventDefault(); saveNote(); });
  noteForm.body.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNote(); } });
  $$("[data-del-note]", el).forEach((b) => b.addEventListener("click", async () => {
    if (!(await confirmBox({ title: "메모를 지울까요?", ok: "지우기", danger: true }))) return;
    try { await api(`/consults/${id}/notes/${b.dataset.delNote}`, { method: "DELETE" }); await detail(el, id, { me, ctx, onChange, onRead, back }); } catch (e) { toast(e.message, { bad: true }); }
  }));
  $("[data-delete]", el)?.addEventListener("click", async () => {
    if (!(await confirmBox({ title: `${c.name} 님 상담을 지울까요?`, body: "메모와 사진까지 모두 지워지고 되돌릴 수 없습니다.", ok: "영구히 지우기", danger: true }))) return;
    try { await api(`/consults/${id}`, { method: "DELETE" }); toast("상담을 지웠습니다."); onChange(); back(); } catch (e) { toast(e.message, { bad: true }); }
  });
}

/* ---------- a consultation that came another way ---------- */
export async function renderNew(ctx) {
  const { page, setTitle } = ctx;
  setTitle("상담 직접 등록");
  page.innerHTML = String(html`<form class="panel" style="max-width:760px" novalidate data-new>
    <div class="panel-head"><h2>전화·내원·카카오톡으로 받은 상담</h2></div>
    <div class="panel-body stack">
      <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:8px">들어온 경로</legend>
        <div class="chips" role="radiogroup">${MANUAL.map((m, i) => html`<label class="chip${i === 0 ? " is-on" : ""}"><input class="sr-only" type="radio" name="channel" value="${m}" ${i === 0 ? "checked" : ""}>${m}</label>`)}</div></fieldset>
      <div class="form-grid">
        <div class="field"><label for="n-name">이름</label><input class="input" id="n-name" name="name" maxlength="20" required autocomplete="off"></div>
        <div class="field"><label for="n-phone">연락처</label><input class="input" id="n-phone" name="phone" inputmode="tel" placeholder="010-0000-0000" required autocomplete="off"></div>
        <div class="field"><label for="n-in">관심 부위</label><select class="select" id="n-in" name="interest"><option value="">선택 안 함</option>${INTERESTS.map((v) => html`<option>${v}</option>`)}</select></div>
        <div class="field"><label for="n-st">상태</label><select class="select" id="n-st" name="status">${["new", "contacting", "booked", "visited"].map((s) => html`<option value="${s}">${STATUS[s]}</option>`)}</select></div>
      </div>
      <div class="form-grid" data-when hidden>
        <div class="field"><label for="n-d">예약 날짜</label><input class="input" id="n-d" type="date" name="date" min="${today()}"></div>
        <div class="field"><label for="n-t">시간</label><select class="select" id="n-t" name="time">${SLOTS.map((s) => html`<option>${s}</option>`)}</select></div>
      </div>
      <div class="field"><label for="n-msg">내용</label><textarea class="textarea" id="n-msg" name="message" rows="4" placeholder="상담 내용, 궁금해한 점, 다음 연락 약속"></textarea></div>
      <p class="err small" data-err role="alert"></p>
    </div>
    <div class="panel-foot row"><span class="spacer"></span><a class="btn" href="/admin/consults">취소</a><button class="btn btn-primary" type="submit">등록</button></div>
  </form>`);
  const form = $("[data-new]", page);
  const when = $("[data-when]", form);
  $$('input[name="channel"]', form).forEach((r) => r.addEventListener("change", () => $$(".chip", form).forEach((c) => c.classList.toggle("is-on", $("input", c).checked))));
  form.status.addEventListener("change", () => { when.hidden = !["booked", "visited"].includes(form.status.value); });
  form.phone.addEventListener("input", () => { form.phone.value = form.phone.value.replace(/[^\d-]/g, ""); });
  form.name.focus();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("[data-err]", form);
    err.textContent = "";
    const json = { channel: form.channel.value, name: form.name.value.trim(), phone: form.phone.value, interest: form.interest.value, status: form.status.value, message: form.message.value };
    if (!json.name) { err.textContent = "이름을 적어 주세요."; form.name.focus(); return; }
    if (!/^0\d{8,10}$/.test(json.phone.replace(/\D/g, ""))) { err.textContent = "연락처를 확인해 주세요."; form.phone.focus(); return; }
    if (!when.hidden && form.date.value) json.booked_at = bookedISO(form.date.value, form.time.value);
    await busy($("button[type=submit]", form), async () => {
      try { const r = await api("/consults", { method: "POST", json }); toast("등록했습니다."); ctx.go(`/admin/consults/${r.id}`, { replace: true }); } catch (e2) { err.textContent = e2.message; }
    });
  });
}
