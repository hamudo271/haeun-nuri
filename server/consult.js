// Consultations: the site's forms post here (전화 상담, 문자 상담, 예약 신청, 리얼모델 신청), staff add the ones that
// came by phone or KakaoTalk by hand, and the admin follows each one from 신규 to 시술 진행 with notes, a booking time
// and the person in charge. Each request carries where its visitor came from (attrib.js) so 유입 분석 can say which
// channel brings consultations, not just visits.
import crypto from "node:crypto";
import express from "express";
import multer from "multer";
import sharp from "sharp";
import { db, state, getSetting } from "./db.js";
import { h, need, ownerOnly, audit, whoIs } from "./auth.js";
import { classify, pickTags, parseUA, cleanPath } from "./attrib.js";
import * as notify from "./notify.js";
import { SITE_HOST } from "./site.js";

export const KINDS = { tel: "전화 상담", sms: "문자 상담", cost: "비용 상담", booking: "예약 신청", event: "이벤트 신청", model: "리얼모델 신청", manual: "직접 등록", online: "온라인 상담", import: "예전 상담" };
export const STATUS = {
  new: "신규", contacting: "연락 중", booked: "예약 확정", visited: "내원", surgery: "시술 진행",
  hold: "보류", closed: "상담 종료", noshow: "노쇼", canceled: "취소", spam: "스팸",
};
const GROUPS = { open: ["new", "contacting"], active: ["new", "contacting", "booked", "hold"], closed: ["visited", "surgery", "closed", "noshow", "canceled"] };
const PUBLIC_KINDS = ["tel", "sms", "cost", "booking", "event", "model"];
// where a consultation came from, as the list's top tabs (the old admin kept these as separate boards):
// the site's own forms, 리얼모델 신청, and what staff wrote down from a call or KakaoTalk (직접 등록)
export const SOURCES = { web: ["tel", "sms", "cost", "booking", "event", "online"], model: ["model"], manual: ["manual"] };
export const MANUAL = ["전화 문의", "내원", "카카오톡 채널", "인스타그램 DM", "네이버 톡톡", "소개", "기타"];
const TIMES = ["오전 (10–12시)", "점심 (12–14시)", "오후 (14–17시)", "저녁 (17–18시 30분)", "토요일 (10–15시 30분)", "언제든",
  "저녁 (17–19시)", "토요일 (10–16시)"]; // the last two: labels from before the hours changed (2026-09-30)

const KST_DAY = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const str = (v, n) => String(v ?? "").replace(/\r\n?/g, "\n").trim().slice(0, n);
const digits = (v) => String(v ?? "").replace(/\D/g, "");
const phoneOf = (b) => digits(b.phone !== undefined ? b.phone : `${b.hp1 || ""}${b.hp2 || ""}${b.hp3 || ""}`);
const json = (s) => { try { const v = JSON.parse(String(s || "")); return v && typeof v === "object" ? v : {}; } catch { return {}; } };
export const ownHosts = (req) => [req.hostname, "haeun-nuri.com", "www.haeun-nuri.com", SITE_HOST.replace(/:\d+$/, "")].filter(Boolean);
const baseOf = (req) => `${req.protocol}://${req.get("host")}`;

