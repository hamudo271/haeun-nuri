// 해운누리한의원 — the site's server on Railway (얼굴본성형외과 서버를 옮겨 온 것).
// It serves the pages Next.js built (out/), fills the board pages (해운누리 소식 · 전문칼럼 · 유튜브) from the
// database, counts visits and runs the admin at /admin (server/admin/): consultations, bookings, where visitors come
// from, the board, the main page's popups and staff accounts. Everything is kept in Postgres (DATABASE_URL); the
// owner's password comes from ADMIN_PASSWORD. Without them the site still serves every built page and the admin says
// what is missing.
import express from "express";
import compression from "compression";
import multer from "multer";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as R from "./render.js";
import * as feeds from "./feeds.js";
import { db, state, init, getSetting, setSetting } from "./db.js";
import { h, need, ownerOnly, whoIs, audit, authRoutes, ensureOwner, hasOwnerPassword } from "./auth.js";
import * as consult from "./consult.js";
import * as stats from "./stats.js";
import * as notify from "./notify.js";
import * as site from "./sitecontent.js";
import { SITE, SITE_HOST } from "./site.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.env.OUT_DIR || path.join(HERE, "../out"));
const ADMIN = path.join(HERE, "admin");
const PORT = Number(process.env.PORT) || 8080;
const DAY = 86400;
const PROD = process.env.NODE_ENV === "production" || !!process.env.RAILWAY_ENVIRONMENT;

// the two notices the static board carried (lib/board.ts, the old site's posts 5 and 1): moved into the database once,
// under their old numbers, so /sub/board/page01/5/ keeps working and they can be edited like any other post
const FILE = "/files/" + encodeURIComponent("비급여 진료비용(해운누리)_240603.xlsx").replace(/\(/g, "%28").replace(/\)/g, "%29");
const SEEDS = [
  { id: 5, key: "notice-5", cat: "news", date: "2024-06-03", title: "해운누리한의원 비급여 진료비용입니다.", body: `해운누리한의원 비급여 진료비용입니다.\n\n[첨부파일: 비급여 진료비용(해운누리)_240603.xlsx](${FILE})` },
  { id: 1, key: "notice-1", cat: "news", date: "2024-01-09", title: "해운누리한의원 홈페이지가 리뉴얼되었습니다.", body: "해운누리한의원 홈페이지가 리뉴얼되었습니다." },
];

async function onReady() {
  await ensureOwner();
  await site.seed();
  const seeded = await db.query("select value from settings where key = 'seeded'");
  if (!seeded.rows[0]) {
    for (const s of SEEDS) {
      await db.query(
        "insert into posts (id, cat, title, body, seed_key, created_at, updated_at) values ($1, $2, $3, $4, $5, $6, $6) on conflict do nothing",
        [s.id, s.cat, s.title, s.body, s.key, `${s.date}T09:00:00+09:00`],
      );
    }
    await db.query("select setval(pg_get_serial_sequence('posts', 'id'), greatest((select max(id) from posts), 1))");
    await db.query("insert into settings (key, value) values ('seeded', '1') on conflict (key) do nothing");
  }
}

const postCols = "id, cat, title, body, youtube, ba_proc, ba_after, ba_parts, consent, cover, seed_key, published, created_at, updated_at";
const mediaOf = async (ids) => {
  if (!ids.length) return new Map();
  const { rows } = await db.query("select id, post_id, ord, width, height from media where post_id = any($1) order by post_id, ord, id", [ids]);
  const map = new Map(ids.map((id) => [id, []]));
  rows.forEach((m) => map.get(m.post_id).push(m));
  return map;
};

/* ---------- the built pages this server fills in ---------- */
// out/sub/media/page02/index.html for "/sub/media/page02/"; read once in production, every time while developing
const pageCache = new Map();
function built(rel) {
  if (PROD && pageCache.has(rel)) return pageCache.get(rel);
  let html = "";
  try { html = fs.readFileSync(path.join(OUT, rel, "index.html"), "utf8"); } catch { /* not built */ }
  if (PROD) pageCache.set(rel, html);
  return html;
}
const fill = (html, inner) => html.replace(/<div id="cms-root"([^>]*)><\/div>/, (m, attrs) => `<div id="cms-root"${attrs}>${inner}</div>`);
stats.loadTitles(OUT);

