// 예전 상담 가져오기: the old admin's consultation list, read in this browser from the file the old vendor sends.
// .xlsx (read here without any library: the zip's two XML parts), .xls saved as an HTML table (what most Korean
// admin panels export), .csv and .tsv in UTF-8 or EUC-KR. The columns are matched by their Korean names and can be
// changed by hand before anything is sent; rows go to the server 300 at a time.
import { $, $$, html, icon, api, toast, busy, num } from "./lib.js";

/* ---------- reading the file ---------- */
function decode(buf) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { return new TextDecoder("euc-kr").decode(buf); }
}
function csvRows(text, sep) {
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') q = false; else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ""; } else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; } else cell += ch;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows;
}
function htmlRows(text) {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const table = [...doc.querySelectorAll("table")].sort((a, b) => b.rows.length - a.rows.length)[0];
  if (!table) return [];
  return [...table.rows].map((tr) => [...tr.cells].map((td) => {
    td.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    return td.textContent.replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim();
  }));
}
// .xlsx: find the central directory, inflate the shared strings and the first sheet
async function unzip(buf, wanted) {
  const v = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i -= 1) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("엑셀 파일을 읽지 못했습니다.");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out = {};
  for (let n = 0; n < count; n += 1) {
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!wanted.some((w) => (w instanceof RegExp ? w.test(name) : w === name))) continue;
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const data = new Uint8Array(buf, start, size);
    if (method === 0) out[name] = new TextDecoder().decode(data);
    else if (method === 8) out[name] = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
  }
  return out;
}
const colIndex = (ref) => { let n = 0; for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
async function xlsxRows(buf) {
  const files = await unzip(buf, ["xl/sharedStrings.xml", /^xl\/worksheets\/sheet\d+\.xml$/]);
  const sheetName = Object.keys(files).filter((k) => k.startsWith("xl/worksheets/")).sort()[0];
  if (!sheetName) throw new Error("엑셀의 첫 시트를 찾지 못했습니다.");
  const parse = (x) => new DOMParser().parseFromString(x, "application/xml");
  const shared = files["xl/sharedStrings.xml"] ? [...parse(files["xl/sharedStrings.xml"]).getElementsByTagName("si")].map((si) => [...si.getElementsByTagName("t")].map((t) => t.textContent).join("")) : [];
  const rows = [];
  for (const r of parse(files[sheetName]).getElementsByTagName("row")) {
    const row = [];
    for (const c of r.getElementsByTagName("c")) {
      const t = c.getAttribute("t");
      const vEl = c.getElementsByTagName("v")[0];
      let val = vEl ? vEl.textContent : "";
      if (t === "s") val = shared[Number(val)] ?? "";
      else if (t === "inlineStr") val = [...c.getElementsByTagName("t")].map((x) => x.textContent).join("");
      row[colIndex(c.getAttribute("r") || "A1")] = val;
    }
    rows.push(Array.from(row, (x) => x ?? ""));
  }
  return rows;
}
async function readTable(file) {
  const buf = await file.arrayBuffer();
  const head = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
  if (head[0] === 0x50 && head[1] === 0x4b) return xlsxRows(buf); // a zip: .xlsx
  if (head[0] === 0xd0 && head[1] === 0xcf) throw new Error("예전 형식(.xls 97-2003) 엑셀입니다. 엑셀에서 ‘다른 이름으로 저장 → CSV UTF-8’로 저장해 올려 주세요.");
  const text = decode(buf);
  if (/<table/i.test(text)) return htmlRows(text);
  const first = text.split("\n")[0] || "";
  return csvRows(text, (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? "\t" : ",");
}

/* ---------- which column is which ---------- */
const FIELDS = [
  ["combo", "이름/연락처 (한 칸)", /이름\s*\/\s*연락처|성명\s*\/\s*연락처/],
  ["name", "이름", /^(이름|성명|고객명|신청자|작성자|name)$/i],
  ["phone", "연락처", /연락처|휴대폰|핸드폰|전화|phone|hp/i],
  ["message", "상담 내용", /상담\s*내용|내용|문의|content/i],
  ["at", "등록일", /등록일|작성일|신청일|날짜|일시|date/i],
  ["memo", "비고(메모)", /비고|메모|관리자|note|memo/i],
  ["done", "답변 여부", /답변|처리|상태|완료/],
  ["where", "where(기기)", /^where$|기기|접속/i],
  ["interest", "분류·시술", /분류|구분|시술|항목/],
];
function detect(rows) {
  let headerAt = 0;
  let best = -1;
  rows.slice(0, 12).forEach((r, i) => {
    const hits = r.filter((c) => FIELDS.some(([, , re]) => re.test(String(c).trim()))).length;
    if (hits > best) { best = hits; headerAt = i; }
  });
  const header = rows[headerAt] || [];
  const map = {};
  FIELDS.forEach(([key, , re]) => {
    const i = header.findIndex((h, j) => re.test(String(h).trim()) && !Object.values(map).includes(j));
    if (i >= 0) map[key] = i;
  });
  if (map.combo !== undefined) { delete map.name; delete map.phone; }
  return { headerAt, header, map };
}
const excelDate = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 20000 || n > 80000) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n * 86400000));
  return d.toISOString().slice(0, 19).replace("T", " ");
};
function toRecord(r, map) {
  const get = (k) => (map[k] === undefined || map[k] === "" ? "" : String(r[Number(map[k])] ?? "").trim());
  let name = get("name");
  let phone = get("phone");
  if (map.combo !== undefined && map.combo !== "") {
    const c = get("combo");
    const digits = c.match(/0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}/);
    phone = digits ? digits[0] : "";
    name = c.replace(digits ? digits[0] : "", "").replace(/\s+/g, " ").trim();
  }
  let at = get("at");
  at = excelDate(at) || at.replace(/\./g, "-").replace(/\s+/g, " ").trim();
  return { name, phone, at, message: get("message"), memo: get("memo"), done: get("done"), where: get("where"), interest: get("interest") };
}

