// 홈페이지: what staff change on the public site. The main page's popups, the 비급여 진료비용 list, and the ad and
// analytics codes (the owner edits those; everyone can read them).
import { $, $$, html, icon, api, toast, confirmBox, busy, today, md, skeleton, empty, errorBox } from "./lib.js";

const TABS = [["popups", "팝업"], ["prices", "비급여 진료비용"], ["tags", "광고·분석 코드"]];
const LINKS = [["", "연결 안 함"], ["https://m.booking.naver.com/booking/13/bizes/973835", "네이버 예약"], ["http://pf.kakao.com/_xgeTlG", "카카오톡 상담"], ["/sub/about/page01/", "진료시간"], ["/sub/about/page02/", "오시는 길"],
  ["/sub/about/page03/", "의료진 소개"], ["/sub/board/page01/", "해운누리 소식"], ["/sub/media/page02/", "전문칼럼"], ["/sub/media/page01/", "유튜브"], ["/nonpay/", "비급여 진료비용"], ["custom", "직접 입력"]];

export async function render(ctx) {
  const { page, setTitle, setActions, me } = ctx;
  setTitle("홈페이지");
  setActions(html`<a class="btn btn-sm" href="/" target="_blank" rel="noopener">${icon("external", "i-sm")}홈페이지 보기</a>`);
  let tab = TABS.some(([k]) => k === ctx.query.get("tab")) ? ctx.query.get("tab") : "popups";
  page.innerHTML = String(html`<div class="seg" role="tablist" aria-label="홈페이지 관리" style="margin-bottom:18px" data-tabs>
      ${TABS.map(([k, l]) => html`<button type="button" role="tab" data-tab="${k}" aria-pressed="${tab === k}">${l}</button>`)}</div>
    <div data-body>${skeleton(5)}</div>`);
  const body = $("[data-body]", page);
  const show = async () => {
    $$("[data-tab]", page).forEach((b) => b.setAttribute("aria-pressed", b.dataset.tab === tab));
    body.innerHTML = String(skeleton(5));
    try {
      if (tab === "popups") await popups(body);
      else if (tab === "prices") await prices(body);
      else await tags(body, me);
    } catch (e) { if (e.name !== "AbortError") body.innerHTML = String(errorBox(e.message)); }
  };
  $("[data-tabs]", page).addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b || b.dataset.tab === tab) return;
    tab = b.dataset.tab;
    ctx.setQuery({ tab: tab === "popups" ? "" : tab });
    show();
  });
  await show();
}

/* ---------- popups ---------- */
function stateOf(p, t) {
  if (!p.active) return ["꺼짐", "t-hold"];
  if (p.starts_on && p.starts_on > t) return [`${md(p.starts_on)}부터`, "t-booked"];
  if (p.ends_on && p.ends_on < t) return ["기간 끝남", "t-canceled"];
  return ["노출 중", "t-surgery"];
}
const imgOf = (p) => (p.image_path ? `/${p.image_path}` : `/popup-img/${p.id}?v=${p.v}`);

