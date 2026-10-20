// 설정: my account, the staff accounts (owner), where new consultations are announced, the addresses the visit counter
// leaves out, how long consultations are kept, and the 접속 기록 (owner).
import { $, $$, html, icon, api, toast, confirmBox, busy, full, short, skeleton, errorBox, empty, num } from "./lib.js";
import * as importer from "./importer.js";

const ACTIONS = {
  login: "로그인", "login.fail": "로그인 실패", logout: "로그아웃", "consult.view": "상담 열람", "consult.update": "상담 수정", "consult.note": "메모 작성",
  "consult.note.delete": "메모 삭제", "consult.delete": "상담 삭제", "consult.create": "상담 직접 등록", "consult.export": "상담 내려받기",
  "user.create": "계정 만듦", "user.update": "계정 수정", "user.delete": "계정 삭제", "me.password": "비밀번호 변경", "me.name": "이름 변경",
  "me.logout-others": "다른 기기 로그아웃", "settings.update": "설정 변경", "post.create": "글 올림", "post.update": "글 수정", "post.hide": "글 숨김",
  "post.show": "글 공개", "post.delete": "글 삭제", retention: "보관 기간 파기", "consult.import": "예전 상담 가져옴",
  "popup.create": "팝업 올림", "popup.update": "팝업 수정", "popup.delete": "팝업 삭제", "prices.update": "비급여 진료비용 게시",
};
const AUDIT_FILTERS = [["", "전체"], ["login", "로그인"], ["consult", "상담"], ["post", "게시판"], ["user", "계정"], ["settings", "설정"]];
const RETENTION = [[0, "자동으로 지우지 않음 (기본)"], [36, "3년"], [24, "2년"], [12, "1년"], [6, "6개월"], [3, "3개월"]];
const tempPw = () => {
  const a = "abcdefghjkmnpqrstuvwxyz";
  const n = "23456789";
  const pick = (s, k) => Array.from(crypto.getRandomValues(new Uint32Array(k)), (x) => s[x % s.length]).join("");
  return `${pick(a, 4)}${pick(n, 4)}${pick("!@#%", 1)}${pick(a.toUpperCase(), 2)}`;
};