/* ---------- the public form ---------- */
// The site's script asks for JSON. A form sent without it (an old page still open when the domain moved over, a
// browser with scripts off) asks for a page, and gets one: what happened, and how else to reach the clinic.
const wantsPage = (req) => /text\/html/.test(req.get("accept") || "");
const answerPage = (ok, text) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${ok ? "신청이 접수되었습니다" : "신청을 보내지 못했습니다"} | 해운누리한의원</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f1ea;color:#14171b;font-family:Pretendard,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif">
<main style="width:min(440px,calc(100% - 32px));padding:36px 28px;border-radius:24px;background:#fff;text-align:center;line-height:1.6">
<p style="margin:0 auto 18px;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:${ok ? "#9a7748" : "#2b2019"};color:#fff;font-size:28px;font-weight:700">${ok ? "✓" : "!"}</p>
<h1 style="margin:0 0 10px;font-size:22px;letter-spacing:-0.03em">${ok ? "신청이 접수되었습니다" : "신청을 보내지 못했습니다"}</h1>
<p style="margin:0 0 22px;color:#444d57">${text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])}</p>
<p style="margin:0;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${ok ? "" : '<a href="javascript:history.back()" style="padding:12px 18px;border-radius:999px;background:#14171b;color:#fff;text-decoration:none;font-weight:700">돌아가서 고치기</a>'}
<a href="/" style="padding:12px 18px;border-radius:999px;border:1.5px solid #d6dee7;color:#14171b;text-decoration:none;font-weight:700">처음으로</a>
<a href="tel:051-715-4723" style="padding:12px 18px;border-radius:999px;border:1.5px solid #d6dee7;color:#14171b;text-decoration:none;font-weight:700">전화 051-715-4723</a></p>
</main></body></html>`;
function answer(req, res, status, body) {
  res.set("Cache-Control", "no-store");
  if (!wantsPage(req)) return res.status(status).json(body);
  const ok = status < 300;
  return res.status(ok ? 200 : status).type("html").send(answerPage(ok, ok ? "진료 시간에 받은 순서대로 병원에서 연락드립니다." : body.error || "잠시 뒤 다시 시도하시거나 전화로 연락해 주세요."));
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024, files: 4, fields: 40, fieldSize: 8000 } });
const takePhotos = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();
  upload.array("photos", 4)(req, res, (err) => {
    if (err) return answer(req, res, 400, { error: err.code === "LIMIT_FILE_SIZE" ? "사진 한 장은 12MB까지 보낼 수 있습니다." : err.code === "LIMIT_FILE_COUNT" ? "사진은 4장까지 보낼 수 있습니다." : "보낸 내용을 받지 못했습니다. 다시 시도해 주세요." });
    next();
  });
};

async function photos(files) {
  const out = [];
  for (const f of files) {
    if (!/^image\//.test(f.mimetype)) throw new Error("사진 파일만 보낼 수 있습니다.");
    try {
      const base = sharp(f.buffer, { failOn: "none" }).rotate();
      const full = await base.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
      const thumb = await base.clone().resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true }).webp({ quality: 70 }).toBuffer();
      out.push({ data: full.data, width: full.info.width, height: full.info.height, thumb });
    } catch { throw new Error("사진을 읽지 못했습니다. JPG나 PNG 사진으로 다시 보내 주세요."); }
  }
  return out;
}

// sends per address: 6 in 10 minutes
const sent = new Map();
setInterval(() => { const t = Date.now() - 600000; for (const [k, v] of sent) { const keep = v.filter((x) => x > t); if (keep.length) sent.set(k, keep); else sent.delete(k); } }, 600000).unref();

// where the visit came from: the counter's own record of the visit first, else what the browser kept (fb-a in localStorage)
async function attribution(req, b) {
  const ua = String(req.headers["user-agent"] || "");
  const own = ownHosts(req);
  const touch = json(b.touch);
  const vid = str(b.vid, 40) || null;
  const sid = str(b.sid, 40) || null;
  const out = { visitor: vid, visit: sid };
  const visit = sid ? (await db.query("select * from visits where id = $1", [sid])).rows[0] : null;
  if (visit) Object.assign(out, { grp: visit.grp, channel: visit.channel, source: visit.source, medium: visit.medium, campaign: visit.campaign, keyword: visit.keyword, landing: visit.landing, referrer: visit.referrer });
  else {
    const e = touch.e || {};
    const c = classify({ ref: e.r, tags: pickTags(e.q), ua, own });
    Object.assign(out, { grp: c.grp, channel: c.channel, source: c.source, medium: c.medium, campaign: c.campaign, keyword: c.keyword, landing: e.l ? cleanPath(e.l) : null, referrer: c.refHost });
  }
  const first = vid ? (await db.query("select channel, started_at from visits where visitor = $1 order by started_at limit 1", [vid])).rows[0] : null;
  if (first) Object.assign(out, { first_channel: first.channel, first_at: first.started_at });
  else if (touch.f) {
    const f = touch.f;
    Object.assign(out, { first_channel: classify({ ref: f.r, tags: pickTags(f.q), ua, own }).channel, first_at: Number(f.at) ? new Date(Number(f.at)) : null });
  }
  const u = parseUA(ua);
  return { ...out, device: u.device, browser: u.browser };
}

export function publicRoutes(app) {
  app.post(["/api/consult", "/htm/counsel_sms_ok.php", "/htm/top_counsel_ok.php"], express.urlencoded({ extended: false, limit: "64kb" }), express.json({ limit: "64kb" }), takePhotos, h(async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!db || !state.ready) return answer(req, res, 503, { error: "지금은 온라인 신청을 받을 수 없습니다. 전화 051-715-4723이나 카카오톡으로 연락해 주세요.", offline: true });
    if (req.headers.origin) {
      let from = "";
      try { from = new URL(req.headers.origin).hostname; } catch { return answer(req, res, 403, { error: "잘못된 요청입니다." }); }
      if (!ownHosts(req).includes(from)) return answer(req, res, 403, { error: "다른 사이트에서 온 요청입니다." });
    }
    const legacy = req.path.startsWith("/htm/"); // the old site's forms: its own field names, its own checks
    const b = req.body || {};
    const ip = req.ip || "?";
    const mine = (sent.get(ip) || []).filter((t) => t > Date.now() - 600000);
    if (mine.length >= 6) return answer(req, res, 429, { error: "신청이 여러 번 들어왔습니다. 잠시 뒤에 다시 보내 주시거나 전화로 연락해 주세요." });

    const kind = PUBLIC_KINDS.includes(b.kind) ? b.kind : ({ T: "tel", S: "sms" })[b.cate] || (legacy ? "tel" : "");
    if (!kind) return answer(req, res, 400, { error: "신청 종류를 알 수 없습니다." });
    const f = {
      kind,
      name: str(b.name !== undefined ? b.name : b.mname, 20),
      phone: phoneOf(b),
      interest: str(Array.isArray(b.parts) ? b.parts.join(", ") : b.parts || b.interest, 60) || null,
      message: str(b.message !== undefined ? b.message : b.contents, 2000),
      prefer_date: null,
      prefer_time: str(b.prefer_time, 30) || null,
      age: str(b.age, 10) || null,
      gender: { F: "여", M: "남", 여: "여", 남: "남" }[b.gender] || null,
      topic: str(b.topic, 80) || null,
    };
    const errs = {};
    if (!f.name) errs.name = "이름을 적어 주세요.";
    if (!/^01[016789]\d{7,8}$/.test(f.phone)) errs.phone = "휴대폰 번호를 확인해 주세요.";
    if ((kind === "tel" || kind === "sms") && !legacy && f.message.length < 5) errs.message = "상담 내용을 조금 더 적어 주세요.";
    if (kind === "booking") {
      const d = str(b.prefer_date, 10);
      const today = KST_DAY();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < today || d > addDays(today, 120)) errs.prefer_date = "희망 날짜를 오늘부터 120일 안에서 골라 주세요.";
      else if (new Date(`${d}T00:00:00Z`).getUTCDay() === 0) errs.prefer_date = "일요일은 휴진입니다. 다른 날을 골라 주세요.";
      else f.prefer_date = d;
      if (f.prefer_time && !TIMES.includes(f.prefer_time)) f.prefer_time = str(f.prefer_time, 30);
    }
    if (kind === "model" && !f.interest) errs.parts = "희망 부위를 하나 이상 골라 주세요.";
    if (kind === "cost" && !f.interest) errs.interest = "궁금한 시술을 골라 주세요.";
    if (kind === "event" && !f.topic) errs.topic = "신청할 이벤트를 골라 주세요.";
    if (!/^(1|on|true|yes|y)$/i.test(String(b.agree || b.agreement || ""))) errs.agree = "개인정보 수집·이용에 동의해 주세요.";
    if (Object.keys(errs).length) return answer(req, res, 400, { error: Object.values(errs)[0], fields: errs });

    let pics = [];
    try { pics = await photos(req.files || []); } catch (e) { return answer(req, res, 400, { error: e.message, fields: { photos: e.message } }); }

    // a robot fills the hidden field or sends within two seconds of the page opening: kept, but as spam
    const quick = Number(b.ts) > 0 && Date.now() - Number(b.ts) < 2000;
    const spam = !!str(b.website, 200) || quick;
    const dup = await db.query("select id from consults where phone = $1 and kind = $2 and created_at > now() - interval '3 minutes' limit 1", [f.phone, kind]);
    if (dup.rows[0]) return answer(req, res, 200, { ok: true });

    const a = await attribution(req, b);
    mine.push(Date.now());
    sent.set(ip, mine);
    const page = b.page ? cleanPath(b.page) : legacy ? `${cleanPath(b.returnPath || req.path)} (예전 사이트 양식)` : null;
    const key = kind === "sms" ? crypto.randomBytes(12).toString("hex") : null;
    const client = await db.connect();
    let row;
    try {
      await client.query("begin");
      row = (await client.query(
        `insert into consults (kind, status, name, phone, interest, message, prefer_date, prefer_time, age, gender, grp, channel, source, medium, campaign, keyword,
          first_channel, first_at, landing, referrer, page, device, browser, visitor, visit, ip, agree, topic, client_key)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,true,$27,$28) returning id, created_at, kind, interest, channel`,
        [kind, spam ? "spam" : "new", f.name, f.phone, f.interest, f.message, f.prefer_date, f.prefer_time, f.age, f.gender, a.grp, a.channel, a.source, a.medium, a.campaign, a.keyword,
          a.first_channel || null, a.first_at || null, a.landing, a.referrer, page, a.device, a.browser, a.visitor, a.visit, ip, f.topic, key],
      )).rows[0];
      for (const [i, p] of pics.entries()) await client.query("insert into consult_files (consult_id, ord, width, height, data, thumb) values ($1,$2,$3,$4,$5,$6)", [row.id, i, p.width, p.height, p.data, p.thumb]);
      if (spam) await client.query("insert into consult_notes (consult_id, kind, body) values ($1, 'system', $2)", [row.id, quick ? "페이지를 연 지 2초 안에 보낸 신청이라 스팸으로 분류했습니다." : "사람에게는 보이지 않는 칸이 채워져 있어 스팸으로 분류했습니다."]);
      await client.query("commit");
    } catch (e) {
      await client.query("rollback").catch(() => {});
      throw e;
    } finally { client.release(); }
    if (a.visit) {
      db.query("update visits set consult_id = $1 where id = $2", [row.id, a.visit]).catch(() => {});
      db.query("insert into hits (visit, kind, path, target) values ($1, 'consult', $2, $3)", [a.visit, page, kind]).catch(() => {});
    }
    if (!spam) notify.newConsult(row, baseOf(req), KINDS[kind]);
    answer(req, res, 200, { ok: true, saved: true, kind, ...(key && !spam ? { ref: `${row.id}.${key}` } : {}) });
  }));

  // 문자 상담: the page that took the request opened the visitor's SMS app on the clinic's number. Noted once, on the
  // request itself, so the clinic knows to look in its phone's inbox (whether the text was sent cannot be known)
  app.post("/api/consult/opened", express.json({ limit: "2kb" }), express.text({ type: "text/plain", limit: "2kb" }), h(async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!db || !state.ready) return res.status(204).end();
    let ref = req.body && typeof req.body === "object" ? req.body.ref : "";
    if (typeof req.body === "string") { try { ref = JSON.parse(req.body).ref; } catch { ref = ""; } }
    const m = /^(\d{1,9})\.([0-9a-f]{24})$/.exec(String(ref || ""));
    if (!m) return res.status(204).end();
    const { rows } = await db.query(
      "update consults set sms_opened_at = now() where id = $1 and client_key = $2 and sms_opened_at is null and created_at > now() - interval '1 hour' returning id",
      [Number(m[1]), m[2]],
    );
    if (rows[0]) await db.query("insert into consult_notes (consult_id, kind, body) values ($1, 'system', $2)", [rows[0].id, "고객 휴대폰에서 병원 번호로 문자 앱이 열렸습니다. 보낸 문자는 문자 받는 휴대폰에서 확인해 주세요."]);
    res.status(204).end();
  }));
}

/* ---------- the admin ---------- */
const LIST_COLS = `c.id, c.kind, c.status, c.name, c.phone, c.interest, c.topic, left(c.message, 90) as message, c.prefer_date, c.prefer_time, c.booked_at, c.amount,
  c.assignee, u.name as assignee_name, c.grp, c.channel, c.keyword, c.created_at, c.read_at, c.device, c.replied_at, c.replied_by, c.sms_opened_at,
  (select count(*)::int from consult_notes n where n.consult_id = c.id and n.kind = 'note') as notes,
  (select count(*)::int from consult_files f where f.consult_id = c.id) as files,
  case when c.phone = '' then 0 else (select count(*)::int from consults o where o.phone = c.phone and o.id <> c.id and o.status <> 'spam') end as repeat`;

// the list's filters, shared by the list, its counts and the CSV
function filters(q, user, withStatus = true) {
  const where = [];
  const args = [];
  const add = (sql, v) => { args.push(v); where.push(sql.replace("?", `$${args.length}`)); };
  const st = String(q.status || "");
  if (withStatus) {
    if (GROUPS[st]) add("c.status = any(?)", GROUPS[st]);
    else if (STATUS[st]) add("c.status = ?", st);
    else where.push("c.status <> 'spam'");
  } else if (st !== "spam") where.push("c.status <> 'spam'");
  if (KINDS[q.kind]) add("c.kind = ?", q.kind);
  else if (SOURCES[q.kind]) add("c.kind = any(?)", SOURCES[q.kind]);
  // 문자 답변: waiting or done (only 문자 상담 has it)
  if (q.reply === "wait") where.push("c.kind = 'sms' and c.replied_at is null and c.status not in ('closed', 'canceled', 'spam')");
  else if (q.reply === "done") where.push("c.kind = 'sms' and c.replied_at is not null");
  if (q.channel) add("c.channel = ?", String(q.channel).slice(0, 60));
  if (q.grp) add("c.grp = ?", String(q.grp).slice(0, 30));
  if (q.assignee === "me" && user) add("c.assignee = ?", user.id);
  else if (q.assignee === "none") where.push("c.assignee is null");
  else if (Number(q.assignee)) add("c.assignee = ?", Number(q.assignee));
  if (/^\d{4}-\d{2}-\d{2}$/.test(q.from || "")) add("c.created_at >= (?::date)::timestamp at time zone 'Asia/Seoul'", q.from);
  if (/^\d{4}-\d{2}-\d{2}$/.test(q.to || "")) add("c.created_at < ((?::date) + 1)::timestamp at time zone 'Asia/Seoul'", q.to);
  const text = String(q.q || "").trim().slice(0, 40);
  if (text) {
    const d = digits(text);
    args.push(`%${text.replace(/[%_\\]/g, "")}%`);
    const t = `$${args.length}`;
    let phone = "";
    if (d.length >= 3) { args.push(`%${d}%`); phone = ` or c.phone like $${args.length}`; }
    where.push(`(c.name ilike ${t} or c.message ilike ${t} or c.interest ilike ${t}${phone} or exists (select 1 from consult_notes n where n.consult_id = c.id and n.body ilike ${t}))`);
  }
  return { where: where.length ? `where ${where.join(" and ")}` : "", args };
}

const SORTS = { new: "c.created_at desc, c.id desc", old: "c.created_at asc, c.id asc", booked: "c.booked_at asc nulls last, c.id desc", updated: "c.updated_at desc, c.id desc" };
const fmtKST = (d) => (d ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(new Date(d)) : "");
// a cell a visitor typed could start with "=" and run as a formula in Excel: such cells start with ' instead
const csvCell = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d[\d,.]*$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const fmtPhone = (p) => String(p || "").replace(/^(01\d)(\d{3,4})(\d{4})$/, "$1-$2-$3").replace(/^(02)(\d{3,4})(\d{4})$/, "$1-$2-$3").replace(/^(0\d{2})(\d{3,4})(\d{4})$/, "$1-$2-$3");

const viewed = new Map();
setInterval(() => { const t = Date.now() - 600000; for (const [k, v] of viewed) if (v < t) viewed.delete(k); }, 600000).unref();

export function adminRoutes(api, titleOf) {
  api.get("/pulse", need, h(async (req, res) => {
    const { rows } = await db.query(`select count(*) filter (where status = 'new' and read_at is null)::int as unread, count(*) filter (where status = 'new')::int as open, coalesce(max(id), 0) as latest,
      count(*) filter (where kind = 'sms' and replied_at is null and status not in ('closed', 'canceled'))::int as sms_wait from consults where status <> 'spam'`);
    res.json(rows[0]);
  }));

  api.get("/consults", need, h(async (req, res) => {
    const size = Math.min(100, Math.max(10, Number(req.query.size) || 40));
    const page = Math.max(1, Number(req.query.page) || 1);
    const f = filters(req.query, req._user);
    const total = (await db.query(`select count(*)::int as n from consults c ${f.where}`, f.args)).rows[0].n;
    const { rows } = await db.query(`select ${LIST_COLS} from consults c left join users u on u.id = c.assignee ${f.where} order by ${SORTS[req.query.sort] || SORTS.new} limit ${size} offset ${(page - 1) * size}`, f.args);
    const c = filters(req.query, req._user, false);
    const counts = Object.fromEntries((await db.query(`select c.status, count(*)::int as n from consults c ${c.where} group by c.status`, c.args)).rows.map((r) => [r.status, r.n]));
    if (req.query.status !== "spam") counts.spam = (await db.query("select count(*)::int as n from consults where status = 'spam'")).rows[0].n;
    const reply = (await db.query(`select count(*) filter (where replied_at is null and status not in ('closed', 'canceled'))::int as wait, count(*) filter (where replied_at is not null)::int as done
      from consults where kind = 'sms' and status <> 'spam'`)).rows[0];
    const s = filters({ ...req.query, kind: "" }, req._user);
    const sources = (await db.query(`select count(*)::int as "all", ${Object.entries(SOURCES).map(([k, v]) => `count(*) filter (where c.kind in (${v.map((x) => `'${x}'`).join(", ")}))::int as ${k}`).join(", ")}
      from consults c ${s.where}`, s.args)).rows[0];
    res.json({ items: rows, total, page, size, counts, reply, sources });
  }));

  // CSV of the list as filtered, every row (no cap: with the old admin's records it runs past 27,000), read 2,000 at
  // a time and written as it goes. The staff notes and the old admin's answers ride along in 메모, so the file is also
  // a full copy of what was written.
  api.get("/consults/export.csv", ownerOnly, h(async (req, res) => {
    const f = filters(req.query, req._user);
    const head = ["번호", "접수 일시", "종류", "상태", "문자 답변", "이름", "연락처", "관심 부위", "내용", "희망 날짜", "희망 시간", "예약 일시", "금액", "담당", "유입 분류", "유입 채널", "검색어", "캠페인", "첫 유입", "첫 방문", "들어온 페이지", "신청 페이지", "기기", "메모"];
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="consults-${KST_DAY()}.csv"` });
    res.write(`\ufeff${head.join(",")}\r\n`);
    let n = 0;
    let last = null;
    try {
      for (;;) {
        const args = [...f.args];
        let where = f.where;
        if (last) { args.push(last.at, last.id); where = `${where ? `${where} and` : "where"} (c.created_at, c.id) < ($${args.length - 1}::timestamptz, $${args.length}::int)`; }
        const { rows } = await db.query(`select c.*, c.created_at::text as at_key, u.name as assignee_name from consults c left join users u on u.id = c.assignee ${where} order by c.created_at desc, c.id desc limit 2000`, args);
        if (!rows.length) break;
        const notes = new Map();
        for (const x of (await db.query("select consult_id, at, who, body from consult_notes where kind = 'note' and consult_id = any($1) order by at, id", [rows.map((r) => r.id)])).rows) {
          const line = `[${fmtKST(x.at)}${x.who ? ` ${x.who}` : ""}] ${x.body}`;
          notes.set(x.consult_id, notes.has(x.consult_id) ? `${notes.get(x.consult_id)}\n${line}` : line);
        }
        const lines = rows.map((r) => [r.id, fmtKST(r.created_at), KINDS[r.kind], STATUS[r.status], r.kind === "sms" ? (r.replied_at ? `답변 완료 ${fmtKST(r.replied_at)} ${r.replied_by || ""}`.trim() : "답변 대기") : "", r.name, fmtPhone(r.phone), r.interest, r.message, r.prefer_date ? String(r.prefer_date).slice(0, 10) : "", r.prefer_time,
          fmtKST(r.booked_at), r.amount, r.assignee_name, r.grp, r.channel, r.keyword, r.campaign, r.first_channel, fmtKST(r.first_at), r.landing, r.page, r.device, notes.get(r.id) || ""].map(csvCell).join(","));
        res.write(`${lines.join("\r\n")}\r\n`);
        n += rows.length;
        last = { at: rows[rows.length - 1].at_key, id: rows[rows.length - 1].id }; // the exact text: a JS Date would drop the microseconds
        if (rows.length < 2000 || res.destroyed) break;
      }
    } catch (e) {
      console.error("export:", e.message);
      res.write(`\r\n"내려받기가 중간에 멈췄습니다 (${n}건까지 담김). 다시 내려받아 주세요."\r\n`);
    }
    audit(req, "consult.export", null, `${n}건`);
    res.end();
  }));

  api.get("/consults/:id", need, h(async (req, res) => {
    const id = Number(req.params.id) || 0;
    const { rows } = await db.query("select c.*, u.name as assignee_name from consults c left join users u on u.id = c.assignee where c.id = $1", [id]);
    const c = rows[0];
    if (!c) return res.status(404).json({ error: "없는 상담입니다." });
    if (!c.read_at) { await db.query("update consults set read_at = now() where id = $1", [id]); c.read_at = new Date(); }
    const notes = (await db.query("select id, at, user_id, who, kind, body from consult_notes where consult_id = $1 order by at, id", [id])).rows;
    const files = (await db.query("select id, width, height from consult_files where consult_id = $1 order by ord, id", [id])).rows;
    const others = c.phone ? (await db.query("select id, kind, status, created_at, interest from consults where phone = $1 and id <> $2 and status <> 'spam' order by created_at desc limit 20", [c.phone, id])).rows : [];
    let journey = [];
    let visit = null;
    if (c.visit) {
      visit = (await db.query("select started_at, pages, device, os, browser, is_new from visits where id = $1", [c.visit])).rows[0] || null;
      journey = (await db.query("select at, kind, path, target from hits where visit = $1 and at <= $2::timestamptz + interval '1 minute' order by at limit 60", [c.visit, c.created_at])).rows.map((x) => ({ ...x, title: x.path ? titleOf(x.path) : null }));
    }
    let visits = 0;
    if (c.visitor) visits = (await db.query("select count(*)::int as n from visits where visitor = $1 and started_at <= $2::timestamptz", [c.visitor, c.created_at])).rows[0].n;
    delete c.ip;
    delete c.client_key;
    c.landing_title = c.landing ? titleOf(c.landing) : null;
    c.page_title = c.page ? titleOf(c.page) : null;
    // one line in the 접속 기록 per person and consultation every ten minutes, not one for every redraw
    const seenKey = `${req._user.id}:${id}`;
    if (!(viewed.get(seenKey) > Date.now() - 600000)) { viewed.set(seenKey, Date.now()); audit(req, "consult.view", `consult:${id}`); }
    res.json({ consult: c, notes, files, others, journey, visit, visits });
  }));

  api.get("/consult-files/:id", need, h(async (req, res) => {
    const { rows } = await db.query(`select ${req.query.s === "t" ? "thumb" : "data"} as img from consult_files where id = $1`, [Number(req.params.id) || 0]);
    if (!rows[0]) return res.status(404).end();
    res.set({ "Content-Type": "image/webp", "Cache-Control": "private, no-store" });
    res.send(rows[0].img);
  }));

  // staff enter a consultation that came by phone, in person or by KakaoTalk
  api.post("/consults", need, h(async (req, res) => {
    const b = req.body || {};
    const name = str(b.name, 20);
    const phone = digits(b.phone);
    const channel = MANUAL.includes(b.channel) ? b.channel : "기타";
    if (!name) return res.status(400).json({ error: "이름을 적어 주세요." });
    if (!/^0\d{8,10}$/.test(phone)) return res.status(400).json({ error: "연락처를 확인해 주세요." });
    const status = STATUS[b.status] && b.status !== "spam" ? b.status : "new";
    const booked = b.booked_at ? new Date(b.booked_at) : null;
    if (booked && Number.isNaN(booked.getTime())) return res.status(400).json({ error: "예약 일시를 확인해 주세요." });
    const { rows } = await db.query(
      `insert into consults (kind, status, name, phone, interest, message, booked_at, grp, channel, agree, assignee, read_at, contacted_at)
       values ('manual', $1, $2, $3, $4, $5, $6, '직접 등록', $7, true, $8, now(), case when $1 <> 'new' then now() end) returning id`,
      [status, name, phone, str(b.interest, 60) || null, str(b.message, 2000), booked, channel, req._user.id],
    );
    await db.query("insert into consult_notes (consult_id, user_id, who, kind, body) values ($1, $2, $3, 'system', $4)", [rows[0].id, req._user.id, req._user.name, `${req._user.name}님이 직접 등록했습니다. (${channel})`]);
    audit(req, "consult.create", `consult:${rows[0].id}`);
    res.json({ id: rows[0].id });
  }));

  api.patch("/consults/:id", need, h(async (req, res) => {
    const id = Number(req.params.id) || 0;
    const { rows } = await db.query("select c.*, u.name as assignee_name from consults c left join users u on u.id = c.assignee where c.id = $1", [id]);
    const c = rows[0];
    if (!c) return res.status(404).json({ error: "없는 상담입니다." });
    const b = req.body || {};
    const sets = [];
    const args = [];
    const notes = [];
    const set = (col, v) => { args.push(v); sets.push(`${col} = $${args.length}`); };
    if (b.status !== undefined && b.status !== c.status) {
      if (!STATUS[b.status]) return res.status(400).json({ error: "상태를 확인해 주세요." });
      set("status", b.status);
      if (!c.contacted_at && c.status === "new" && b.status !== "spam") sets.push("contacted_at = now()");
      notes.push(["status", `${STATUS[c.status]} → ${STATUS[b.status]}`]);
    }
    if (b.replied !== undefined && !!b.replied !== !!c.replied_at) {
      if (b.replied) {
        sets.push("replied_at = now()");
        set("replied_by", req._user.name);
        notes.push(["status", "문자 답변 완료"]);
        // answered means contacted: a 신규 request moves on to 연락 중
        if (c.status === "new" && b.status === undefined) {
          set("status", "contacting");
          notes.push(["status", `${STATUS.new} → ${STATUS.contacting}`]);
        }
        if (!c.contacted_at && !sets.includes("contacted_at = now()")) sets.push("contacted_at = now()");
      } else {
        sets.push("replied_at = null", "replied_by = null");
        notes.push(["status", "문자 답변 대기로 되돌림"]);
      }
    }
    if (b.booked_at !== undefined) {
      const d = b.booked_at ? new Date(b.booked_at) : null;
      if (d && Number.isNaN(d.getTime())) return res.status(400).json({ error: "예약 일시를 확인해 주세요." });
      if (String(d && d.getTime()) !== String(c.booked_at && new Date(c.booked_at).getTime())) {
        set("booked_at", d);
        notes.push(["booking", d ? `예약 ${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(d)}` : "예약 일시를 지웠습니다."]);
      }
    }
    if (b.assignee !== undefined) {
      const a = b.assignee ? Number(b.assignee) : null;
      if (a !== c.assignee) {
        let who = null;
        if (a) { who = (await db.query("select name from users where id = $1 and active", [a])).rows[0]; if (!who) return res.status(400).json({ error: "담당자를 확인해 주세요." }); }
        set("assignee", a);
        notes.push(["assign", a ? `담당 ${who.name}` : "담당을 비웠습니다."]);
      }
    }
    if (b.amount !== undefined) {
      const n = b.amount === "" || b.amount === null ? null : Math.round(Number(String(b.amount).replace(/[^\d.-]/g, "")));
      if (n !== null && (!Number.isFinite(n) || n < 0 || n > 2000000000)) return res.status(400).json({ error: "금액을 확인해 주세요." });
      if (n !== c.amount) { set("amount", n); notes.push(["edit", n === null ? "금액을 지웠습니다." : `금액 ${n.toLocaleString("ko-KR")}원`]); }
    }
    for (const [key, label, n] of [["name", "이름", 20], ["interest", "관심 부위", 60], ["prefer_time", "희망 시간", 30]]) {
      if (b[key] === undefined) continue;
      const v = str(b[key], n) || null;
      if (key === "name" && !v) return res.status(400).json({ error: "이름을 적어 주세요." });
      if (v !== c[key]) { set(key, v); notes.push(["edit", `${label}: ${v || "(비움)"}`]); }
    }
    if (b.phone !== undefined) {
      const p = digits(b.phone);
      if (!/^0\d{8,10}$/.test(p)) return res.status(400).json({ error: "연락처를 확인해 주세요." });
      if (p !== c.phone) { set("phone", p); notes.push(["edit", `연락처: ${fmtPhone(p)}`]); }
    }
    if (!sets.length) return res.json({ ok: true, same: true });
    sets.push("updated_at = now()");
    args.push(id);
    await db.query(`update consults set ${sets.join(", ")} where id = $${args.length}`, args);
    for (const [kind, body] of notes) await db.query("insert into consult_notes (consult_id, user_id, who, kind, body) values ($1, $2, $3, $4, $5)", [id, req._user.id, req._user.name, kind, body]);
    audit(req, "consult.update", `consult:${id}`, notes.map((n) => n[1]).join(" / "));
    res.json({ ok: true });
  }));

  api.post("/consults/:id/notes", need, h(async (req, res) => {
    const id = Number(req.params.id) || 0;
    const body = str(req.body?.body, 3000);
    if (!body) return res.status(400).json({ error: "메모를 적어 주세요." });
    const got = await db.query("update consults set updated_at = now() where id = $1 returning id", [id]);
    if (!got.rows[0]) return res.status(404).json({ error: "없는 상담입니다." });
    const { rows } = await db.query("insert into consult_notes (consult_id, user_id, who, kind, body) values ($1, $2, $3, 'note', $4) returning id, at, user_id, who, kind, body", [id, req._user.id, req._user.name, body]);
    audit(req, "consult.note", `consult:${id}`);
    res.json({ note: rows[0] });
  }));
  api.delete("/consults/:id/notes/:nid", need, h(async (req, res) => {
    const { rows } = await db.query("select user_id, kind from consult_notes where id = $1 and consult_id = $2", [Number(req.params.nid) || 0, Number(req.params.id) || 0]);
    const n = rows[0];
    if (!n || n.kind !== "note") return res.status(404).json({ error: "없는 메모입니다." });
    if (n.user_id !== req._user.id && req._user.role !== "owner") return res.status(403).json({ error: "내가 쓴 메모만 지울 수 있습니다." });
    await db.query("delete from consult_notes where id = $1", [Number(req.params.nid)]);
    audit(req, "consult.note.delete", `consult:${req.params.id}`);
    res.json({ ok: true });
  }));

  api.delete("/consults/:id", ownerOnly, h(async (req, res) => {
    const { rows } = await db.query("delete from consults where id = $1 returning id, name", [Number(req.params.id) || 0]);
    if (!rows[0]) return res.status(404).json({ error: "없는 상담입니다." });
    audit(req, "consult.delete", `consult:${rows[0].id}`, `${String(rows[0].name).slice(0, 1)}**`);
    res.json({ ok: true });
  }));

  // 예전 상담 가져오기: rows read in the browser from the old admin's exports (importer.js), a few hundred at a time.
  // Each row carries a key (the old board's 글ID, or a hash of the row), so a file sent twice adds nothing.
  // Rows: { key, name, phone, at, message, interest, where, done, memo, answer, answer_at, old_status,
  //         prefer_date, prefer_time, booked_at, photos } — only name or phone, and at, are needed.
  const OLD_KINDS = ["tel", "sms", "cost", "event", "booking", "model", "manual", "online"];
  const kst = (v) => {
    const t = String(v || "").trim();
    if (!t) return null;
    // "2026-09-28", "2026-09-28 12:52", "2026 08 19 17 30": read as Korean time (a date alone: 09:00, as before)
    const m = t.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2}))?)?/);
    if (!m) { const d = new Date(t); return Number.isNaN(d.getTime()) ? null : d; }
    const [, y, mo, d, hh, mi, ss] = m;
    const p2 = (x) => String(x || 0).padStart(2, "0");
    const d2 = new Date(`${y}-${p2(mo)}-${p2(d)}T${hh === undefined ? "09" : p2(hh)}:${p2(mi)}:${p2(ss)}+09:00`);
    return Number.isNaN(d2.getTime()) ? null : d2;
  };
  api.post("/consults/import", ownerOnly, h(async (req, res) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 500) : [];
    const kind = OLD_KINDS.includes(req.body?.kind) ? req.body.kind : "import";
    // mapped: the columns were matched by hand and the kind chosen by a person (importer.js), so a second try with
    // another kind must not add the same people again. The old admin's own exports keep one record per form: the same
    // words sent on two forms the same day are two real requests (32 such pairs in the 2026-10 files).
    const mapped = req.body?.mapped === true;
    const recent = Date.now() - 14 * 86400000;
    // an export's rows are checked only against the (few) rows once brought in by hand, read once here
    const sig = (phone, name, day, message) => `${phone}|${phone ? "" : name}|${day}|${crypto.createHash("md5").update(message).digest("hex")}`;
    const kstDay = (d) => new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 10);
    const byHand = mapped ? null : new Set((await db.query(
      "select phone, name, ((created_at at time zone 'Asia/Seoul')::date)::text as day, message from consults where import_key like 'm:%'",
    )).rows.map((x) => sig(x.phone, x.name, x.day, x.message)));
    let added = 0;
    let skipped = 0;
    const bad = [];
    for (const [i, r] of rows.entries()) {
      const name = str(r.name, 20);
      const raw = digits(r.phone);
      const phone = /^0\d{8,10}$/.test(raw) ? raw : "";
      const at = kst(r.at);
      if (!name && !phone) { skipped += 1; continue; }
      if (!at) { bad.push(i + 1); continue; }
      let message = str(r.message, 4000);
      if (!phone && str(r.phone, 30).replace(/[-\s]/g, "")) message = `${message}\n\n(예전 기록의 연락처: ${str(r.phone, 30)})`.trim();
      const hash = crypto.createHash("sha1").update([phone, name, at.toISOString(), message].join("|")).digest("hex").slice(0, 24);
      const key = mapped ? `m:${hash}` : r.key ? `${kind}:${str(r.key, 60)}` : `${kind}:${hash}`;
      // the same person, the same Korean day, the same words, already brought over under any kind: by hand (either way
      // round), or by an export when this row comes by hand
      if (!mapped && byHand.has(sig(phone, name || "(이름 없음)", kstDay(at), message))) { skipped += 1; continue; }
      const same = !mapped ? { rows: [] } : await db.query(
        `select 1 from consults where grp = '예전 사이트' and (case when $1 = '' then phone = '' and name = $2 else phone = $1 end)
           and (created_at at time zone 'Asia/Seoul')::date = ($3::timestamptz at time zone 'Asia/Seoul')::date and message = $4
           and ($5 or import_key like 'm:%') limit 1`,
        [phone, name, at, message, mapped],
      );
      if (same.rows[0]) { skipped += 1; continue; }
      // rows brought in before keys existed: same number within a minute
      if (phone) {
        const dup = await db.query("select 1 from consults where import_key is null and grp = '예전 사이트' and phone = $1 and created_at between $2::timestamptz - interval '1 minute' and $2::timestamptz + interval '1 minute' limit 1", [phone, at]);
        if (dup.rows[0]) { skipped += 1; continue; }
      }
      const answered = r.done === true || /^(y|yes|o|완료|답변|처리|확인|1|true)/i.test(String(r.done ?? "").trim()) || !!str(r.answer, 10);
      const booked = kst(r.booked_at);
      const old = String(r.old_status || "");
      let status = at.getTime() > recent ? (answered ? "contacting" : "new") : "closed";
      if (kind === "booking") status = /취소/.test(old) ? "canceled" : /진료완료|내원/.test(old) ? "visited" : booked && booked.getTime() > Date.now() ? "booked" : status;
      const preferDate = /^\d{4}-\d{2}-\d{2}$/.test(String(r.prefer_date || "")) ? r.prefer_date : null;
      const where = str(r.where, 20);
      const c = (await db.query(
        `insert into consults (kind, status, name, phone, interest, message, prefer_date, prefer_time, booked_at, grp, channel, device, agree, created_at, updated_at, read_at,
           contacted_at, replied_at, replied_by, import_key)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, '예전 사이트', $10, $11, true, $12, $12, $12,
           case when $13 then $12::timestamptz end, case when $13 and $1 = 'sms' then $12::timestamptz end, case when $13 and $1 = 'sms' then '예전 관리자' end, $14)
         on conflict (import_key) where import_key is not null do nothing returning id`,
        [kind, status, name || "(이름 없음)", phone, str(r.interest, 60) || null, message, preferDate, str(r.prefer_time, 20) || null, booked,
          `예전 홈페이지${where ? ` · ${where}` : ""}`, /모바일|mobile/i.test(where) ? "모바일" : where ? "PC" : null, at, answered, key],
      )).rows[0];
      if (!c) { skipped += 1; continue; }
      const notes = [];
      const memo = str(r.memo, 3000);
      if (memo) notes.push([at, "note", memo]);
      const answer = str(r.answer, 8000);
      if (answer) notes.push([kst(r.answer_at) || at, "note", `예전 답변\n${answer}`]);
      if (old) notes.push([at, "system", `예전 관리자의 상태: ${str(old, 40)}`]);
      if (Number(r.photos) > 0) notes.push([at, "system", `예전 사이트에 사진 ${Number(r.photos)}장이 있었습니다. 예전 서버의 파일이라 여기로 옮겨지지 않았습니다.`]);
      for (const [nAt, nKind, body] of notes) await db.query("insert into consult_notes (consult_id, at, who, kind, body) values ($1, $2, '예전 관리자', $3, $4)", [c.id, nAt, nKind, body]);
      added += 1;
    }
    audit(req, "consult.import", null, `${KINDS[kind]} ${added}건 가져옴, ${skipped}건 건너뜀${bad.length ? `, ${bad.length}건 오류` : ""}`);
    res.json({ added, skipped, bad });
  }));

  // the calendar: confirmed bookings, and the requests still waiting for a call with the day they asked for
  api.get("/bookings", need, h(async (req, res) => {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || "") ? req.query.from : KST_DAY();
    const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || "") ? req.query.to : addDays(from, 42);
    const { rows } = await db.query(
      `select c.id, c.kind, c.status, c.name, c.phone, c.interest, c.booked_at, c.prefer_date, c.prefer_time, c.channel, u.name as assignee_name
       from consults c left join users u on u.id = c.assignee
       where (c.booked_at >= ($1::date)::timestamp at time zone 'Asia/Seoul' and c.booked_at < (($2::date) + 1)::timestamp at time zone 'Asia/Seoul' and c.status not in ('spam', 'canceled'))
          or (c.booked_at is null and c.prefer_date between $1::date and $2::date and c.status in ('new', 'contacting', 'hold'))
       order by coalesce(c.booked_at, (c.prefer_date::timestamp + interval '10 hours') at time zone 'Asia/Seoul')`,
      [from, to],
    );
    res.json({ items: rows, from, to });
  }));
}