async function popups(body) {
  const { popups: list, today: t } = await api("/popups");
  const shown = list.filter((p) => stateOf(p, t)[0] === "노출 중").length;
  body.innerHTML = String(html`<div class="grid-main">
    <section class="panel">
      <div class="panel-head"><h2>메인 팝업</h2><span class="sub">첫 화면에 뜨는 순서대로 · 지금 ${shown}개 노출</span></div>
      ${list.length ? html`<ul class="pop-list">${list.map((p, i) => {
        const [label, tone] = stateOf(p, t);
        return html`<li class="pop-item" data-id="${p.id}">
          <img src="${imgOf(p)}" alt="" loading="lazy">
          <div class="pop-meta"><span class="pill ${tone}">${label}</span>
            <strong>${p.title}</strong>
            <span class="muted small">${p.link ? `연결: ${p.link}` : "연결 없음"} · ${p.starts_on || p.ends_on ? `${p.starts_on ? md(p.starts_on) : "처음"} ~ ${p.ends_on ? md(p.ends_on) : "계속"}` : "기간 없이 계속"}</span></div>
          <div class="pop-acts">
            <button class="icon-btn icon-btn-sm" type="button" data-move="-1" ${i === 0 ? "disabled" : ""} aria-label="앞으로">${icon("chevron-left", "i-sm")}</button>
            <button class="icon-btn icon-btn-sm" type="button" data-move="1" ${i === list.length - 1 ? "disabled" : ""} aria-label="뒤로">${icon("chevron-right", "i-sm")}</button>
            <button class="btn btn-sm" type="button" data-toggle>${p.active ? "끄기" : "켜기"}</button>
            <button class="btn btn-sm" type="button" data-edit>수정</button>
            <button class="btn btn-sm btn-ghost" type="button" data-del aria-label="삭제">${icon("trash", "i-sm")}</button>
          </div></li>`;
      })}</ul>` : empty("image", "팝업이 없습니다", "팝업이 하나도 없으면 첫 화면에 팝업이 뜨지 않습니다. 오른쪽에서 새로 올려 보세요.")}
    </section>
    <section class="panel" data-form-panel></section>
  </div>`);
  const formPanel = $("[data-form-panel]", body);
  const form = (p = null) => {
    const custom = p && p.link && !LINKS.some(([v]) => v === p.link);
    formPanel.innerHTML = String(html`<div class="panel-head"><h2>${p ? "팝업 수정" : "새 팝업"}</h2>${p ? html`<button class="btn btn-sm btn-ghost" type="button" data-new>새로 쓰기</button>` : ""}</div>
      <form class="panel-body stack" novalidate data-pop-form>
        <div class="field"><span class="label">이미지 ${p ? html`<span class="muted">(바꿀 때만)</span>` : ""}</span>
          <label class="drop" data-drop>${icon("image", "i-lg")}<strong>이미지를 끌어다 놓거나 눌러서 고르세요</strong><span class="small">세로 800px 안팎을 권합니다 · 10MB까지</span><input class="sr-only" type="file" accept="image/*" name="image"></label>
          <img class="pop-preview" data-preview ${p ? html`src="${imgOf(p)}"` : "hidden"} alt=""></div>
        <div class="field"><label for="pp-title">이미지에 적힌 내용</label><textarea class="textarea" id="pp-title" name="title" rows="2" maxlength="200" placeholder="예: 추석 연휴 진료 안내. 10월 3일부터 6일까지 휴진합니다.">${p ? p.title : ""}</textarea>
          <span class="hint">화면을 읽어 주는 기능이 이 글을 읽습니다. 이미지 속 글자를 그대로 적어 주세요.</span></div>
        <div class="form-grid">
          <div class="field"><label for="pp-link">누르면 갈 곳</label><select class="select" id="pp-link" name="linkPick">${LINKS.map(([v, l]) => html`<option value="${v}" ${(custom ? "custom" : (p && p.link) || "") === v ? "selected" : ""}>${l}</option>`)}</select></div>
          <div class="field" data-custom ${custom ? "" : "hidden"}><label for="pp-url">주소</label><input class="input" id="pp-url" name="link" value="${custom ? p.link : ""}" placeholder="https://… 또는 /sub/about/page01/"></div>
          <div class="field"><label for="pp-s">시작하는 날</label><input class="input" id="pp-s" type="date" name="starts_on" value="${(p && p.starts_on) || ""}"></div>
          <div class="field"><label for="pp-e">끝나는 날</label><input class="input" id="pp-e" type="date" name="ends_on" value="${(p && p.ends_on) || ""}" min="${today()}"></div>
        </div>
        <label class="check"><input type="checkbox" name="active" ${!p || p.active ? "checked" : ""}>홈페이지에 보이기</label>
        <p class="err small" data-err role="alert"></p>
        <div class="row"><span class="spacer"></span><button class="btn btn-primary" type="submit">${p ? "고친 내용 저장" : "팝업 올리기"}</button></div>
      </form>`);
    const f = $("[data-pop-form]", formPanel);
    const pick = f.linkPick;
    pick.addEventListener("change", () => { $("[data-custom]", f).hidden = pick.value !== "custom"; });
    const file = $('input[type="file"]', f);
    const prev = $("[data-preview]", f);
    const drop = $("[data-drop]", f);
    const setFile = (fl) => { if (!fl) return; const dt = new DataTransfer(); dt.items.add(fl); file.files = dt.files; prev.src = URL.createObjectURL(fl); prev.hidden = false; };
    file.addEventListener("change", () => setFile(file.files[0]));
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); if (ev === "drop") setFile(e.dataTransfer.files[0]); }));
    $("[data-new]", formPanel)?.addEventListener("click", () => form());
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $("[data-err]", f);
      err.textContent = "";
      if (!p && !file.files[0]) { err.textContent = "팝업 이미지를 올려 주세요."; return; }
      const fd = new FormData();
      if (file.files[0]) fd.append("image", file.files[0]);
      fd.append("title", f.title.value);
      fd.append("link", pick.value === "custom" ? f.link.value : pick.value);
      fd.append("starts_on", f.starts_on.value);
      fd.append("ends_on", f.ends_on.value);
      fd.append("active", f.active.checked ? "1" : "0");
      await busy($("button[type=submit]", f), async () => {
        try { await api(p ? `/popups/${p.id}` : "/popups", { method: p ? "PUT" : "POST", form: fd }); toast(p ? "고쳤습니다. 홈페이지에 바로 반영됩니다." : "올렸습니다. 홈페이지에 바로 반영됩니다."); await popups(body); } catch (e2) { err.textContent = e2.message; }
      });
    });
  };
  form();
  $$(".pop-item", body).forEach((li) => {
    const p = list.find((x) => x.id === Number(li.dataset.id));
    $("[data-edit]", li).addEventListener("click", () => { form(p); formPanel.scrollIntoView({ behavior: "smooth", block: "start" }); });
    $("[data-toggle]", li).addEventListener("click", async () => {
      const fd = new FormData();
      [["title", p.title], ["link", p.link || ""], ["starts_on", p.starts_on || ""], ["ends_on", p.ends_on || ""], ["active", p.active ? "0" : "1"]].forEach(([k, v]) => fd.append(k, v));
      try { await api(`/popups/${p.id}`, { method: "PUT", form: fd }); toast(p.active ? "껐습니다." : "켰습니다."); await popups(body); } catch (e) { toast(e.message, { bad: true }); }
    });
    $("[data-del]", li).addEventListener("click", async () => {
      if (!(await confirmBox({ title: "이 팝업을 지울까요?", body: "잠시 내리려면 ‘끄기’를 쓰세요.", ok: "지우기", danger: true }))) return;
      try { await api(`/popups/${p.id}`, { method: "DELETE" }); toast("지웠습니다."); await popups(body); } catch (e) { toast(e.message, { bad: true }); }
    });
    $$("[data-move]", li).forEach((b) => b.addEventListener("click", async () => {
      const ids = list.map((x) => x.id);
      const i = ids.indexOf(p.id);
      const j = i + Number(b.dataset.move);
      [ids[i], ids[j]] = [ids[j], ids[i]];
      try { await api("/popups/order", { method: "POST", json: { ids } }); await popups(body); } catch (e) { toast(e.message, { bad: true }); }
    }));
  });
}

