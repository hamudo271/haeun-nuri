// 홈페이지 관리: what staff change on the public site without a developer. The main page's popups, the 비급여
// 진료비용 list (의료법: a clinic with a website posts its prices there), and the ad and analytics codes (네이버,
// 구글, 메타, 카카오), which the server writes into every public page and which count a consultation as a
// conversion only when the server has saved it.
import multer from "multer";
import sharp from "sharp";
import { db, state, getSetting, setSetting } from "./db.js";
import { h, need, ownerOnly, audit, whoIs } from "./auth.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const str = (v, n) => String(v ?? "").trim().slice(0, n);
const KST_DAY = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

/* ---------- ad and analytics codes ---------- */
export const TAG_FIELDS = {
  naver: /^s_[0-9a-f]{6,24}$/i, // 네이버 애널리틱스 (wa)
  ga4: /^G-[A-Z0-9]{6,14}$/, // 구글 애널리틱스 4
  gads: /^AW-\d{6,14}$/, // 구글 광고
  gadsLabel: /^[\w-]{6,48}$/, // 구글 광고 전환 라벨
  meta: /^\d{10,20}$/, // 메타 픽셀
  metaEvent: /^(CompleteRegistration|Lead|Contact|SubmitApplication|Schedule)$/,
  kakao: /^\d{10,25}$/, // 카카오 픽셀 (방문)
  kakaoConv: /^\d{10,25}$/, // 카카오 픽셀 (전환)
};
// 해운누리 예전 사이트의 코드는 아직 받지 않았다: 병원에서 받으면 관리자에서 넣는다
const TAG_DEFAULTS = {};
// the phone that receives 문자 상담: the public page opens the visitor's SMS app on it with the request filled in
export const SMS_DEFAULT = "051-715-4723";
const SMS_RE = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
export const smsTo = async () => (db && state.ready ? (await getSetting("sms_to", "")) || SMS_DEFAULT : SMS_DEFAULT);
export async function siteSnippet() {
  const to = await smsTo().catch(() => SMS_DEFAULT);
  return `<script>window.FB_SITE=${JSON.stringify({ smsTo: to })}</script>\n`;
}
async function readTags() {
  try { return JSON.parse(await getSetting("tags", "{}")) || {}; } catch { return {}; }
}
const cleanTags = (t) => Object.fromEntries(Object.entries(t || {}).filter(([k, v]) => TAG_FIELDS[k] && typeof v === "string" && TAG_FIELDS[k].test(v)));

// the lines a public page gets before </head>; none for staff who are logged in (their visits are not the clinic's audience)
export async function tagSnippet(req) {
  if (!db || !state.ready) return "";
  if (await whoIs(req)) return "";
  const on = cleanTags(await readTags());
  if (!on.naver && !on.ga4 && !on.gads && !on.meta && !on.kakao) return "";
  return `<script>window.FB_TAGS=${JSON.stringify(on).replace(/</g, "\\u003c")}</script>\n<script src="/js/tags.js" defer></script>\n`;
}

/* ---------- popups ---------- */
const SEED_POPUPS = []; // 해운누리 메인에는 아직 팝업이 없다
export async function seed() {
  const tagsSet = await db.query("select 1 from settings where key = 'tags'");
  if (!tagsSet.rows[0]) await setSetting("tags", JSON.stringify(TAG_DEFAULTS));
  const seeded = await db.query("select 1 from settings where key = 'popups_seeded'");
  if (!seeded.rows[0]) {
    for (const [i, p] of SEED_POPUPS.entries()) await db.query("insert into popups (title, link, image_path, width, height, ord) values ($1,$2,$3,$4,$5,$6)", [p.title, p.link, p.image_path, p.width, p.height, i]);
    await setSetting("popups_seeded", "1");
  }
}

