// 게시판: the list of posts written here, and the editor (pictures placed in the body with [사진 N], a YouTube link
// for a video post, the before/after fields with the patient's consent) with a preview that reads like the site's page.
import { $, $$, html, esc, icon, api, toast, confirmBox, busy, debounce, kst, skeleton, empty, errorBox } from "./lib.js";

const CATS = { news: "해운누리 소식", column: "전문칼럼", video: "유튜브" };
const BASE = { news: "/sub/board/page01/", column: "/sub/media/page02/", video: "/sub/media/page01/" };
const postUrl = (p) => (p.cat === "video" ? BASE.video : `${BASE[p.cat] || BASE.news}${p.id}/`);
const PARTS = {}; // 얼굴본의 전후사진 부위: 해운누리에는 없음
const LEGAL = "치료 효과와 회복 기간은 사람마다 다를 수 있습니다.";
const ymdDot = (d) => { const k = kst(d); return `${k.y}.${String(k.m).padStart(2, "0")}.${String(k.d).padStart(2, "0")}`; };
const ytId = (url) => (String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/) || [])[1] || null;

/* ---------- the list ---------- */
export async function renderList(ctx) {
  const { page, setTitle, setActions, signal } = ctx;
  setTitle("게시판");
  setActions(html`<a class="btn btn-sm hide-m" href="/sub/board/page01/" target="_blank" rel="noopener">${icon("external", "i-sm")}홈페이지 소식 보기</a><a class="btn btn-sm btn-primary" href="/admin/posts/new">${icon("plus", "i-sm")}새 글</a>`);
  let cat = ctx.query.get("cat") || "";
  let posts = [];
  page.innerHTML = String(html`<div class="chips" data-cats style="margin-bottom:14px"></div><div data-list>${skeleton(5)}</div>
    <div class="note-box" style="margin-top:16px">${icon("info")}<span>해운누리 소식은 ‘공지사항’ 메뉴에, 전문칼럼과 유튜브는 ‘해운누리 미디어’ 메뉴에 올라갑니다. 숨긴 글은 홈페이지에 보이지 않습니다.</span></div>`);
  const cats = $("[data-cats]", page);
  const listEl = $("[data-list]", page);
  const draw = () => {
    const shown = posts.filter((p) => (cat === "hidden" ? !p.published : !cat || p.cat === cat));
    const n = (k) => posts.filter((p) => (k === "hidden" ? !p.published : !k || p.cat === k)).length;
    cats.innerHTML = String(html`${[["", "전체"], ...Object.entries(CATS), ["hidden", "숨긴 글"]].map(([k, l]) => html`<button class="chip" type="button" data-cat="${k}" aria-pressed="${cat === k}">${l}<span class="n">${n(k)}</span></button>`)}`);
    if (!shown.length) { listEl.innerHTML = String(html`<div class="panel">${empty("file", cat ? "이 분류에 글이 없습니다" : "아직 쓴 글이 없습니다", "‘새 글’을 눌러 해운누리 소식, 전문칼럼, 유튜브 영상을 올려 보세요.")}</div>`); return; }
    listEl.innerHTML = String(html`<div class="panel"><div class="table-wrap"><table class="tbl"><thead><tr><th>제목</th><th class="hide-m">분류</th><th class="hide-m">쓴 날</th><th>상태</th><th class="r">관리</th></tr></thead><tbody>
      ${shown.map((p) => html`<tr>
        <td class="wrap"><div class="cell-main"><a href="/admin/posts/${p.id}"><strong>${p.title}</strong></a>${p.pics ? html`<span class="tag">${icon("image", "i-sm")}${p.pics}</span>` : ""}</div><div class="cell-sub">${p.excerpt || ""}</div></td>
        <td class="hide-m nowrap">${CATS[p.cat]}</td><td class="hide-m nowrap">${ymdDot(p.created_at)}</td>
        <td>${p.published ? html`<span class="pill t-surgery">공개</span>` : html`<span class="pill t-hold">숨김</span>`}</td>
        <td class="r nowrap"><a class="btn btn-sm btn-ghost" href="${postUrl(p)}" target="_blank" rel="noopener" title="홈페이지에서 보기">${icon("external", "i-sm")}</a>
          <a class="btn btn-sm" href="/admin/posts/${p.id}">수정</a>
          <button class="btn btn-sm" type="button" data-toggle="${p.id}">${p.published ? "숨김" : "공개"}</button>
          <button class="btn btn-sm btn-ghost" type="button" data-del="${p.id}" aria-label="삭제" title="삭제">${icon("trash", "i-sm")}</button></td></tr>`)}
      </tbody></table></div></div>`);
  };
  const load = async () => {
    try { ({ posts } = await api("/posts", { signal })); draw(); } catch (e) { if (e.name !== "AbortError") listEl.innerHTML = String(errorBox(e.message)); }
  };
  page.addEventListener("click", async (e) => {
    const c = e.target.closest("[data-cat]");
    if (c) { cat = c.dataset.cat; ctx.setQuery({ cat }); draw(); return; }
    const t = e.target.closest("[data-toggle]");
    if (t) {
      const p = posts.find((x) => x.id === Number(t.dataset.toggle));
      await busy(t, async () => {
        try { await api(`/posts/${p.id}`, { method: "PATCH", json: { published: !p.published } }); toast(p.published ? "숨겼습니다. 홈페이지에서 보이지 않습니다." : "공개했습니다."); await load(); } catch (err) { toast(err.message, { bad: true }); }
      });
      return;
    }
    const del = e.target.closest("[data-del]");
    if (del) {
      const p = posts.find((x) => x.id === Number(del.dataset.del));
      if (!(await confirmBox({ title: `“${p.title}”을 지울까요?`, body: "사진까지 지워지고 되돌릴 수 없습니다. 잠시 내리려면 ‘숨김’을 쓰세요.", ok: "지우기", danger: true }))) return;
      try { await api(`/posts/${p.id}`, { method: "DELETE" }); toast("지웠습니다."); await load(); } catch (err) { toast(err.message, { bad: true }); }
    }
  });
  await load();
}