/* ---------- 비급여 진료비용 ---------- */
async function prices(body) {
  let { prices: rows } = await api("/prices");
  rows = rows.map((r) => ({ cat: r.cat, item: r.item, price_min: r.price_min ?? "", price_max: r.price_max === r.price_min ? "" : r.price_max ?? "", note: r.note || "" }));
  let dirty = false;
  const draw = () => {
    body.innerHTML = String(html`<section class="panel">
      <div class="panel-head"><h2>비급여 진료비용</h2><span class="sub hide-m">저장하면 홈페이지의 ‘비급여 진료비용’ 페이지에 바로 게시됩니다</span>
        <a class="btn btn-sm btn-ghost" href="/nonpay" target="_blank" rel="noopener">${icon("external", "i-sm")}페이지 보기</a></div>
      <div class="table-wrap"><table class="tbl tbl-compact price-edit"><thead><tr><th style="width:18%">분류</th><th>항목</th><th style="width:15%">금액</th><th style="width:15%">최대 금액 <span class="muted">(범위일 때)</span></th><th style="width:20%">비고</th><th></th></tr></thead>
        <tbody>${rows.map((r, i) => html`<tr data-i="${i}">
          <td><input class="input input-sm" data-k="cat" value="${r.cat}" placeholder="예: 눈성형" aria-label="분류"></td>
          <td><input class="input input-sm" data-k="item" value="${r.item}" placeholder="예: 쌍꺼풀 매몰법" aria-label="항목"></td>
          <td><input class="input input-sm" data-k="price_min" inputmode="numeric" value="${r.price_min}" placeholder="원" aria-label="금액"></td>
          <td><input class="input input-sm" data-k="price_max" inputmode="numeric" value="${r.price_max}" placeholder="원" aria-label="최대 금액"></td>
          <td><input class="input input-sm" data-k="note" value="${r.note}" placeholder="예: 부분 마취 포함" aria-label="비고"></td>
          <td class="nowrap"><button class="icon-btn icon-btn-sm" type="button" data-up ${i ? "" : "disabled"} aria-label="위로">${icon("chevron-up", "i-sm")}</button><button class="icon-btn icon-btn-sm" type="button" data-rm aria-label="이 줄 지우기">${icon("x", "i-sm")}</button></td></tr>`)}</tbody></table></div>
      ${rows.length ? "" : html`<div class="panel-body">${empty("file", "아직 입력한 항목이 없습니다", "의료법에 따라 홈페이지에 비급여 진료 항목과 가격을 게시해야 합니다. 아래에서 한 줄씩 넣거나, 엑셀에서 복사해 붙여 넣으세요.")}</div>`}
      <div class="panel-foot row"><button class="btn btn-sm" type="button" data-add>${icon("plus", "i-sm")}한 줄 더</button><button class="btn btn-sm" type="button" data-paste>${icon("copy", "i-sm")}엑셀에서 붙여넣기</button>
        <span class="spacer"></span><span class="muted small" data-dirty>${dirty ? "저장하지 않은 변경이 있습니다" : ""}</span><button class="btn btn-primary" type="button" data-save>저장하고 게시</button></div>
    </section>
    <div class="note-box" style="margin-top:16px">${icon("info")}<span>금액은 부가세를 포함해 원 단위로 적어 주세요. 범위가 있는 항목은 ‘최대 금액’까지 적으면 “○○원 ~ ○○원”으로 표시됩니다. 분류가 같은 항목끼리 묶여 보입니다.</span></div>`);
  };
  const collect = () => { $$("tr[data-i]", body).forEach((tr) => { const r = rows[Number(tr.dataset.i)]; $$("[data-k]", tr).forEach((inp) => { r[inp.dataset.k] = inp.value; }); }); };
  draw();
  body.addEventListener("input", () => { dirty = true; const d = $("[data-dirty]", body); if (d) d.textContent = "저장하지 않은 변경이 있습니다"; });
  body.addEventListener("click", async (e) => {
    if (e.target.closest("[data-add]")) { collect(); rows.push({ cat: rows.length ? rows[rows.length - 1].cat : "", item: "", price_min: "", price_max: "", note: "" }); dirty = true; draw(); $$("tr[data-i]", body).pop()?.querySelector('[data-k="item"]').focus(); return; }
    const rm = e.target.closest("[data-rm]");
    if (rm) { collect(); rows.splice(Number(rm.closest("tr").dataset.i), 1); dirty = true; draw(); return; }
    const up = e.target.closest("[data-up]");
    if (up) { collect(); const i = Number(up.closest("tr").dataset.i); [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]]; dirty = true; draw(); return; }
    if (e.target.closest("[data-paste]")) {
      const d = document.createElement("dialog");
      d.className = "dlg";
      d.innerHTML = String(html`<form method="dialog"><div class="dlg-body"><h2>엑셀에서 붙여넣기</h2><p>엑셀에서 <b>분류 · 항목 · 금액 · 최대 금액 · 비고</b> 순서의 칸을 골라 복사한 뒤 붙여 넣으세요. 첫 줄이 제목이면 건너뜁니다.</p>
        <textarea class="textarea" name="t" rows="8" style="margin-top:12px" placeholder="눈성형	쌍꺼풀 매몰법	1200000		"></textarea></div>
        <div class="dlg-foot"><button class="btn" value="no">취소</button><button class="btn btn-primary" value="yes">목록에 더하기</button></div></form>`);
      d.addEventListener("close", () => {
        if (d.returnValue === "yes") {
          collect();
          const lines = d.querySelector("textarea").value.split(/\r?\n/).map((l) => l.split("\t")).filter((c) => c.some((x) => x.trim()));
          const num = (v) => String(v || "").replace(/[^\d]/g, "");
          lines.forEach((c) => { if (!num(c[2]) && !num(c[3])) return; rows.push({ cat: (c[0] || "").trim(), item: (c[1] || "").trim(), price_min: num(c[2]), price_max: num(c[3]), note: (c[4] || "").trim() }); });
          dirty = true;
          draw();
        }
        d.remove();
      });
      document.body.append(d);
      d.showModal();
      return;
    }
    const save = e.target.closest("[data-save]");
    if (save) {
      collect();
      await busy(save, async () => {
        try { const r = await api("/prices", { method: "PUT", json: { prices: rows } }); dirty = false; toast(`${r.n}개 항목을 게시했습니다.`); await prices(body); } catch (err) { toast(err.message, { bad: true }); }
      });
    }
  });
}