export async function render(ctx) {
  const { page, setTitle, me, signal } = ctx;
  setTitle("설정");
  page.innerHTML = String(skeleton(6));
  let s;
  try { s = await api("/settings", { signal }); } catch (e) { if (e.name !== "AbortError") page.innerHTML = String(errorBox(e.message)); return; }
  const owner = me.role === "owner";
  const notifyOn = (() => { try { return localStorage.getItem("fb-admin-notify") === "1"; } catch { return false; } })();
  const perm = "Notification" in window ? Notification.permission : "unsupported";
  page.innerHTML = String(html`<div class="set-grid">
    <nav class="set-nav" aria-label="설정 목차">
      <a href="#me">내 계정</a>${owner ? html`<a href="#staff">직원 계정</a>` : ""}<a href="#notify">새 상담 알림</a><a href="#counter">방문 집계</a>${owner ? html`<a href="#import">예전 상담 가져오기</a><a href="#privacy">개인정보 보관</a><a href="#audit">접속 기록</a>` : ""}
    </nav>
    <div class="stack">
      <section class="panel" id="me">
        <div class="panel-head"><h2>내 계정</h2><span class="sub">${me.login} · ${owner ? "대표 관리자" : "직원"}</span></div>
        <div class="panel-body">
          <form class="form-grid" data-name novalidate><div class="field"><label for="s-name">이름 <span class="muted">(메모와 기록에 보이는 이름)</span></label><input class="input" id="s-name" name="name" maxlength="20" value="${me.name}" required></div>
            <div class="field" style="align-self:end"><button class="btn" type="submit" style="justify-self:start">이름 저장</button></div></form>
          ${owner && s.owner_password ? html`<div class="note-box" style="margin-top:16px">${icon("lock")}<span>대표 관리자(admin) 비밀번호는 Railway의 web 서비스 → Variables → <strong>ADMIN_PASSWORD</strong>에서 바꿉니다. 바꾸면 모든 기기에서 다시 로그인해야 합니다.</span></div>` : html`
          <form class="form-grid" data-pw style="margin-top:18px" novalidate>
            <div class="field"><label for="s-cur">지금 비밀번호</label><input class="input" id="s-cur" name="current" type="password" autocomplete="current-password" required></div>
            <div class="field"><label for="s-new">새 비밀번호</label><input class="input" id="s-new" name="next" type="password" autocomplete="new-password" minlength="8" required><span class="hint">8자 이상, 영문·숫자·특수문자 중 두 가지 이상</span></div>
            <div class="field"><button class="btn" type="submit" style="justify-self:start">비밀번호 바꾸기</button></div></form>`}
          <div class="form-actions"><button class="btn btn-ghost" type="button" data-logout-others>${icon("logout", "i-sm")}다른 기기에서 모두 로그아웃</button></div>
        </div>
      </section>

      ${owner ? html`<section class="panel" id="staff">
        <div class="panel-head"><h2>직원 계정</h2><span class="sub">한 사람에 한 계정 (개인정보 안전성 확보조치)</span></div>
        <div data-users>${skeleton(3)}</div>
        <div class="panel-body" style="border-top:1px solid var(--line-2)">
          <p class="strong" style="margin-bottom:10px">계정 추가</p>
          <form class="form-grid" data-add-user novalidate>
            <div class="field"><label for="u-name">이름</label><input class="input" id="u-name" name="name" maxlength="20" placeholder="김실장" required autocomplete="off"></div>
            <div class="field"><label for="u-login">아이디</label><input class="input" id="u-login" name="login" maxlength="20" placeholder="영문 소문자·숫자" autocapitalize="off" spellcheck="false" required autocomplete="off"></div>
            <div class="field"><label for="u-pw">처음 비밀번호</label><div class="row" style="flex-wrap:nowrap"><input class="input" id="u-pw" name="password" value="${tempPw()}" required autocomplete="off"><button class="btn" type="button" data-regen title="새로 만들기">${icon("refresh", "i-sm")}</button></div>
              <span class="hint">직원에게 전하고, 로그인한 뒤 설정에서 바꾸게 하세요.</span></div>
            <div class="field" style="align-self:start;padding-top:24px"><button class="btn btn-primary" type="submit" style="justify-self:start">${icon("plus", "i-sm")}계정 만들기</button></div>
          </form>
          <p class="err small" data-user-err role="alert"></p>
        </div>
      </section>` : ""}

      <section class="panel" id="notify">
        <div class="panel-head"><h2>새 상담 알림</h2></div>
        <div class="panel-body">
          <div class="status-line"><strong>이 기기 알림<span class="muted small" style="display:block;font-weight:500">관리자 화면이 열려 있을 때 새 상담이 오면 화면 알림을 띄웁니다</span></strong>
            ${perm === "unsupported" ? html`<span class="off">이 브라우저는 지원하지 않음</span>` : perm === "denied" ? html`<span class="off">브라우저에서 막힘</span>` : html`<label class="check"><input type="checkbox" data-notify ${notifyOn && perm === "granted" ? "checked" : ""}>켜기</label>`}</div>
          <div class="status-line"><strong>메신저 웹훅<span class="muted small" style="display:block;font-weight:500">슬랙, 디스코드, 구글 챗, 텔레그램</span></strong>${s.notify.webhook ? html`<span class="on">연결됨</span>` : html`<span class="off">없음</span>`}</div>
          <div class="status-line"><strong>이메일<span class="muted small" style="display:block;font-weight:500">SMTP로 보내는 메일</span></strong>${s.notify.email ? html`<span class="on">연결됨</span>` : html`<span class="off">없음</span>`}</div>
          ${owner ? html`<div class="form-actions"><button class="btn" type="button" data-test-notify ${s.notify.webhook || s.notify.email ? "" : "disabled"}>${icon("send", "i-sm")}시험 알림 보내기</button></div>` : ""}
          <p class="help" style="margin-top:12px">웹훅이나 메일은 Railway의 web 서비스 Variables에 넣습니다: <code>NOTIFY_WEBHOOK_URL</code>, 또는 <code>NOTIFY_EMAIL</code>과 <code>SMTP_URL</code>(예: smtps://아이디:앱비밀번호@smtp.gmail.com:465). 알림에는 이름과 전화번호를 넣지 않고, 종류·부위·시간과 관리자 링크만 보냅니다.</p>
        </div>
      </section>

      <section class="panel" id="counter">
        <div class="panel-head"><h2>방문 집계</h2></div>
        <div class="panel-body">
          <p class="muted small" style="margin-bottom:12px">로그인한 직원이 보는 홈페이지는 원래 세지 않습니다. 병원 컴퓨터를 로그인 없이 쓸 때도 빼려면 병원 인터넷의 IP를 넣으세요. 지금 이 기기의 IP는 <span class="code">${s.my_ip}</span>입니다.</p>
          <form data-ips novalidate><div class="field"><label for="s-ips">집계에서 뺄 IP <span class="muted">(한 줄에 하나)</span></label><textarea class="textarea" id="s-ips" name="ips" rows="3" ${owner ? "" : "readonly"} placeholder="예: 211.234.10.20">${s.exclude_ips}</textarea></div>
            ${owner ? html`<div class="form-actions"><button class="btn" type="button" data-add-ip>${icon("plus", "i-sm")}지금 이 기기 IP 넣기</button><button class="btn btn-primary" type="submit">저장</button></div>` : ""}</form>
        </div>
      </section>

      ${owner ? html`<section class="panel" id="import">
        <div class="panel-head"><h2>예전 상담 가져오기</h2><span class="sub">예전 관리자의 상담 목록 엑셀</span></div>
        <div data-importer></div>
      </section>` : ""}

      ${owner ? html`<section class="panel" id="privacy">
        <div class="panel-head"><h2>개인정보 보관</h2></div>
        <div class="panel-body">
          <form class="form-grid" data-retention novalidate><div class="field"><label for="s-ret">상담 기록 보관 기간</label><select class="select" id="s-ret" name="months">${RETENTION.map(([v, l]) => html`<option value="${v}" ${s.retention_months === v ? "selected" : ""}>${l}</option>`)}</select>
            <span class="hint">기본은 아무것도 자동으로 지우지 않습니다. 기간을 정하면, 마지막으로 바뀐 날로부터 그 기간이 지난 상담을 메모·사진과 함께 지웁니다. 예전 사이트에서 옮겨 온 상담은 기간과 관계없이 지우지 않습니다.</span></div>
            <div class="field" style="align-self:start;padding-top:24px"><button class="btn btn-primary" type="submit" style="justify-self:start">저장</button></div></form>
          <ul class="help" style="margin-top:14px;display:grid;gap:4px;list-style:disc;padding-left:18px">
            <li>보관 기간을 정했을 때만, 스팸으로 분류한 신청을 30일 뒤 지웁니다. 정하지 않으면 스팸도 남겨 둡니다.</li>
            <li>방문 기록(이름·전화번호 없음)은 25개월, 접속 기록은 2년 동안 보관합니다.</li>
            <li>홈페이지 신청서의 안내 문구(“목적을 이룬 뒤 파기”)와 맞게 기간을 정해 주세요. 환자가 파기를 요청하면 상담 화면에서 바로 지울 수 있습니다.</li>
          </ul>
        </div>
      </section>

      <section class="panel" id="audit">
        <div class="panel-head"><h2>접속 기록</h2><div class="seg" role="group" aria-label="거르기" data-audit-filter>${AUDIT_FILTERS.map(([v, l]) => html`<button type="button" data-a="${v}" aria-pressed="${v === ""}">${l}</button>`)}</div></div>
        <div data-audit>${skeleton(4)}</div>
      </section>` : ""}
    </div>
  </div>`);

  // my account
  $("[data-name]", page).addEventListener("submit", async (e) => {
    e.preventDefault();
    await busy($("button", e.target), async () => {
      try { const r = await api("/me", { method: "PATCH", json: { name: e.target.name.value } }); window.dispatchEvent(new CustomEvent("admin:me", { detail: { name: r.user.name } })); toast("이름을 바꿨습니다."); } catch (err) { toast(err.message, { bad: true }); }
    });
  });
  $("[data-pw]", page)?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    await busy($("button", f), async () => {
      try { await api("/me/password", { method: "POST", json: { current: f.current.value, next: f.next.value } }); f.reset(); toast("비밀번호를 바꿨습니다. 다른 기기는 로그아웃됩니다."); } catch (err) { toast(err.message, { bad: true }); }
    });
  });
  $("[data-logout-others]", page).addEventListener("click", async (e) => {
    await busy(e.currentTarget, async () => {
      try { const r = await api("/me/logout-others", { method: "POST" }); toast(r.n ? `다른 기기 ${r.n}곳에서 로그아웃했습니다.` : "다른 기기에 로그인된 곳이 없습니다."); } catch (err) { toast(err.message, { bad: true }); }
    });
  });

  // notifications on this device
  $("[data-notify]", page)?.addEventListener("change", async (e) => {
    const box = e.target;
    if (box.checked) {
      const p = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (p !== "granted") { box.checked = false; toast("브라우저가 알림을 허용하지 않았습니다. 주소창의 자물쇠 아이콘에서 알림을 허용해 주세요.", { bad: true }); return; }
    }
    try { localStorage.setItem("fb-admin-notify", box.checked ? "1" : "0"); } catch { /* private mode */ }
    toast(box.checked ? "이 기기에서 새 상담 알림을 받습니다." : "이 기기의 알림을 껐습니다.");
  });
  $("[data-test-notify]", page)?.addEventListener("click", async (e) => {
    await busy(e.currentTarget, async () => {
      try { const r = await api("/notify-test", { method: "POST" }); toast(`보냈습니다: ${r.result.join(", ")}`); } catch (err) { toast(err.message, { bad: true }); }
    });
  });

  // the counter's excluded addresses
  $("[data-add-ip]", page)?.addEventListener("click", () => {
    const t = $("#s-ips", page);
    if (!t.value.split(/\s+/).includes(s.my_ip)) t.value = `${t.value.trim()}\n${s.my_ip}`.trim();
  });
  $("[data-ips]", page).addEventListener("submit", async (e) => {
    e.preventDefault();
    await busy($("button[type=submit]", e.target), async () => {
      try { await api("/settings", { method: "PUT", json: { exclude_ips: e.target.ips.value } }); toast("저장했습니다."); } catch (err) { toast(err.message, { bad: true }); }
    });
  });

  if (!owner) return;
  importer.mount($("[data-importer]", page));
  $("[data-retention]", page).addEventListener("submit", async (e) => {
    e.preventDefault();
    const m = Number(e.target.months.value);
    // turning deletion on, or shortening it: say how many records would go, and ask
    if (m && (!s.retention_months || m < s.retention_months)) {
      let n = null;
      try { n = (await api(`/settings/retention-preview?months=${m}`)).count; } catch { n = null; }
      const body = n === null ? `${m}개월이 지난 상담은 다음 정리 때(6시간 안에) 메모·사진과 함께 지워지고 되돌릴 수 없습니다.`
        : n ? `지금 기준으로 상담 ${n.toLocaleString("ko-KR")}건이 다음 정리 때(6시간 안에) 메모·사진과 함께 지워지고 되돌릴 수 없습니다. 예전 사이트에서 옮겨 온 상담은 지우지 않습니다.`
        : `지금 지워질 상담은 없습니다. 앞으로 ${m}개월이 지난 상담은 자동으로 지워집니다.`;
      if (!(await confirmBox({ title: s.retention_months ? "보관 기간을 줄일까요?" : "자동 파기를 켤까요?", body, ok: n ? `${n.toLocaleString("ko-KR")}건 지우기에 동의` : "켜기", danger: true }))) return;
    }
    await busy($("button", e.target), async () => {
      try { await api("/settings", { method: "PUT", json: { retention_months: m } }); s.retention_months = m; toast("저장했습니다."); } catch (err) { toast(err.message, { bad: true }); }
    });
  });

  // staff accounts
  const usersEl = $("[data-users]", page);
  const loadUsers = async () => {
    let list;
    try { list = (await api("/users")).users; } catch (e) { usersEl.innerHTML = String(errorBox(e.message)); return; }
    usersEl.innerHTML = String(html`<div class="table-wrap"><table class="tbl" style="min-width:600px"><thead><tr><th>이름</th><th>아이디</th><th>상태</th><th class="hide-m">마지막 로그인</th><th class="r">관리</th></tr></thead><tbody>
      ${list.map((u) => html`<tr>
        <td class="nowrap"><div class="cell-main"><strong>${u.name}</strong>${u.role === "owner" ? html`<span class="tag tag-blue">대표</span>` : ""}${u.online ? html`<span class="tag" title="12시간 안에 쓴 로그인">접속 중</span>` : ""}</div></td>
        <td class="nowrap">${u.login}</td>
        <td>${u.active ? html`<span class="pill t-surgery">사용</span>` : html`<span class="pill t-hold">멈춤</span>`}</td>
        <td class="hide-m nowrap muted">${u.last_login ? short(u.last_login) : "아직 없음"}</td>
        <td class="r nowrap">${u.role === "owner" ? html`<span class="muted small">Railway 변수로 관리</span>` : html`
          <button class="btn btn-sm" type="button" data-reset="${u.id}" data-name="${u.name}">비밀번호 초기화</button>
          <button class="btn btn-sm" type="button" data-active="${u.id}" data-on="${u.active ? "0" : "1"}">${u.active ? "멈추기" : "다시 쓰기"}</button>
          <button class="btn btn-sm btn-ghost" type="button" data-remove="${u.id}" data-name="${u.name}" aria-label="${u.name} 계정 지우기" title="지우기">${icon("trash", "i-sm")}</button>`}</td></tr>`)}
      </tbody></table></div>`);
  };
  usersEl.addEventListener("click", async (e) => {
    const reset = e.target.closest("[data-reset]");
    if (reset) {
      const pw = tempPw();
      if (!(await confirmBox({ title: `${reset.dataset.name} 님 비밀번호를 초기화할까요?`, body: `새 비밀번호는 ${pw} 입니다. 직원에게 전해 주세요. 그 직원의 모든 기기는 로그아웃됩니다.`, ok: "초기화" }))) return;
      try { await api(`/users/${reset.dataset.reset}`, { method: "PATCH", json: { password: pw } }); try { await navigator.clipboard.writeText(pw); toast("초기화했습니다. 새 비밀번호를 복사해 두었습니다."); } catch { toast(`초기화했습니다. 새 비밀번호: ${pw}`); } } catch (err) { toast(err.message, { bad: true }); }
      return;
    }
    const act = e.target.closest("[data-active]");
    if (act) {
      try { await api(`/users/${act.dataset.active}`, { method: "PATCH", json: { active: act.dataset.on === "1" } }); toast(act.dataset.on === "1" ? "다시 쓸 수 있게 했습니다." : "계정을 멈췄습니다. 그 직원은 바로 로그아웃됩니다."); loadUsers(); } catch (err) { toast(err.message, { bad: true }); }
      return;
    }
    const rm = e.target.closest("[data-remove]");
    if (rm) {
      if (!(await confirmBox({ title: `${rm.dataset.name} 님 계정을 지울까요?`, body: "그 직원이 남긴 메모와 기록은 남고, 담당으로 지정된 상담은 ‘담당 없음’이 됩니다. 잠시 막으려면 ‘멈추기’를 쓰세요.", ok: "지우기", danger: true }))) return;
      try { await api(`/users/${rm.dataset.remove}`, { method: "DELETE" }); toast("계정을 지웠습니다."); loadUsers(); } catch (err) { toast(err.message, { bad: true }); }
    }
  });
  const add = $("[data-add-user]", page);
  $("[data-regen]", add).addEventListener("click", () => { add.password.value = tempPw(); });
  add.login.addEventListener("input", () => { add.login.value = add.login.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""); });
  add.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("[data-user-err]", page);
    err.textContent = "";
    await busy($("button[type=submit]", add), async () => {
      try {
        await api("/users", { method: "POST", json: { name: add.name.value.trim(), login: add.login.value.trim(), password: add.password.value } });
        toast(`${add.name.value.trim()} 님 계정을 만들었습니다. 아이디 ${add.login.value.trim()}`);
        add.reset();
        add.password.value = tempPw();
        loadUsers();
      } catch (e2) { err.textContent = e2.message; }
    });
  });

  // 접속 기록
  const auditEl = $("[data-audit]", page);
  let aPage = 1;
  let aFilter = "";
  const loadAudit = async () => {
    let r;
    try { r = await api(`/audit?page=${aPage}${aFilter ? `&action=${aFilter}` : ""}`); } catch (e) { auditEl.innerHTML = String(errorBox(e.message)); return; }
    const pages = Math.max(1, Math.ceil(r.total / r.size));
    auditEl.innerHTML = String(r.items.length ? html`<div class="table-wrap"><table class="tbl tbl-compact"><thead><tr><th>시간</th><th>누가</th><th>무엇을</th><th class="hide-m">대상·내용</th><th class="hide-m">IP</th></tr></thead><tbody>
      ${r.items.map((a) => html`<tr><td class="nowrap" title="${full(a.at)}">${short(a.at)}</td><td class="nowrap">${a.who || (a.action === "login.fail" ? html`<span class="muted">${a.target}</span>` : html`<span class="muted">시스템</span>`)}</td>
        <td class="nowrap">${a.action === "login.fail" ? html`<span class="tag tag-warn">${ACTIONS[a.action]}</span>` : ACTIONS[a.action] || a.action}</td>
        <td class="hide-m"><span class="cell-sub" style="max-width:48ch;display:block">${[a.action === "login.fail" ? "" : a.target, a.detail].filter(Boolean).join(" · ")}</span></td><td class="hide-m nowrap muted">${a.ip || ""}</td></tr>`)}
      </tbody></table></div>
      <div class="panel-foot row"><span class="muted small">모두 ${num(r.total)}건 · ${aPage}/${pages}쪽</span><span class="spacer"></span>
        <button class="btn btn-sm" type="button" data-ap="-1" ${aPage <= 1 ? "disabled" : ""}>이전</button><button class="btn btn-sm" type="button" data-ap="1" ${aPage >= pages ? "disabled" : ""}>다음</button></div>`
      : empty("shield", "기록이 없습니다"));
  };
  auditEl.addEventListener("click", (e) => { const b = e.target.closest("[data-ap]"); if (b) { aPage += Number(b.dataset.ap); loadAudit(); } });
  $("[data-audit-filter]", page).addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    aFilter = b.dataset.a;
    aPage = 1;
    $$("[data-a]", page).forEach((x) => x.setAttribute("aria-pressed", x === b));
    loadAudit();
  });
  loadUsers();
  loadAudit();
}