// The built pages name https://haeun-nuri.com as their home. A page shares its picture and link from the address
// it was actually opened on, so a KakaoTalk preview leads back to the same site whatever domain points here.
const BUILT = "https://haeun-nuri.com"; // lib/site.ts ORIGIN (app/layout.tsx metadataBase)
const reEsc = (t) => t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const SHARE_RE = new RegExp(`(<meta (?:property="og:(?:image|url)"|name="twitter:image") content=")(?:${reEsc(BUILT)}|${reEsc(SITE)})`, "g");
const shareFrom = (req, html) => html.replace(SHARE_RE, `$1${req.protocol}://${req.get("host")}`);

// what every public page gets: the visit counter, the ad codes, and on the main page today's popups
async function dress(req, html, rel) {
  html = shareFrom(req, html);
  if (rel === "/" && db && state.ready) {
    try {
      const slides = await site.popupSlides();
      if (slides) html = html.replace("</body>", `${R.popupLayer(slides)}</body>`);
    } catch (e) { console.error("popups:", e.message); }
  }
  if (rel === "/nonpay/" && db && state.ready) {
    try {
      const table = await site.pricesHtml();
      html = fill(html, table || '<p class="price-date">비급여 진료비용은 병원에 문의해 주세요.</p>');
    } catch (e) { console.error("prices:", e.message); }
  }
  const tags = await site.tagSnippet(req).catch(() => "");
  const siteVars = await site.siteSnippet().catch(() => "");
  return html.replace("</head>", `${siteVars}${tags}<script src="/js/track.js" defer></script>\n</head>`);
}

// a post's own page: its title, description, address and picture in the head of the built frame. The frame carries its
// list page's share tags (app/sub/*/view → lib/seo.ts pageMeta); the post's own address, type and — when it has one —
// first picture replace them, so a shared post never previews as the list (or the home page).
function postHead(html, p, pics) {
  const url = `${SITE}${R.postUrl(p)}`;
  const title = `${R.esc(p.title)} | ${R.CATS[p.cat]} | 해운누리한의원`;
  const desc = R.esc(R.excerpt(p.body, 150) || `해운누리한의원 ${R.CATS[p.cat]}`);
  const img = pics[0] ? `${SITE}/media/${pics[0].id}` : "";
  const ld = {
    "@context": "https://schema.org",
    "@type": p.cat === "column" ? "BlogPosting" : "Article",
    headline: p.title,
    description: R.excerpt(p.body, 150) || undefined,
    datePublished: new Date(p.created_at).toISOString(),
    dateModified: new Date(p.updated_at).toISOString(),
    inLanguage: "ko-KR",
    image: img || `${SITE}${p.cat === "column" ? "/og/media-column.jpg" : "/og/board-news.jpg"}`,
    url,
    mainEntityOfPage: url,
    author: { "@type": "Organization", "@id": `${SITE}/#clinic`, name: "해운누리한의원", url: `${SITE}/` },
    publisher: { "@type": "MedicalClinic", "@id": `${SITE}/#clinic`, name: "해운누리한의원", url: `${SITE}/`, logo: `${SITE}/img/brand/logo-brown.png` },
  };
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*"/g, `$1${desc}"`);
  html = html.replace(/(<meta (?:property|name)="(?:og:title|twitter:title)" content=")[^"]*"/g, `$1${title}"`);
  html = html.replace(/<link rel="canonical" href="[^"]*"\/?>/, "");
  html = html.replace(/<meta property="og:(?:url|type)" content="[^"]*"\/?>/g, "");
  if (img) html = html.replace(/<meta (?:property="og:image(?::[a-z]+)?"|name="twitter:image(?::[a-z]+)?") content="[^"]*"\/?>/g, "");
  let extra = `<link rel="canonical" href="${url}"/><meta property="og:url" content="${url}"/><meta property="og:type" content="article"/>`;
  if (img) extra += `<meta property="og:image" content="${img}"/><meta name="twitter:image" content="${img}"/>`;
  extra += `<meta property="article:published_time" content="${new Date(p.created_at).toISOString()}"/><meta property="article:modified_time" content="${new Date(p.updated_at).toISOString()}"/>`;
  extra += `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`;
  if (!p.published && !/<meta name="robots"/.test(html)) extra += '<meta name="robots" content="noindex"/>';
  return html.replace("</head>", `${extra}</head>`);
}