/* ---------- ad and analytics codes ---------- */
const TAG_ROWS = [
  ["naver", "네이버 애널리틱스", "s_로 시작하는 값 (네이버 검색광고 전환 추적에도 씁니다)"],
  ["ga4", "구글 애널리틱스 4", "G-로 시작하는 측정 ID"],
  ["gads", "구글 광고", "AW-로 시작하는 ID"],
  ["gadsLabel", "구글 광고 전환 라벨", "상담 신청 전환의 라벨 (AW-… 다음의 / 뒤 값)"],
  ["meta", "메타(인스타·페북) 픽셀", "숫자로 된 픽셀 ID"],
  ["kakao", "카카오 픽셀 (방문)", "숫자로 된 픽셀 ID"],
  ["kakaoConv", "카카오 픽셀 (전환)", "상담 신청을 셀 픽셀 ID (방문과 같으면 비워 두세요)"],
];
async function tags(body, me) {
  const { tags: t, defaults, smsTo, smsDefault } = await api("/tags");
  const owner = me.role === "owner";
  body.innerHTML = String(html`<section class="panel" style="max-width:860px">
    <div class="panel-head"><h2>광고·분석 코드</h2><span class="sub">비운 칸은 꺼집니다</span></div>
    <form class="panel-body stack" novalidate data-tags>
      <div class="note-box">${icon("info")}<span>도메인을 옮기기 전 예전 사이트에 달려 있던 코드로 채워 두었습니다. 상담이 <b>실제로 접수된 순간에만</b> 전환으로 보내고, 이름과 번호는 광고 회사로 보내지 않습니다. 로그인한 직원이 보는 홈페이지에는 코드를 넣지 않습니다.</span></div>
      <div class="form-grid">${TAG_ROWS.map(([k, l, hint]) => html`<div class="field"><label for="tg-${k}">${l} <span class="${t[k] ? "on" : "off"} small">${t[k] ? "켜짐" : "꺼짐"}</span></label>
        <input class="input" id="tg-${k}" name="${k}" value="${t[k] || ""}" placeholder="${defaults[k] || ""}" ${owner ? "" : "readonly"} autocomplete="off" spellcheck="false"><span class="hint">${hint}</span></div>`)}
        <div class="field"><label for="tg-metaEvent">메타 전환 이벤트</label><select class="select" id="tg-metaEvent" name="metaEvent" ${owner ? "" : "disabled"}>
          ${["CompleteRegistration", "Lead", "Contact", "SubmitApplication", "Schedule"].map((v) => html`<option ${(t.metaEvent || "CompleteRegistration") === v ? "selected" : ""}>${v}</option>`)}</select>
          <span class="hint">예전 사이트는 CompleteRegistration을 썼습니다. 광고가 이 이벤트로 최적화되어 있다면 그대로 두세요.</span></div>
      </div>
      <h3 style="margin-top:8px">문자 상담 받는 번호</h3>
      <div class="field"><label for="tg-smsTo">휴대폰 번호</label>
        <input class="input" id="tg-smsTo" name="smsTo" value="${smsTo || ""}" placeholder="${smsDefault}" inputmode="tel" ${owner ? "" : "readonly"} autocomplete="off">
        <span class="hint">SMS빠른상담을 신청한 분의 휴대폰에서 문자 앱이 이 번호로 열립니다. 신청 내용은 관리자에도 그대로 쌓입니다. 비우면 ${smsDefault}(대표 번호)로 열리니, 문자를 받을 수 있는 휴대폰 번호를 넣어 주세요.</span></div>
      <div class="warn-box">${icon("alert")}<span>구글 광고의 상담 전환 이름이 “상담문의 [본여성클리닉]”으로 되어 있습니다. 다른 병원 이름이라 광고 계정 담당자에게 맞는 전환인지 확인해 주세요.</span></div>
      <p class="help">코드를 켜면 개인정보처리방침의 ‘행태정보’ 항목에 그 사업자가 적혀 있어야 합니다. 지금 방침에는 네이버, 구글, 메타, 카카오가 들어 있습니다.</p>
      ${owner ? html`<div class="row"><span class="spacer"></span><button class="btn btn-primary" type="submit">저장</button></div>` : html`<p class="muted small">코드는 대표 관리자만 바꿀 수 있습니다.</p>`}
    </form></section>`);
  const f = $("[data-tags]", body);
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const json = {};
    [...TAG_ROWS.map(([k]) => k), "metaEvent", "smsTo"].forEach((k) => { json[k] = f[k].value.trim(); });
    await busy($("button[type=submit]", f), async () => {
      try { await api("/tags", { method: "PUT", json }); toast("저장했습니다. 홈페이지에 바로 반영됩니다."); await tags(body, me); } catch (err) { toast(err.message, { bad: true }); }
    });
  });
}