/* ---------- the old admin's own exports, known by their columns ---------- */
// old answers and posts were saved with their HTML tags as text: keep the words and the line breaks
function plain(v) {
  let t = String(v || "");
  if (/<\/?[a-z][^>]*>|&[a-z]+;|&#\d+;/i.test(t)) {
    t = t.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d|tr)>/gi, "$&\n");
    t = new DOMParser().parseFromString(t, "text/html").body.textContent || "";
  }
  return t.replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
const lines = (pairs) => pairs.filter(([, v]) => String(v || "").trim()).map(([k, v]) => `${k}: ${String(v).trim()}`).join("\n");
const KIND_BY_NAME = [[/sms|문자/i, "sms"], [/전화/, "tel"], [/카톡|카카오/, "manual"], [/비용/, "cost"], [/이벤트/, "event"]];
const KIND_LABEL = { sms: "SMS빠른상담", tel: "전화상담신청", manual: "카톡상담", cost: "비용상담", event: "이벤트상담", model: "리얼모델신청", booking: "진료예약", online: "온라인상담", import: "섞여 있음" };
const PROFILES = [
  { id: "member", test: (h) => h.includes("아이디") && h.includes("메일링"),
    skip: "회원 목록은 옮기지 않습니다. 새 사이트에는 회원 기능이 없어, 쓰지 않을 개인정보를 옮기지 않습니다." },
  { id: "review", test: (h) => h.includes("목록_베스트") || h.includes("메인/베스트"),
    skip: "수술후기는 옮기지 않습니다. 치료경험담은 의료법상 홍보에 쓸 수 없습니다." },
  { id: "model", kind: "model", test: (h) => h.includes("희망수술부위") && h.includes("키/몸무게"),
    row: (g) => ({
      key: g("글ID"), name: g("이름") || g("목록_이름"), phone: g("전화번호") || g("목록_전화번호"), at: g("작성일") || g("목록_등록일"),
      interest: g("희망수술부위"), done: true, old_status: g("목록_상태"),
      message: [plain(g("내용")), lines([["희망 부위", g("희망수술부위")], ["생년월일", g("생년월일")], ["키/몸무게", g("키/몸무게")], ["성형 경험", g("성형유무")], ["주소", g("주소")]])].filter(Boolean).join("\n\n"),
      photos: ["사진1", "사진2", "사진3", "사진4", "사진5"].filter((k) => g(k)).length,
    }) },
  { id: "booking", kind: "booking", test: (h) => h.includes("희망예약일시"),
    row: (g) => {
      const want = g("희망예약일시").match(/^(\d{4}-\d{2}-\d{2})\s*(\d{1,2}:\d{2})?/);
      const answer = plain(g("답변"));
      return {
        key: g("글ID"), name: g("이름") || g("목록_글쓴이"), phone: g("핸드폰번호") || g("목록_전화번호"), at: g("작성일") || g("목록_등록일"),
        interest: g("분류"), message: plain(g("내용")) || g("목록_제 목"), prefer_date: want ? want[1] : "", prefer_time: want && want[2] ? want[2] : "",
        booked_at: g("예약확정일시"), old_status: g("목록_상태"), answer, done: !!answer,
      };
    } },
  { id: "online", kind: "online", test: (h) => h.includes("답변상태") && h.includes("공개여부"),
    row: (g) => {
      const title = g("[공지구분]제목") || g("목록_제 목");
      const cat = title.match(/^\[([^\]]{1,20})\]/);
      return {
        key: g("글ID"), name: g("이름") || g("목록_이름"), phone: g("휴대폰"), at: g("작성일") || g("목록_날짜"),
        interest: cat ? cat[1] : "", message: [title, plain(g("내용"))].filter(Boolean).join("\n\n"),
        answer: plain(g("답변")), answer_at: g("답변일"), photos: ["이미지1", "이미지2", "이미지3"].filter((k) => g(k)).length,
      };
    } },
  { id: "basic", test: (h) => ["이름", "연락처", "등록일"].every((x) => h.includes(x)) },
];
function profileOf(file, rows) {
  const { headerAt, header, map } = detect(rows);
  const h = header.map((x) => String(x).trim());
  const p = PROFILES.find((x) => x.test(h)) || { id: "generic" };
  const body = rows.slice(headerAt + 1).filter((r) => r.length >= Math.min(3, h.length));
  const item = { file, name: file.name, profile: p.id, skip: p.skip || "", kind: p.kind || (KIND_BY_NAME.find(([re]) => re.test(file.name)) || [])[1] || "", header, map, body, recs: [] };
  if (p.skip) return item;
  if (p.row) {
    const idx = Object.fromEntries(h.map((x, i) => [x, i]));
    item.recs = body.map((r) => p.row((k) => (idx[k] === undefined ? "" : String(r[idx[k]] ?? "").trim())));
  } else item.recs = body.map((r) => toRecord(r, map));
  return item;
}
const usable = (x) => (x.name || /^0\d{8,10}$/.test(String(x.phone || "").replace(/\D/g, ""))) && x.at;
// the server's json limit is 1MB: send ~600KB or 300 rows at a time
function batches(recs) {
  const out = [];
  let cur = [];
  let size = 0;
  for (const r of recs) {
    const n = JSON.stringify(r).length * 2;
    if (cur.length && (cur.length >= 300 || size + n > 600000)) { out.push(cur); cur = []; size = 0; }
    cur.push(r); size += n;
  }
  if (cur.length) out.push(cur);
  return out;
}