/* ---------- the body as the site shows it (server/render.js, in the browser) ---------- */
function inline(text) {
  let t = esc(text);
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|tel:|mailto:)[^\s)]+|[\w.-]+\.html(?:#[\w-]*)?)\)/g, (m, label, href) => `<a href="${href}" target="_blank" rel="noopener">${label}</a>`);
  return t;
}
function bodyHtml(body, pics, used) {
  const out = [];
  let para = [];
  let list = [];
  const flushP = () => { if (para.length) { out.push(`<p>${para.map(inline).join("<br>")}</p>`); para = []; } };
  const flushL = () => { if (list.length) { out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`); list = []; } };
  for (const rawLine of String(body || "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    const pic = line.match(/^\[사진\s*(\d+)\]$/);
    if (!line) { flushP(); flushL(); continue; }
    if (pic) { flushP(); flushL(); const p = pics[Number(pic[1]) - 1]; if (p) { used.add(p); out.push(`<figure><img src="${esc(p.src)}" alt=""></figure>`); } else out.push(`<p class="muted">[사진 ${esc(pic[1])}: 없는 번호]</p>`); continue; }
    if (/^##\s+/.test(line)) { flushP(); flushL(); out.push(`<h3>${inline(line.replace(/^##\s+/, ""))}</h3>`); continue; }
    if (/^[-•·]\s+/.test(line)) { flushP(); list.push(line.replace(/^[-•·]\s+/, "")); continue; }
    flushL();
    para.push(line);
  }
  flushP(); flushL();
  return out.join("");
}

/* ---------- the editor ---------- */
export async function renderEditor(ctx) {
  const { page, setTitle, setActions, params } = ctx;
  const id = params[0] === "new" ? 0 : Number(params[0]);
  setTitle(id ? "글 고치기" : "새 글");
  setActions(html`<a class="btn btn-sm btn-ghost" href="/admin/posts">목록</a>`);
  page.innerHTML = String(skeleton(8));
  let post = { cat: "news", title: "", body: "", youtube: "", ba_proc: "", ba_after: "", ba_parts: [], consent: false, published: true };
  let pics = []; // in order: { id, src } kept, or { file, src } new
  if (id) {
    try { const r = await api(`/posts/${id}`, { signal: ctx.signal }); post = r.post; pics = r.media.map((m) => ({ id: m.id, src: `/media/${m.id}?s=t` })); } catch (e) { page.innerHTML = String(errorBox(e.message)); return; }
  }
  let dirty = false;
  page.innerHTML = String(html`<div class="editor">
    <form class="panel" novalidate data-editor>
      <div class="panel-body editor-form">
        <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:8px">분류</legend>
          <div class="chips">${Object.entries(CATS).map(([k, l]) => html`<label class="chip${post.cat === k ? " is-on" : ""}"><input class="sr-only" type="radio" name="cat" value="${k}" ${post.cat === k ? "checked" : ""}>${l}</label>`)}</div></fieldset>
        <div class="field"><label for="p-title">제목</label><input class="input" id="p-title" name="title" maxlength="120" value="${post.title}" placeholder="예: 추석 연휴 진료 안내" required></div>
        <div class="field"><label for="p-body">본문</label>
          <div><div class="toolbar" role="toolbar" aria-label="본문 꾸미기">
            <button class="btn btn-sm btn-ghost" type="button" data-tool="bold" title="굵게">${icon("bold", "i-sm")}굵게</button>
            <button class="btn btn-sm btn-ghost" type="button" data-tool="head" title="소제목">${icon("heading", "i-sm")}소제목</button>
            <button class="btn btn-sm btn-ghost" type="button" data-tool="list" title="목록">${icon("list", "i-sm")}목록</button>
            <button class="btn btn-sm btn-ghost" type="button" data-tool="link" title="링크">${icon("link", "i-sm")}링크</button>
            <button class="btn btn-sm btn-ghost" type="button" data-tool="pic" title="사진 넣기">${icon("image", "i-sm")}사진 넣기</button>
          </div><textarea class="textarea" id="p-body" name="body" rows="12" placeholder="문단 사이는 한 줄을 비우세요.">${post.body}</textarea></div>
          <p class="help"><code>**굵게**</code> · 줄 앞에 <code>## </code> 소제목 · <code>- </code> 목록 · <code>[글자](주소)</code> 링크 · 한 줄에 <code>[사진 2]</code>를 쓰면 두 번째 사진이 그 자리에 들어갑니다. 본문에 넣지 않은 사진은 맨 위와 끝에 붙습니다.</p></div>
        <div class="field"><span class="label">사진 <span class="muted">(한 장 10MB, 한 번에 20장까지)</span></span>
          <label class="drop" data-drop>${icon("image", "i-lg")}<strong>사진을 끌어다 놓거나 눌러서 고르세요</strong><span class="small">휴대폰에서는 사진첩이나 카메라가 열립니다</span>
            <input class="sr-only" type="file" accept="image/*" multiple data-files></label>
          <ol class="pics" data-pics></ol></div>
        <div class="field" data-for="video" hidden><label for="p-yt">유튜브 주소</label><input class="input" id="p-yt" name="youtube" value="${post.youtube || ""}" placeholder="https://www.youtube.com/watch?v=…" inputmode="url"><div data-yt-thumb></div></div>
        <div class="stack" data-for="photo" hidden>
          <div class="form-grid">
            <div class="field"><label for="p-proc">시술 이름</label><input class="input" id="p-proc" name="ba_proc" maxlength="120" value="${post.ba_proc || ""}" placeholder="예: 눈매교정 + 앞트임"></div>
            <div class="field"><label for="p-after">수술 뒤 경과</label><input class="input" id="p-after" name="ba_after" maxlength="60" value="${post.ba_after || ""}" placeholder="예: 3개월"></div>
          </div>
          <div class="field"><span class="label">부위</span><div class="chips">${Object.entries(PARTS).map(([k, l]) => html`<button class="chip" type="button" data-part="${k}" aria-pressed="${(post.ba_parts || []).includes(k)}">${l}</button>`)}</div></div>
          <label class="check"><input type="checkbox" name="consent" ${post.consent ? "checked" : ""}>환자분이 사진을 홈페이지에 올리는 데 글로 동의했습니다 (필수)</label>
          <p class="help">의료법에 따라 치료 경험담이나 과장된 표현은 쓸 수 없습니다. 올린 글에는 부작용 안내 문구가 자동으로 붙습니다.</p>
        </div>
        <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:8px">공개</legend>
          <div class="chips"><label class="chip${post.published ? " is-on" : ""}"><input class="sr-only" type="radio" name="pub" value="1" ${post.published ? "checked" : ""}>바로 공개</label>
          <label class="chip${post.published ? "" : " is-on"}"><input class="sr-only" type="radio" name="pub" value="0" ${post.published ? "" : "checked"}>숨김 (직원만 보기)</label></div></fieldset>
        <p class="err small" data-err role="alert"></p>
      </div>
      <div class="panel-foot row"><span class="spacer"></span><a class="btn" href="/admin/posts">취소</a><button class="btn btn-primary" type="submit" data-save>${id ? "고친 내용 저장" : "글 올리기"}</button></div>
    </form>
    <aside class="panel preview" aria-label="미리보기"><div class="panel-head"><h3>미리보기</h3><span class="sub">홈페이지에 이렇게 보입니다</span></div><div class="preview-body" data-preview></div></aside>
  </div>`);

  const form = $("[data-editor]", page);
  const body = form.body;
  const picsEl = $("[data-pics]", page);
  const preview = $("[data-preview]", page);
  const catNow = () => form.cat.value;
  const partsNow = () => $$("[data-part][aria-pressed=\"true\"]", form).map((b) => b.dataset.part);
  const syncCat = () => {
    $$("[data-for]", form).forEach((s) => { s.hidden = s.dataset.for !== catNow(); });
    $$('input[name="cat"]', form).forEach((r) => r.closest(".chip").classList.toggle("is-on", r.checked));
  };
  const drawPreview = () => {
    const used = new Set();
    const bodyPart = bodyHtml(body.value, pics, used);
    const rest = pics.filter((p) => !used.has(p));
    const top = rest.shift();
    const y = ytId(form.youtube.value);
    const cat = catNow();
    preview.innerHTML = `<p class="muted small">${esc(CATS[cat])} · ${esc(ymdDot(post.created_at || Date.now()))}</p>
      <h1>${esc(form.title.value || "제목")}</h1>
      ${top ? `<figure><img src="${esc(top.src)}" alt=""></figure>` : ""}
      ${cat === "video" && y ? `<figure><img src="https://i.ytimg.com/vi/${y}/hqdefault.jpg" alt=""><figcaption class="muted small">유튜브 영상이 이 자리에서 재생됩니다</figcaption></figure>` : ""}
      ${cat === "photo" && (form.ba_proc.value || form.ba_after.value) ? `<p class="small"><strong>시술</strong> ${esc(form.ba_proc.value)} · <strong>경과</strong> ${esc(form.ba_after.value)}</p>` : ""}
      ${bodyPart || '<p class="muted">본문을 쓰면 여기에 보입니다.</p>'}
      ${rest.map((p) => `<figure><img src="${esc(p.src)}" alt=""></figure>`).join("")}
      ${cat !== "column" ? "" : `<p class="note">${cat === "photo" ? "환자분의 동의를 받아 올린 사진입니다. " : ""}${esc(LEGAL)}</p>`}`;
  };
  const preview$ = debounce(drawPreview, 200);
  const drawPics = () => {
    picsEl.innerHTML = String(html`${pics.map((p, i) => html`<li><img src="${p.src}" alt="사진 ${i + 1}"><span class="no">${i + 1}</span>
      <span class="acts"><button class="btn btn-sm" type="button" data-put="${i}">본문에 넣기</button><button class="btn btn-sm btn-ghost" type="button" data-out="${i}" aria-label="사진 ${i + 1} 빼기">${icon("x", "i-sm")}</button></span></li>`)}`);
    drawPreview();
  };
  const insert = (before, after = "", line = false) => {
    const { selectionStart: a, selectionEnd: z, value } = body;
    const sel = value.slice(a, z);
    const lead = line && a > 0 && value[a - 1] !== "\n" ? "\n" : "";
    body.setRangeText(`${lead}${before}${sel}${after}`, a, z, "end");
    body.focus();
    dirty = true;
    drawPreview();
  };
  const addFiles = (files) => {
    [...files].filter((f) => f.type.startsWith("image/")).forEach((f) => {
      if (f.size > 10 * 1024 * 1024) { toast(`“${f.name}”은 10MB가 넘습니다.`, { bad: true }); return; }
      pics.push({ file: f, src: URL.createObjectURL(f) });
    });
    if (pics.length > 20) { pics = pics.slice(0, 20); toast("사진은 20장까지 올릴 수 있습니다.", { bad: true }); }
    dirty = true;
    drawPics();
  };
  const drop = $("[data-drop]", form);
  $("[data-files]", form).addEventListener("change", (e) => { addFiles(e.target.files); e.target.value = ""; });
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); if (ev === "drop") addFiles(e.dataTransfer.files); }));
  picsEl.addEventListener("click", (e) => {
    const put = e.target.closest("[data-put]");
    if (put) { insert(`[사진 ${Number(put.dataset.put) + 1}]\n`, "", true); return; }
    const out = e.target.closest("[data-out]");
    if (out) { const i = Number(out.dataset.out); if (pics[i].file) URL.revokeObjectURL(pics[i].src); pics.splice(i, 1); dirty = true; drawPics(); }
  });
  $$("[data-tool]", form).forEach((b) => b.addEventListener("click", () => {
    const t = b.dataset.tool;
    if (t === "bold") insert("**", "**");
    else if (t === "head") insert("## ", "", true);
    else if (t === "list") insert("- ", "", true);
    else if (t === "link") { const url = prompt("연결할 주소를 넣어 주세요.", "https://"); if (url && url !== "https://") insert("[", `](${url.trim()})`); }
    else if (t === "pic") {
      if (!pics.length) { toast("먼저 아래에서 사진을 올려 주세요."); return; }
      const n = pics.length === 1 ? "1" : prompt(`몇 번째 사진을 넣을까요? (1~${pics.length})`, "1");
      if (n && Number(n) >= 1 && Number(n) <= pics.length) insert(`[사진 ${Number(n)}]\n`, "", true);
    }
  }));
  $$("[data-part]", form).forEach((b) => b.addEventListener("click", () => { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); dirty = true; }));
  $$('input[name="pub"]', form).forEach((r) => r.addEventListener("change", () => $$('input[name="pub"]', form).forEach((x) => x.closest(".chip").classList.toggle("is-on", x.checked))));
  $$('input[name="cat"]', form).forEach((r) => r.addEventListener("change", () => { syncCat(); drawPreview(); }));
  form.addEventListener("input", () => { dirty = true; preview$(); });
  const ytThumb = () => { const y = ytId(form.youtube.value); $("[data-yt-thumb]", form).innerHTML = y ? `<img class="yt-thumb" src="https://i.ytimg.com/vi/${y}/mqdefault.jpg" alt="영상 미리보기">` : form.youtube.value ? '<p class="err">유튜브 주소를 확인해 주세요.</p>' : ""; };
  form.youtube.addEventListener("input", ytThumb);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("[data-err]", form);
    err.textContent = "";
    const cat = catNow();
    if (!form.title.value.trim()) { err.textContent = "제목을 적어 주세요."; form.title.focus(); return; }
    if (cat === "video" && !ytId(form.youtube.value)) { err.textContent = "영상 글에는 유튜브 주소가 필요합니다."; form.youtube.focus(); return; }
    if (cat === "photo" && !form.consent.checked) { err.textContent = "전후사진은 환자 동의를 확인해야 올릴 수 있습니다."; return; }
    if (cat === "photo" && !pics.length) { err.textContent = "전후사진 글에는 사진이 필요합니다."; return; }
    const fd = new FormData();
    fd.append("cat", cat);
    fd.append("title", form.title.value);
    fd.append("body", body.value);
    fd.append("youtube", cat === "video" ? form.youtube.value : "");
    fd.append("ba_proc", form.ba_proc.value);
    fd.append("ba_after", form.ba_after.value);
    fd.append("ba_parts", partsNow().join(","));
    fd.append("consent", form.consent.checked ? "1" : "0");
    fd.append("published", form.pub.value);
    fd.append("keep", pics.filter((p) => p.id).map((p) => p.id).join(","));
    pics.filter((p) => p.file).forEach((p) => fd.append("pics", p.file, p.file.name));
    await busy($("[data-save]", form), async () => {
      try {
        const r = await api(id ? `/posts/${id}` : "/posts", { method: id ? "PUT" : "POST", form: fd });
        dirty = false;
        toast(id ? "고쳤습니다." : "올렸습니다.", { link: { href: r.url, label: "홈페이지에서 보기" } });
        ctx.go("/admin/posts", { replace: !id });
      } catch (e2) { err.textContent = e2.message; }
    });
  });
  const leave = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
  window.addEventListener("beforeunload", leave);
  syncCat();
  ytThumb();
  drawPics();
  (id ? form.body : form.title).focus();
  return () => { window.removeEventListener("beforeunload", leave); pics.forEach((p) => p.file && URL.revokeObjectURL(p.src)); };
}