// the slides the main page shows today, or null when there are none (the page then has no popup at all)
export async function popupSlides() {
  const today = KST_DAY();
  const { rows } = await db.query(
    "select id, title, link, image_path, width, height, extract(epoch from updated_at)::bigint as v from popups where active and (starts_on is null or starts_on <= $1) and (ends_on is null or ends_on >= $1) order by ord, id",
    [today],
  );
  if (!rows.length) return null;
  return rows.map((p) => {
    const src = p.image_path ? esc(p.image_path) : `/popup-img/${p.id}?v=${p.v}`;
    const img = `<img src="${src}" width="${p.width || 800}" height="${p.height || 1000}" loading="lazy" alt="${esc(p.title)}">`;
    const inPage = p.link && p.link.startsWith("#");
    const out = p.link && /^https?:\/\//.test(p.link);
    const a = p.link ? `<a href="${esc(p.link)}"${inPage ? " data-popup-dismiss" : ""}${out ? ' target="_blank" rel="noopener"' : ""}>\n            ${img}\n          </a>` : img;
    return `\n        <li class="popup-slide">\n          ${a}\n        </li>`;
  }).join("");
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const takeImage = (req, res, next) => upload.single("image")(req, res, (err) => {
  if (err) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "이미지는 10MB까지 올릴 수 있습니다." : "이미지를 받지 못했습니다." });
  next();
});
async function popupImage(file) {
  if (!file) return null;
  if (!/^image\//.test(file.mimetype)) throw new Error("이미지 파일만 올릴 수 있습니다.");
  try {
    const out = await sharp(file.buffer, { failOn: "none" }).rotate().resize({ width: 900, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
    return { data: out.data, width: out.info.width, height: out.info.height };
  } catch { throw new Error("이미지를 읽지 못했습니다. JPG나 PNG로 올려 주세요."); }
}
function popupFields(b) {
  const f = {
    title: str(b.title, 200),
    link: str(b.link, 300) || null,
    starts_on: /^\d{4}-\d{2}-\d{2}$/.test(b.starts_on || "") ? b.starts_on : null,
    ends_on: /^\d{4}-\d{2}-\d{2}$/.test(b.ends_on || "") ? b.ends_on : null,
    active: !(b.active === "0" || b.active === "false" || b.active === false),
  };
  if (!f.title) return { error: "팝업 설명(그림에 적힌 내용)을 적어 주세요. 화면을 읽어 주는 기능이 이 글을 읽습니다." };
  if (f.link && !/^(https?:\/\/|\/|#|[\w-]+\.html)/.test(f.link)) return { error: "연결할 주소는 https://… 나 페이지 이름(예: /sub/about/page01/)으로 적어 주세요." };
  if (f.starts_on && f.ends_on && f.starts_on > f.ends_on) return { error: "끝나는 날이 시작하는 날보다 빠릅니다." };
  return f;
}

/* ---------- 비급여 진료비용 ---------- */
const won = (n) => (n == null ? "" : `${Number(n).toLocaleString("ko-KR")}원`);
export async function pricesHtml() {
  const { rows } = await db.query("select cat, item, price_min, price_max, note, updated_at from prices order by ord, id");
  if (!rows.length) return null;
  const last = rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), rows[0].updated_at);
  const d = new Date(new Date(last).getTime() + 9 * 3600 * 1000);
  const groups = [];
  rows.forEach((r) => {
    let g = groups.find((x) => x.cat === r.cat);
    if (!g) { g = { cat: r.cat, rows: [] }; groups.push(g); }
    g.rows.push(r);
  });
  const price = (r) => (r.price_min != null && r.price_max != null && r.price_max !== r.price_min ? `${won(r.price_min)} ~ ${won(r.price_max)}` : won(r.price_min ?? r.price_max));
  return `
      <p class="price-date">기준일 ${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 · 부가세 포함</p>
      ${groups.map((g) => `<section class="price-group" aria-label="${esc(g.cat || "비급여 항목")}">
        ${g.cat ? `<h2 class="tx-h3">${esc(g.cat)}</h2>` : ""}
        <div class="price-wrap"><table class="price-table">
          <thead><tr><th scope="col">항목</th><th scope="col">금액</th><th scope="col">비고</th></tr></thead>
          <tbody>${g.rows.map((r) => `<tr><th scope="row">${esc(r.item)}</th><td>${esc(price(r))}</td><td>${esc(r.note || "")}</td></tr>`).join("")}</tbody>
        </table></div>
      </section>`).join("\n      ")}`;
}

export function publicRoutes(app) {
  app.get("/popup-img/:id", h(async (req, res, next) => {
    if (!db || !state.ready) return next();
    const { rows } = await db.query("select image from popups where id = $1 and image is not null", [Number(req.params.id) || 0]);
    if (!rows[0]) return next();
    res.set({ "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" });
    res.send(rows[0].image);
  }));
}

export function adminRoutes(api) {
  // codes
  api.get("/tags", need, h(async (req, res) => res.json({ tags: await readTags(), defaults: TAG_DEFAULTS, smsTo: await getSetting("sms_to", ""), smsDefault: SMS_DEFAULT })));
  api.put("/tags", ownerOnly, h(async (req, res) => {
    const b = req.body || {};
    const out = {};
    for (const k of Object.keys(TAG_FIELDS)) {
      const v = str(b[k], 60);
      if (!v) continue;
      if (!TAG_FIELDS[k].test(v)) return res.status(400).json({ error: `"${v}"는 형식이 맞지 않습니다. (${k})` });
      out[k] = v;
    }
    const sms = str(b.smsTo, 20).replace(/\s/g, "");
    if (sms && !SMS_RE.test(sms)) return res.status(400).json({ error: `"${sms}"는 전화번호 형식이 아닙니다.` });
    await setSetting("tags", JSON.stringify(out));
    await setSetting("sms_to", sms);
    audit(req, "settings.update", null, `광고·분석 코드: ${Object.keys(out).join(", ") || "모두 끔"} · 문자 번호 ${sms || "기본"}`);
    res.json({ tags: out, smsTo: sms });
  }));

  // popups
  api.get("/popups", need, h(async (req, res) => {
    const { rows } = await db.query("select id, title, link, image_path, width, height, starts_on, ends_on, ord, active, (image is not null) as uploaded, extract(epoch from updated_at)::bigint as v from popups order by ord, id");
    res.json({ popups: rows, today: KST_DAY() });
  }));
  api.post("/popups", need, takeImage, h(async (req, res) => {
    const f = popupFields(req.body || {});
    if (f.error) return res.status(400).json({ error: f.error });
    let img;
    try { img = await popupImage(req.file); } catch (e) { return res.status(400).json({ error: e.message }); }
    if (!img) return res.status(400).json({ error: "팝업 이미지를 올려 주세요." });
    const ord = (await db.query("select coalesce(max(ord), -1) + 1 as n from popups")).rows[0].n;
    const { rows } = await db.query("insert into popups (title, link, image, width, height, starts_on, ends_on, ord, active) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id", [f.title, f.link, img.data, img.width, img.height, f.starts_on, f.ends_on, ord, f.active]);
    audit(req, "popup.create", `popup:${rows[0].id}`, f.title.slice(0, 60));
    res.json({ id: rows[0].id });
  }));
  api.put("/popups/:id", need, takeImage, h(async (req, res) => {
    const id = Number(req.params.id) || 0;
    const f = popupFields(req.body || {});
    if (f.error) return res.status(400).json({ error: f.error });
    let img;
    try { img = await popupImage(req.file); } catch (e) { return res.status(400).json({ error: e.message }); }
    const args = [f.title, f.link, f.starts_on, f.ends_on, f.active, id];
    let sql = "update popups set title=$1, link=$2, starts_on=$3, ends_on=$4, active=$5, updated_at=now()";
    if (img) { sql += ", image=$7, image_path=null, width=$8, height=$9"; args.push(img.data, img.width, img.height); }
    const { rowCount } = await db.query(`${sql} where id=$6`, args);
    if (!rowCount) return res.status(404).json({ error: "없는 팝업입니다." });
    audit(req, "popup.update", `popup:${id}`, f.title.slice(0, 60));
    res.json({ ok: true });
  }));
  api.post("/popups/order", need, h(async (req, res) => {
    const ids = (req.body?.ids || []).map(Number).filter(Boolean);
    for (const [i, id] of ids.entries()) await db.query("update popups set ord = $1 where id = $2", [i, id]);
    res.json({ ok: true });
  }));
  api.delete("/popups/:id", need, h(async (req, res) => {
    const { rows } = await db.query("delete from popups where id = $1 returning title", [Number(req.params.id) || 0]);
    if (!rows[0]) return res.status(404).json({ error: "없는 팝업입니다." });
    audit(req, "popup.delete", `popup:${req.params.id}`, rows[0].title.slice(0, 60));
    res.json({ ok: true });
  }));
  api.get("/popup-img/:id", need, h(async (req, res) => {
    const { rows } = await db.query("select image from popups where id = $1 and image is not null", [Number(req.params.id) || 0]);
    if (!rows[0]) return res.status(404).end();
    res.set({ "Content-Type": "image/webp", "Cache-Control": "private, max-age=60" });
    res.send(rows[0].image);
  }));

  // 비급여 진료비용: the whole list is saved at once, in the order shown
  api.get("/prices", need, h(async (req, res) => {
    const { rows } = await db.query("select id, cat, item, price_min, price_max, note, updated_at from prices order by ord, id");
    res.json({ prices: rows });
  }));
  api.put("/prices", need, h(async (req, res) => {
    const list = Array.isArray(req.body?.prices) ? req.body.prices : null;
    if (!list) return res.status(400).json({ error: "목록을 받지 못했습니다." });
    if (list.length > 500) return res.status(400).json({ error: "항목은 500개까지 넣을 수 있습니다." });
    const num = (v) => { const d = String(v ?? "").replace(/[^\d]/g, ""); return d ? Math.min(2000000000, Number(d)) : null; };
    const rows = [];
    for (const [i, p] of list.entries()) {
      const item = str(p.item, 120);
      if (!item) continue;
      const a = num(p.price_min);
      const b = num(p.price_max);
      if (a == null && b == null) return res.status(400).json({ error: `"${item}"의 금액을 적어 주세요.` });
      rows.push([str(p.cat, 60), item, a ?? b, b ?? a, str(p.note, 200) || null, i]);
    }
    const client = await db.connect();
    try {
      await client.query("begin");
      await client.query("delete from prices");
      for (const r of rows) await client.query("insert into prices (cat, item, price_min, price_max, note, ord) values ($1,$2,$3,$4,$5,$6)", r);
      await client.query("commit");
    } catch (e) { await client.query("rollback").catch(() => {}); throw e; } finally { client.release(); }
    audit(req, "prices.update", null, `${rows.length}개 항목`);
    res.json({ ok: true, n: rows.length });
  }));
}