/* ---------- the panel in 설정 ---------- */
export function mount(el) {
  el.innerHTML = String(html`<div class="panel-body stack">
    <p class="muted small">예전 관리자(나우메디)에서 내려받은 파일을 <b>여러 개 한꺼번에</b> 골라 올리면, 칸 이름을 보고 SMS빠른상담·전화상담·카톡상담·비용상담·리얼모델신청·진료예약·온라인상담을 알아서 나눠 옮깁니다. 같은 파일을 두 번 올려도 한 번만 들어가고, 옮긴 상담은 자동으로 지워지지 않습니다. 회원 목록과 수술후기는 옮기지 않습니다.</p>
    <div class="form-grid">
      <div class="field"><label for="im-file">파일 (.xls, .xlsx, .csv · 여러 개 가능)</label><input class="input" id="im-file" type="file" multiple accept=".xlsx,.xls,.csv,.tsv,.txt,.html,.htm" style="padding-top:8px"></div>
      <div class="field"><label for="im-kind">종류를 알 수 없는 파일의 상담 종류</label><select class="select" id="im-kind">
        <option value="sms">SMS빠른상담 (문자 상담)</option><option value="tel">전화상담신청</option><option value="cost">비용상담</option><option value="event">이벤트상담신청</option><option value="manual">카톡상담 (직접 등록)</option><option value="import">섞여 있음</option></select></div>
    </div>
    <div data-step2 hidden></div>
  </div>`);
  const step2 = $("[data-step2]", el);
  let items = [];
  $("#im-kind", el).addEventListener("change", () => { if (items.length && !$("[data-map]", step2)) drawList(); });
  $("#im-file", el).addEventListener("change", async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    step2.hidden = false;
    items = [];
    for (const [n, file] of files.entries()) {
      step2.innerHTML = String(html`<p class="muted">파일을 읽는 중… (${n + 1} / ${files.length}) ${file.name}</p>`);
      try {
        const rows = (await readTable(file)).filter((r) => r.some((c) => String(c).trim()));
        items.push(profileOf(file, rows));
      } catch (err) { items.push({ name: file.name, skip: err.message, recs: [] }); }
    }
    if (items.length === 1 && items[0].profile === "generic") drawMap(items[0]); else drawList();
  });

  // several files, each known by its columns
  const drawList = () => {
    const kindOf = (it) => it.kind || $("#im-kind", el).value;
    const go = items.filter((it) => !it.skip);
    const all = go.reduce((n, it) => n + it.recs.filter(usable).length, 0);
    step2.innerHTML = String(html`
      <div class="import-preview"><table class="tbl tbl-compact"><thead><tr><th>파일</th><th>종류</th><th class="r">줄</th><th class="r">옮길 상담</th><th>결과</th></tr></thead>
        <tbody>${items.map((it, i) => html`<tr><td>${it.name}</td>
          <td>${it.skip ? html`<span class="muted">옮기지 않음</span>` : KIND_LABEL[kindOf(it)] || kindOf(it)}</td>
          <td class="r">${num(it.recs.length || it.body?.length || 0)}</td>
          <td class="r">${it.skip ? "–" : html`<b>${num(it.recs.filter(usable).length)}</b>`}</td>
          <td class="small" data-res="${i}">${it.skip ? html`<span class="muted">${it.skip}</span>` : ""}</td></tr>`)}</tbody></table></div>
      <p class="small muted">옮긴 상담은 유입 ‘예전 사이트’로 들어가고, 보관 기간을 정해도 자동으로 지워지지 않습니다.</p>
      <div class="row"><div class="spacer"><div class="progress" data-prog hidden><i></i></div><p class="small muted" data-prog-t></p></div>
        <button class="btn btn-primary" type="button" data-go ${all ? "" : "disabled"}>${icon("upload", "i-sm")}${num(all)}건 가져오기</button></div>`);
    $("[data-go]", step2).addEventListener("click", (e) => busy(e.currentTarget, async () => {
      const t = $("[data-prog-t]", step2);
      const prog = $("[data-prog]", step2);
      const bar = $("i", prog);
      prog.hidden = false;
      let done = 0;
      let total = { added: 0, skipped: 0, bad: 0 };
      for (const [i, it] of items.entries()) {
        if (it.skip) continue;
        const res = $(`[data-res="${i}"]`, step2);
        const recs = it.recs.filter(usable);
        let r1 = { added: 0, skipped: 0, bad: 0 };
        for (const part of batches(recs)) {
          try {
            const r = await api("/consults/import", { method: "POST", json: { kind: kindOf(it), rows: part, mapped: !!it.mapped } });
            r1.added += r.added; r1.skipped += r.skipped; r1.bad += r.bad.length;
          } catch (err) { res.textContent = `멈춤: ${err.message}`; t.textContent = `멈췄습니다. 들어간 건은 남아 있고, 다시 올리면 이어서 들어갑니다.`; return; }
          done += part.length;
          bar.style.transform = `scaleX(${(done / all).toFixed(3)})`;
          t.textContent = `${num(done)} / ${num(all)} · ${it.name}`;
          res.textContent = `새로 ${num(r1.added)} · 이미 있음 ${num(r1.skipped)}`;
        }
        res.textContent = `새로 ${num(r1.added)} · 이미 있음 ${num(r1.skipped)}${r1.bad ? ` · 형식 오류 ${num(r1.bad)}` : ""}`;
        total = { added: total.added + r1.added, skipped: total.skipped + r1.skipped, bad: total.bad + r1.bad };
      }
      t.textContent = `끝났습니다. 새로 ${num(total.added)}건, 이미 있던 ${num(total.skipped)}건${total.bad ? `, 형식이 맞지 않은 ${num(total.bad)}건` : ""}.`;
      toast(`예전 상담 ${num(total.added)}건을 옮겼습니다.`, { link: { href: "/admin/consults?grp=%EC%98%88%EC%A0%84%20%EC%82%AC%EC%9D%B4%ED%8A%B8", label: "보기" } });
    }));
  };

  // one file whose columns are not known: match them by hand
  const drawMap = (it) => {
    const det = { headerAt: 0, header: it.header, map: it.map };
    const body = it.body;
    const recs = body.map((r) => toRecord(r, det.map));
    const ok = recs.filter(usable);
    const opts = (sel) => html`<option value="">(없음)</option>${det.header.map((h, i) => html`<option value="${i}" ${String(sel) === String(i) ? "selected" : ""}>${h || `${i + 1}번째 칸`}</option>`)}`;
    step2.innerHTML = String(html`
      <p class="strong">칸 맞추기 <span class="muted small">(자동으로 맞췄습니다. 틀린 곳만 고치세요)</span></p>
      <div class="import-map">${FIELDS.map(([k, l]) => html`<div class="field"><label>${l}</label><select class="select select-sm" data-map="${k}">${opts(det.map[k])}</select></div>`)}</div>
      <p class="small">모두 <b>${num(body.length)}</b>줄 · 들어갈 수 있는 상담 <b>${num(ok.length)}</b>건${body.length - ok.length ? html` · <span class="muted">이름·번호·날짜가 없는 ${num(body.length - ok.length)}줄은 빼고 옮깁니다</span>` : ""}</p>
      <div class="import-preview"><table class="tbl tbl-compact"><thead><tr><th>이름</th><th>연락처</th><th>등록일</th><th>내용</th><th>비고</th><th>답변</th></tr></thead>
        <tbody>${recs.slice(0, 8).map((x) => html`<tr><td>${x.name}</td><td class="nowrap">${x.phone}</td><td class="nowrap">${x.at}</td><td>${x.message.slice(0, 60)}</td><td>${x.memo.slice(0, 40)}</td><td>${x.done}</td></tr>`)}</tbody></table></div>
      <div class="row"><div class="spacer"><p class="small muted">이 칸 맞춤으로 옮기려면 아래 버튼을 누르세요.</p></div><button class="btn btn-primary" type="button" data-use ${ok.length ? "" : "disabled"}>${icon("check", "i-sm")}이대로 ${num(ok.length)}건 준비</button></div>`);
    $$("[data-map]", step2).forEach((s) => s.addEventListener("change", () => { det.map[s.dataset.map] = s.value; if (s.dataset.map === "combo" && s.value !== "") { det.map.name = ""; det.map.phone = ""; } it.map = det.map; drawMap(it); }));
    $("[data-use]", step2).addEventListener("click", () => { it.recs = recs; it.profile = "basic"; it.mapped = true; drawList(); });
  };
}