// What is kept and for how long. Consultations are deleted only when the owner has set a 보관 기간 in 설정 (default:
// never): then spam after 30 days and the rest that many months after their last change. The records brought over from
// the old admin (grp 예전 사이트) are never deleted on their own. The counter's visits go after 25 months (no names in
// them), the 접속 기록 after two years.
export const PURGE_WHERE = "grp is distinct from '예전 사이트' and (status = 'spam' and created_at < now() - interval '30 days' or greatest(updated_at, coalesce(booked_at, updated_at)) < now() - make_interval(months => $1))";
export async function purge() {
  if (!db || !state.ready) return;
  const months = Number(await getSetting("retention_months", "0")) || 0;
  const out = [0, 0];
  if (months > 0) {
    out[0] = (await db.query("delete from consults where status = 'spam' and grp is distinct from '예전 사이트' and created_at < now() - interval '30 days'")).rowCount;
    out[1] = (await db.query("delete from consults where status <> 'spam' and grp is distinct from '예전 사이트' and greatest(updated_at, coalesce(booked_at, updated_at)) < now() - make_interval(months => $1)", [months])).rowCount;
  }
  await db.query("delete from hits where at < now() - interval '25 months'");
  await db.query("delete from visits where last_at < now() - interval '25 months'");
  await db.query("delete from audit where at < now() - interval '2 years'");
  await db.query("delete from sessions where seen_at < now() - interval '12 hours' or created_at < now() - interval '30 days'");
  if (out[0] || out[1]) await db.query("insert into audit (action, detail) values ('retention', $1)", [`스팸 ${out[0]}건, 보관 기간(${months}개월)이 지난 상담 ${out[1]}건 파기`]);
}
export { whoIs };