// one page of a board's published posts (the cover is the first picture)
async function listOf(cat, page, per) {
  const total = (await db.query("select count(*)::int as n from posts where published and cat = $1", [cat])).rows[0].n;
  const pages = Math.max(1, Math.ceil(total / per));
  page = Math.min(Math.max(1, page), pages);
  const { rows } = await db.query(
    `select p.id, p.cat, p.title, p.body, p.youtube, p.created_at,
       (select m.id from media m where m.post_id = p.id order by m.ord, m.id limit 1) as pic
     from posts p where p.published and p.cat = $1 order by p.created_at desc, p.id desc limit $2 offset $3`,
    [cat, per, (page - 1) * per],
  );
  return { items: rows, total, page, pages, per };
}

/* ---------- the app ---------- */
const app = express();
app.disable("x-powered-by");
// Railway's proxies add the visitor's real address at the right end of X-Forwarded-For; anything to its left can be
// typed by the visitor. Trusting only private and internal addresses makes req.ip that real address, which the log-in
// limits, the spam limits and the 접속 기록 rely on.
const INTERNAL = /^(::ffff:)?(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|169\.254\.)|^(::1|f[cd][0-9a-f]{2}:.*|fe80:.*)$/i;
app.set("trust proxy", (ip) => INTERNAL.test(ip));
app.use(compression());
app.use((req, res, next) => {
  res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" });
  if (/\.up\.railway\.app$/i.test(req.hostname || "")) res.set("X-Robots-Tag", "noindex, nofollow"); // the preview address, not the clinic's
  next();
});

// the old site's addresses (/default/...php, indexed by 네이버·구글 for years) → the same page on this site, so their
// place in search moves over: straight to the site's address in one hop, even when asked on the www spelling.
// The builder's sample and shop pages had no counterpart: 410 tells crawlers to drop them.
app.get(/^\/default(\/.*)?$/i, (req, res, next) => {
  const p = req.path.replace(/\/+$/, "").toLowerCase();
  if (p === "/default" || p === "/default/index.php" || p === "/default/index.html") return res.redirect(301, `${SITE}/`);
  if (/^\/default\/(sample|mall|member)\//.test(p)) return res.status(410).set("Cache-Control", "no-cache").type("html").send(NOT_FOUND || "Gone");
  const legal = p.match(/^\/default\/(personal|service_rull)\.php$/);
  if (legal) return res.redirect(301, `${SITE}/${legal[1]}/`);
  const sub = p.match(/^\/default\/sub\/([a-z]+)\/(page\d+)\.php$/);
  if (sub && built(`/sub/${sub[1]}/${sub[2]}/`)) return res.redirect(301, `${SITE}/sub/${sub[1]}/${sub[2]}/`);
  next();
});

// one address for search engines: the other spelling (www.haeun-nuri.com) → the site's address (SITE_URL,
// https://haeun-nuri.com), path and query kept. Only page requests move; a form posted to the other spelling is still
// taken (a 301 would turn it into a GET).
const OTHER_HOST = SITE_HOST.startsWith("www.") ? SITE_HOST.slice(4) : `www.${SITE_HOST}`;
app.use((req, res, next) => {
  if (req.hostname === OTHER_HOST && (req.method === "GET" || req.method === "HEAD")) {
    return res.redirect(301, `${SITE}${req.originalUrl}`);
  }
  next();
});

// what is running: for a quick look after a deploy (no names, no numbers from the database)
app.get("/healthz", (req, res) => res.set("Cache-Control", "no-store").json({
  ok: true, db: !!(db && state.ready), owner_password: hasOwnerPassword(), commit: (process.env.RAILWAY_GIT_COMMIT_SHA || "").slice(0, 7) || null, site: SITE,
}));

// what the public pages send: consultation forms and the visit counter's beacons
consult.publicRoutes(app);
stats.publicRoutes(app);
site.publicRoutes(app);

const api = express.Router();
api.use(express.json({ limit: "1mb" }));
api.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  // a form on another site cannot write here: a changing request must come from this site's own pages
  if (req.method !== "GET" && req.headers.origin) {
    try { if (new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({ error: "다른 사이트에서 온 요청입니다." }); } catch { return res.status(403).json({ error: "잘못된 요청입니다." }); }
  }
  next();
});
authRoutes(api);
consult.adminRoutes(api, stats.titleOf);
stats.adminRoutes(api);
site.adminRoutes(api);

// 설정: addresses the visit counter leaves out, how long consultations are kept, where new ones are announced
const RETENTION = [0, 3, 6, 12, 24, 36];
api.get("/settings", need, h(async (req, res) => {
  res.json({
    exclude_ips: await getSetting("exclude_ips", ""),
    retention_months: Number(await getSetting("retention_months", "0")),
    notify: notify.channels(),
    my_ip: req.ip,
    owner_password: hasOwnerPassword(),
  });
}));
// how many consultations a 보관 기간 would delete at the next clean-up, asked before it is saved
api.get("/settings/retention-preview", ownerOnly, h(async (req, res) => {
  const m = Number(req.query.months);
  if (!RETENTION.includes(m) || !m) return res.json({ months: m || 0, count: 0 });
  const { rows } = await db.query(`select count(*)::int as n from consults where ${consult.PURGE_WHERE}`, [m]);
  res.json({ months: m, count: rows[0].n });
}));
api.put("/settings", ownerOnly, h(async (req, res) => {
  const b = req.body || {};
  const changed = [];
  if (b.exclude_ips !== undefined) {
    const ips = [...new Set(String(b.exclude_ips).split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))];
    const bad = ips.find((ip) => !/^[0-9a-fA-F.:]{3,45}$/.test(ip));
    if (bad) return res.status(400).json({ error: `"${bad}"는 IP 주소가 아닙니다.` });
    await setSetting("exclude_ips", ips.slice(0, 50).join("\n"));
    changed.push(`제외 IP ${ips.length}개`);
  }
  if (b.retention_months !== undefined) {
    const m = Number(b.retention_months);
    if (!RETENTION.includes(m)) return res.status(400).json({ error: "보관 기간을 확인해 주세요." });
    await setSetting("retention_months", m);
    changed.push(`보관 기간 ${m ? `${m}개월` : "자동 파기 안 함"}`);
  }
  audit(req, "settings.update", null, changed.join(", "));
  res.json({ ok: true });
}));
api.post("/notify-test", ownerOnly, h(async (req, res) => {
  const ch = notify.channels();
  if (!ch.webhook && !ch.email) return res.status(400).json({ error: "알림을 보낼 곳이 아직 없습니다. Railway 변수에 NOTIFY_WEBHOOK_URL이나 메일 설정을 넣어 주세요." });
  const result = await notify.send("[해운누리] 알림 시험", `관리자 설정에서 ${req._user.name}님이 보낸 시험 알림입니다.`);
  res.json({ result });
}));

/* ---------- the board ---------- */
api.get("/posts", need, h(async (req, res) => {
  const { rows } = await db.query(`select ${postCols}, (select count(*)::int from media m where m.post_id = p.id) as pics from posts p order by created_at desc, id desc`);
  res.json({ posts: rows.map((p) => ({ ...p, excerpt: R.excerpt(p.body, 60) })) });
}));
api.get("/posts/:id", need, h(async (req, res) => {
  const { rows } = await db.query(`select ${postCols} from posts where id = $1`, [Number(req.params.id) || 0]);
  if (!rows[0]) return res.status(404).json({ error: "없는 글입니다." });
  const media = (await mediaOf([rows[0].id])).get(rows[0].id);
  res.json({ post: rows[0], media });
}));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 20 } });
const take = (req, res, next) => upload.array("pics", 20)(req, res, (err) => {
  if (err) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "사진 한 장은 10MB까지 올릴 수 있습니다." : err.code === "LIMIT_FILE_COUNT" ? "사진은 한 번에 20장까지 올릴 수 있습니다." : "사진을 받지 못했습니다." });
  next();
});

function fields(b) {
  const cat = String(b.cat || "");
  const f = {
    cat,
    title: String(b.title || "").trim().slice(0, 120),
    body: String(b.body || "").replace(/\r\n?/g, "\n").trim().slice(0, 30000),
    youtube: String(b.youtube || "").trim().slice(0, 300) || null,
    ba_proc: String(b.ba_proc || "").trim().slice(0, 120) || null,
    ba_after: String(b.ba_after || "").trim().slice(0, 60) || null,
    ba_parts: String(b.ba_parts || "").split(",").map((s) => s.trim()).filter((s) => R.PARTS[s]),
    consent: b.consent === "1" || b.consent === "true",
    published: b.published !== "0" && b.published !== "false",
  };
  if (!R.CATS[cat]) return { error: "게시판을 골라 주세요." };
  if (!f.title) return { error: "제목을 적어 주세요." };
  if (f.youtube && !R.youtubeId(f.youtube)) return { error: "유튜브 주소를 확인해 주세요." };
  if (cat === "video" && !f.youtube) return { error: "영상 글에는 유튜브 주소가 필요합니다." };
  if (cat === "photo" && !f.consent) return { error: "전후사진은 환자 동의를 확인해야 올릴 수 있습니다." };
  return f;
}

async function pictures(files) {
  const out = [];
  for (const file of files) {
    if (!/^image\//.test(file.mimetype)) throw new Error("사진 파일만 올릴 수 있습니다.");
    try {
      const base = sharp(file.buffer, { failOn: "none" }).rotate(); // turned the way the camera held it
      const full = await base.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
      const thumb = await base.clone().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
      out.push({ data: full.data, width: full.info.width, height: full.info.height, thumb });
    } catch {
      throw new Error(`"${file.originalname}"을 사진으로 읽지 못했습니다.`);
    }
  }
  return out;
}

async function save(req, res, id) {
  const f = fields(req.body || {});
  if (f.error) return res.status(400).json({ error: f.error });
  let pics;
  try { pics = await pictures(req.files || []); } catch (e) { return res.status(400).json({ error: e.message }); }
  const keep = String(req.body.keep || "").split(",").map(Number).filter(Boolean);
  if (f.cat === "photo" && !pics.length && !keep.length) return res.status(400).json({ error: "전후사진 글에는 사진이 필요합니다." });
  const client = await db.connect();
  try {
    await client.query("begin");
    if (id) {
      const got = await client.query("update posts set cat=$1, title=$2, body=$3, youtube=$4, ba_proc=$5, ba_after=$6, ba_parts=$7, consent=$8, published=$9, updated_at=now() where id=$10 returning id", [f.cat, f.title, f.body, f.youtube, f.ba_proc, f.ba_after, f.ba_parts, f.consent, f.published, id]);
      if (!got.rows[0]) { await client.query("rollback"); return res.status(404).json({ error: "없는 글입니다." }); }
      await client.query("delete from media where post_id = $1 and not (id = any($2))", [id, keep]);
      for (const [i, mid] of keep.entries()) await client.query("update media set ord = $1 where id = $2 and post_id = $3", [i, mid, id]);
    } else {
      id = (await client.query("insert into posts (cat, title, body, youtube, ba_proc, ba_after, ba_parts, consent, published) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id", [f.cat, f.title, f.body, f.youtube, f.ba_proc, f.ba_after, f.ba_parts, f.consent, f.published])).rows[0].id;
    }
    for (const [i, m] of pics.entries()) {
      await client.query("insert into media (post_id, ord, width, height, data, thumb) values ($1,$2,$3,$4,$5,$6)", [id, keep.length + i, m.width, m.height, m.data, m.thumb]);
    }
    await client.query("commit");
    audit(req, id === Number(req.params.id) ? "post.update" : "post.create", `post:${id}`, f.title);
    res.json({ id, url: R.postUrl({ id, cat: f.cat }) });
  } catch (e) {
    await client.query("rollback").catch(() => {});
    console.error("save failed:", e);
    res.status(500).json({ error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
  } finally {
    client.release();
  }
}
api.post("/posts", need, take, (req, res) => save(req, res, 0));
api.put("/posts/:id", need, take, (req, res) => save(req, res, Number(req.params.id) || -1));
api.patch("/posts/:id", need, h(async (req, res) => {
  const { rows } = await db.query("update posts set published = $1, updated_at = now() where id = $2 returning id, published, title", [!!req.body?.published, Number(req.params.id) || 0]);
  if (!rows[0]) return res.status(404).json({ error: "없는 글입니다." });
  audit(req, rows[0].published ? "post.show" : "post.hide", `post:${rows[0].id}`, rows[0].title);
  res.json({ id: rows[0].id, published: rows[0].published });
}));
api.delete("/posts/:id", need, h(async (req, res) => {
  const { rows } = await db.query("delete from posts where id = $1 returning id, title", [Number(req.params.id) || 0]);
  if (!rows[0]) return res.status(404).json({ error: "없는 글입니다." });
  audit(req, "post.delete", `post:${rows[0].id}`, rows[0].title);
  res.json({ ok: true });
}));
app.use("/api/admin", api);
app.use("/api", (req, res) => res.status(404).json({ error: "없는 주소입니다." }));

// a post's pictures: kept by number, so a picture's address never changes and can be cached for good
app.get("/media/:id", h(async (req, res, next) => {
  if (!db || !state.ready) return next();
  const { rows } = await db.query(`select ${req.query.s === "t" ? "thumb" : "data"} as img, p.published from media m join posts p on p.id = m.post_id where m.id = $1`, [Number(req.params.id) || 0]);
  if (!rows[0] || (!rows[0].published && !(await whoIs(req)))) return next();
  res.set({ "Content-Type": "image/webp", "Cache-Control": rows[0].published ? "public, max-age=31536000, immutable" : "private, no-store" });
  res.send(rows[0].img);
}));

/* ---------- the board on the site: the built frames, filled from the database ---------- */
const BOARDS = [
  { cat: "news", base: R.BASE.news, per: 15, list: R.newsList, view: R.newsView, frame: "/sub/board/page01/view/" },
  { cat: "column", base: R.BASE.column, per: 12, list: R.columnList, view: R.columnView, frame: "/sub/media/page02/view/" },
  { cat: "video", base: R.BASE.video, per: 13, list: R.videoList },
];
const sendPage = async (req, res, html, rel, staff) => {
  res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": staff ? "private, no-store" : "no-cache" });
  res.send(await dress(req, html, rel));
};
for (const b of BOARDS) {
  app.get(b.base, h(async (req, res, next) => {
    const frame = built(b.base);
    if (!db || !state.ready || !frame) return next();
    const data = await listOf(b.cat, Math.max(1, parseInt(req.query.page, 10) || 1), b.per);
    let html = fill(frame, b.list(data));
    if (data.page > 1) { // the 2nd page on is its own address, not a copy of the 1st
      const url = `${SITE}${b.base}?page=${data.page}`;
      html = html
        .replace(/<link rel="canonical" href="[^"]*"\/?>/, `<link rel="canonical" href="${url}"/>`)
        .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
        .replace(/<title>([^<]*)<\/title>/, `<title>$1 (${data.page}페이지)</title>`);
    }
    await sendPage(req, res, html, b.base);
  }));
  if (!b.view) continue;
  app.get(`${b.base}:id`, (req, res, next) => (!req.path.endsWith("/") && /^\d+$/.test(req.params.id) ? res.redirect(301, `${b.base}${req.params.id}/`) : next()));
  app.get(`${b.base}:id/`, h(async (req, res, next) => {
    const id = Number(req.params.id);
    const frame = built(b.frame);
    if (!id || !/^\d+$/.test(req.params.id) || !db || !state.ready || !frame) return next();
    const { rows } = await db.query(`select ${postCols} from posts where id = $1 and cat = $2`, [id, b.cat]);
    const p = rows[0];
    const staff = !!(await whoIs(req));
    if (!p || (!p.published && !staff)) return next();
    const pics = (await mediaOf([id])).get(id);
    const around = await db.query(
      `(select id, title, 'prev' as side from posts where published and cat = $3 and (created_at, id) > ($1, $2) order by created_at asc, id asc limit 1)
       union all (select id, title, 'next' from posts where published and cat = $3 and (created_at, id) < ($1, $2) order by created_at desc, id desc limit 1)`,
      [p.created_at, p.id, b.cat],
    );
    const nav = { prev: around.rows.find((r) => r.side === "prev"), next: around.rows.find((r) => r.side === "next") };
    await sendPage(req, res, postHead(fill(frame, b.view(p, pics, nav)), p, pics), `${b.base}:id/`, staff);
  }));
}
// the empty frames themselves are not pages
app.get(["/sub/board/page01/view/", "/sub/media/page02/view/"], (req, res) => res.redirect(302, req.path.replace(/view\/$/, "")));

// search engines: every page plus the published posts with their pictures (server/feeds.js)
const publishedForFeeds = async (cols) => {
  const { rows } = await db.query(`select ${cols} from posts where published order by created_at desc, id desc`);
  return { rows, pics: await mediaOf(rows.filter((p) => p.cat !== "video").map((p) => p.id)) };
};
app.get("/sitemap.xml", h(async (req, res, next) => {
  const SITEMAP = (() => { try { return fs.readFileSync(path.join(OUT, "sitemap.xml"), "utf8"); } catch { return ""; } })();
  if (!db || !state.ready || !SITEMAP) return next();
  const { rows, pics } = await publishedForFeeds("id, cat, updated_at");
  res.set({ "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-cache" });
  res.send(feeds.sitemapXml(SITE, SITEMAP, rows, pics));
}));

// the feed for 네이버 서치어드바이저 (RSS 제출) and feed readers: 해운누리 소식 · 전문칼럼, the 50 newest
app.get("/rss.xml", h(async (req, res, next) => {
  if (!db || !state.ready) return next();
  const { rows, pics } = await publishedForFeeds("id, cat, title, body, created_at, updated_at");
  res.set({ "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-cache" });
  res.send(feeds.rssXml(SITE, rows.filter((p) => p.cat !== "video").slice(0, 50), pics));
}));

/* ---------- the admin app: one page, its own files, never indexed or framed ---------- */
const ADMIN_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' data: blob: https://i.ytimg.com; connect-src 'self'; frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};
app.get(["/admin.html", "/admin.html/"], (req, res) => {
  const edit = Number(req.query.edit);
  res.redirect(301, edit ? `/admin/posts/${edit}` : "/admin");
});
app.use("/admin/static", (req, res, next) => { res.set({ ...ADMIN_HEADERS, "Cache-Control": "no-cache" }); next(); }, express.static(path.join(ADMIN, "static"), { cacheControl: false, dotfiles: "ignore", fallthrough: false }));
const ADMIN_PAGE = (() => { try { return fs.readFileSync(path.join(ADMIN, "index.html"), "utf8"); } catch { return ""; } })();
app.get(/^\/admin(\/.*)?$/, (req, res) => {
  res.set({ ...ADMIN_HEADERS, "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8" });
  res.send(PROD ? ADMIN_PAGE : fs.readFileSync(path.join(ADMIN, "index.html"), "utf8"));
});


// the old static board's address for a notice's frame and the old Cloudflare admin are gone: send them on
app.get("/admin/index.html", (req, res) => res.redirect(301, "/admin"));

// the built pages: Next.js files kept for a year, pictures a week, pages checked every time
app.use((req, res, next) => {
  const p = req.path;
  if (p.startsWith("/_next/static/")) res.set("Cache-Control", "public, max-age=31536000, immutable");
  else if (/^\/(img|fonts|files)\//.test(p)) res.set("Cache-Control", `public, max-age=${7 * DAY}`);
  else res.set("Cache-Control", "no-cache");
  next();
});
// a page (a folder with index.html): dressed with the counter, the codes and the popups
app.get(/^\/(?:[\w-]+\/)*$/, h(async (req, res, next) => {
  const html = built(req.path);
  if (!html) return next();
  res.type("html").send(await dress(req, html, req.path));
}));
app.use(express.static(OUT, { cacheControl: false, dotfiles: "ignore", index: false, redirect: false }));
// "/sub/about/page01" → "/sub/about/page01/" when that page exists
app.get(/^\/(?:[\w-]+\/)*[\w-]+$/, (req, res, next) => (built(`${req.path}/`) ? res.redirect(301, `${req.path}/${req.url.slice(req.path.length)}`) : next()));
const NOT_FOUND = (() => { try { return fs.readFileSync(path.join(OUT, "404.html"), "utf8"); } catch { return ""; } })();
app.use(async (req, res) => {
  res.status(404).set("Cache-Control", "no-cache").type("html");
  if (NOT_FOUND && req.method === "GET") return res.send(await dress(req, NOT_FOUND, "404"));
  res.send('<!doctype html><html lang="ko"><meta charset="utf-8"><title>페이지를 찾을 수 없습니다 | 해운누리한의원</title><p style="font-family:sans-serif;text-align:center;margin-top:20vh">페이지를 찾을 수 없습니다. <a href="/">처음으로</a></p></html>');
});
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  if (res.headersSent) return;
  res.status(status).json({ error: status === 404 ? "없는 주소입니다." : status < 500 ? "요청을 처리하지 못했습니다." : "서버에서 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요." });
});

process.on("unhandledRejection", (e) => console.error("unhandled rejection:", e)); // logged, not fatal

app.listen(PORT, () => console.log(`haeun-nuri site on :${PORT} (database ${db ? "configured" : "not configured"}, owner password ${hasOwnerPassword() ? "set" : "not set"})`));
init(onReady).then(() => {
  if (!state.ready) return;
  const run = () => consult.purge().catch((e) => console.error("purge:", e.message));
  setTimeout(run, 60 * 1000).unref();
  setInterval(run, 6 * 3600 * 1000).unref();
});
