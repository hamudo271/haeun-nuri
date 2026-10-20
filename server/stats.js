// The clinic's own visit counter and its reports. Each page sends one small beacon (js/main.js): a random visitor
// number and visit number kept in the browser, the page, and on a visit's first page where it came from. No name, no
// address and no cookie; staff who are logged in and the addresses set in 설정 are not counted. A visit ends after 30
// minutes without a page. Days are Korean days (Asia/Seoul).
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { db, state, getSetting } from "./db.js";
import { h, need, whoIs, cookies } from "./auth.js";
import { classify, pickTags, parseUA, cleanPath } from "./attrib.js";
import { ownHosts } from "./consult.js";
import { postUrl } from "./render.js";

const HIT_KINDS = new Set(["tel", "kakao", "map", "book", "sns", "out", "form"]);
const ID = /^[a-z0-9]{8,40}$/i;
const TREATMENT = "^/sub/(treatment|clinic)/"; // 치료·진료과목 페이지
const COUNSEL = "^/sub/about/page0[12]/"; // 진료시간·오시는 길 (해운누리에는 상담 신청서가 없다)


// page titles for the reports, read once from the pages Next.js built (out/sub/about/page01/index.html → "/sub/about/page01/")
const TITLES = new Map([["/", "메인"]]);
export function loadTitles(dist) {
  const walk = (dir, rel) => {
    let names = [];
    try { names = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const d of names) {
      if (d.isDirectory()) { if (!/^(_next|img|fonts|files|js|admin)$/.test(d.name)) walk(path.join(dir, d.name), `${rel}${d.name}/`); continue; }
      if (d.name !== "index.html" || rel === "/") continue;
      const m = fs.readFileSync(path.join(dir, d.name), "utf8").match(/<title>([^<]*)<\/title>/);
      if (m) TITLES.set(rel, m[1].split(" | ")[0].trim());
    }
  };
  walk(dist, "/");
}
const postTitles = new Map();
export const titleOf = (p) => TITLES.get(p) || postTitles.get(p) || (/^\/sub\/(board\/page01|media\/page02)\/\d+\/$/.test(p) ? "게시판 글" : p);
async function refreshPostTitles() {
  if (!db || !state.ready) return;
  const { rows } = await db.query("select id, cat, title from posts");
  postTitles.clear();
  rows.forEach((r) => postTitles.set(postUrl(r), r.title));
}

const beats = new Map(); // address → hits in the current minute
setInterval(() => beats.clear(), 60000).unref();

export function publicRoutes(app) {
  app.post("/api/v", express.text({ type: () => true, limit: "4kb" }), h(async (req, res) => {
    res.status(204).set("Cache-Control", "no-store").end();
    if (!db || !state.ready) return;
    const n = (beats.get(req.ip) || 0) + 1;
    beats.set(req.ip, n);
    if (n > 120) return;
    let b;
    try { b = JSON.parse(typeof req.body === "string" ? req.body : "{}"); } catch { return; }
    if (!b || !ID.test(b.v || "") || !ID.test(b.s || "")) return;
    const ua = String(req.headers["user-agent"] || "");
    const u = parseUA(ua);
    if (u.bot) return;
    if (cookies(req).fb_sess && (await whoIs(req))) return; // staff looking at their own site
    const skip = String(await getSetting("exclude_ips", "")).split(/[\s,]+/).filter(Boolean);
    if (skip.includes(req.ip)) return;
    const p = cleanPath(b.p);
    const kind = HIT_KINDS.has(b.k) ? b.k : "pv";
    if (kind === "pv") {
      const c = classify({ ref: b.r, tags: pickTags(b.q), ua, own: ownHosts(req) });
      // the whole address it came from (유입URL), when that is another site: without its #part, at most 300 letters
      let refUrl = null;
      if (c.refHost) { try { const r = new URL(b.r); r.hash = ""; refUrl = r.toString().slice(0, 300); } catch { refUrl = null; } }
      await db.query(
        `insert into visits (id, visitor, pages, landing, referrer, ref_url, grp, channel, source, medium, campaign, keyword, device, os, browser, is_new)
         values ($1, $2, 1, $3, $4, $14, $5, $6, $7, $8, $9, $10, $11, $12, $13, not exists (select 1 from visits v where v.visitor = $2))
         on conflict (id) do update set last_at = now(), pages = visits.pages + 1`,
        [b.s, b.v, p, c.refHost, c.grp, c.channel, c.source, c.medium, c.campaign, c.keyword, u.device, u.os, u.browser, refUrl],
      );
    } else {
      await db.query("update visits set last_at = now() where id = $1", [b.s]);
    }
    await db.query("insert into hits (visit, kind, path, target) values ($1, $2, $3, $4)", [b.s, kind, p, kind === "pv" ? null : String(b.t || "").slice(0, 200) || null]);
  }));
}

/* ---------- reports ---------- */
// Consultations brought over from the old admin (grp 예전 사이트, set only by 예전 상담 가져오기) are left out of every count here: these reports
// measure this site's own visits and what came of them. They stay in 상담 관리 (유입: 예전 사이트).
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1;
// a Korean day's start as an instant
const at = (ymd) => new Date(Date.parse(`${ymd}T00:00:00+09:00`));

async function summary(from, to) {
  const [v, c, e] = await Promise.all([
    db.query(`select count(*)::int as sessions, count(distinct visitor)::int as visitors, coalesce(sum(pages), 0)::int as pageviews,
      count(*) filter (where pages <= 1)::int as bounces, count(*) filter (where is_new)::int as new_sessions,
      coalesce(round(avg(extract(epoch from (last_at - started_at))) filter (where pages > 1)), 0)::int as avg_secs
      from visits where started_at >= $1 and started_at < $2`, [from, to]),
    db.query(`select count(*)::int as consults, count(*) filter (where kind <> 'manual')::int as web,
      count(*) filter (where booked_at is not null or status in ('booked', 'visited', 'surgery', 'noshow'))::int as booked,
      count(*) filter (where status in ('visited', 'surgery'))::int as visited, count(*) filter (where status = 'surgery')::int as surgery,
      coalesce(sum(amount) filter (where status = 'surgery'), 0)::bigint as revenue,
      round((percentile_cont(0.5) within group (order by extract(epoch from (contacted_at - created_at)))) :: numeric)::int as response_secs
      from consults where status <> 'spam' and grp is distinct from '예전 사이트' and created_at >= $1 and created_at < $2`, [from, to]),
    db.query("select kind, count(*)::int as n from hits where at >= $1 and at < $2 and kind <> 'pv' group by kind", [from, to]),
  ]);
  return { ...v.rows[0], ...c.rows[0], revenue: Number(c.rows[0].revenue), events: Object.fromEntries(e.rows.map((r) => [r.kind, r.n])) };
}

async function series(fromDay, toDay, from, to) {
  if (fromDay === toDay) {
    const { rows } = await db.query(
      `with hrs as (select generate_series(0, 23) as hour),
       v as (select extract(hour from started_at at time zone 'Asia/Seoul')::int as hour, count(distinct visitor)::int as visitors, count(*)::int as sessions, sum(pages)::int as pageviews from visits where started_at >= $1 and started_at < $2 group by 1),
       c as (select extract(hour from created_at at time zone 'Asia/Seoul')::int as hour, count(*)::int as consults from consults where status <> 'spam' and grp is distinct from '예전 사이트' and created_at >= $1 and created_at < $2 group by 1)
       select hrs.hour as key, coalesce(v.visitors, 0) as visitors, coalesce(v.sessions, 0) as sessions, coalesce(v.pageviews, 0) as pageviews, coalesce(c.consults, 0) as consults
       from hrs left join v using (hour) left join c using (hour) order by hrs.hour`, [from, to]);
    return { unit: "hour", rows };
  }
  const { rows } = await db.query(
    `with d as (select generate_series($3::date, $4::date, interval '1 day')::date as day),
     v as (select (started_at at time zone 'Asia/Seoul')::date as day, count(distinct visitor)::int as visitors, count(*)::int as sessions, sum(pages)::int as pageviews from visits where started_at >= $1 and started_at < $2 group by 1),
     c as (select (created_at at time zone 'Asia/Seoul')::date as day, count(*)::int as consults from consults where status <> 'spam' and grp is distinct from '예전 사이트' and created_at >= $1 and created_at < $2 group by 1)
     select to_char(d.day, 'YYYY-MM-DD') as key, coalesce(v.visitors, 0) as visitors, coalesce(v.sessions, 0) as sessions, coalesce(v.pageviews, 0) as pageviews, coalesce(c.consults, 0) as consults
     from d left join v using (day) left join c using (day) order by d.day`, [from, to, fromDay, toDay]);
  return { unit: "day", rows };
}

export function adminRoutes(api) {
  api.get("/stats", need, h(async (req, res) => {
    const today = kstToday();
    const toDay = DAY.test(req.query.to || "") ? req.query.to : today;
    const fromDay = DAY.test(req.query.from || "") && req.query.from <= toDay ? req.query.from : addDays(toDay, -29);
    const len = Math.min(400, daysBetween(fromDay, toDay));
    const from = at(fromDay);
    const to = at(addDays(toDay, 1));
    const prevFrom = at(addDays(fromDay, -len));
    const range = [from, to];
    const visitsRange = "started_at >= $1 and started_at < $2";
    await refreshPostTitles();
    const [now, prev, ser, channels, keywords, campaigns, landings, pages, devices, browsers, oses, heat, heatC, funnel, clicks, live, livePages, interests, refUrls, kinds, months] = await Promise.all([
      summary(from, to),
      summary(prevFrom, from),
      series(fromDay, toDay, from, to),
      db.query(`with s as (select coalesce(channel, '직접 방문') as channel, coalesce(grp, '직접 방문') as grp, count(*)::int as sessions, count(distinct visitor)::int as visitors,
          count(*) filter (where pages <= 1)::int as bounces from visits where ${visitsRange} group by 1, 2),
        c as (select coalesce(channel, '직접 방문') as channel, coalesce(grp, '직접 방문') as grp, count(*)::int as consults,
          count(*) filter (where booked_at is not null or status in ('booked', 'visited', 'surgery', 'noshow'))::int as booked,
          count(*) filter (where status in ('visited', 'surgery'))::int as visited, count(*) filter (where status = 'surgery')::int as surgery,
          coalesce(sum(amount) filter (where status = 'surgery'), 0)::bigint as revenue
          from consults where status <> 'spam' and grp is distinct from '예전 사이트' and created_at >= $1 and created_at < $2 group by 1, 2)
        select coalesce(s.channel, c.channel) as channel, coalesce(s.grp, c.grp) as grp, coalesce(s.sessions, 0) as sessions, coalesce(s.visitors, 0) as visitors,
          coalesce(s.bounces, 0) as bounces, coalesce(c.consults, 0) as consults, coalesce(c.booked, 0) as booked, coalesce(c.visited, 0) as visited,
          coalesce(c.surgery, 0) as surgery, coalesce(c.revenue, 0)::bigint as revenue
        from s full join c on s.channel = c.channel and s.grp = c.grp order by 3 desc, 6 desc`, range),
      db.query(`select keyword, count(*)::int as sessions, count(consult_id)::int as consults, max(channel) as channel from visits where keyword is not null and ${visitsRange} group by keyword order by 2 desc, 3 desc limit 30`, range),
      db.query(`select source, medium, campaign, count(*)::int as sessions, count(consult_id)::int as consults from visits where (source is not null or campaign is not null) and ${visitsRange} group by 1, 2, 3 order by 4 desc limit 30`, range),
      db.query(`select landing as path, count(*)::int as sessions, count(*) filter (where pages <= 1)::int as bounces, count(consult_id)::int as consults from visits where ${visitsRange} group by 1 order by 2 desc limit 25`, range),
      db.query("select path, count(*)::int as views, count(distinct visit)::int as sessions from hits where kind = 'pv' and at >= $1 and at < $2 group by 1 order by 2 desc limit 40", range),
      db.query(`select coalesce(device, '기타') as label, count(*)::int as n from visits where ${visitsRange} group by 1 order by 2 desc`, range),
      db.query(`select coalesce(browser, '기타') as label, count(*)::int as n from visits where ${visitsRange} group by 1 order by 2 desc limit 12`, range),
      db.query(`select coalesce(os, '기타') as label, count(*)::int as n from visits where ${visitsRange} group by 1 order by 2 desc`, range),
      db.query(`select extract(isodow from started_at at time zone 'Asia/Seoul')::int as dow, extract(hour from started_at at time zone 'Asia/Seoul')::int as hour, count(*)::int as n from visits where ${visitsRange} group by 1, 2`, range),
      db.query("select extract(isodow from created_at at time zone 'Asia/Seoul')::int as dow, extract(hour from created_at at time zone 'Asia/Seoul')::int as hour, count(*)::int as n from consults where status <> 'spam' and grp is distinct from '예전 사이트' and created_at >= $1 and created_at < $2 group by 1, 2", range),
      db.query(`select count(distinct visit) filter (where kind = 'pv' and path ~ '${TREATMENT}')::int as treatment,
          count(distinct visit) filter (where kind = 'pv' and path ~ '${COUNSEL}')::int as counsel,
          count(distinct visit) filter (where kind in ('tel', 'kakao', 'book'))::int as contact,
          count(distinct visit) filter (where kind = 'form')::int as form
        from hits where at >= $1 and at < $2`, range),
      db.query("select kind, path, count(*)::int as n from hits where kind in ('tel', 'kakao', 'map', 'book', 'sns') and at >= $1 and at < $2 group by 1, 2 order by 3 desc limit 30", range),
      db.query("select count(distinct visitor)::int as n from visits where last_at > now() - interval '5 minutes'"),
      db.query(`select path, count(*)::int as n from (select distinct on (h.visit) h.path from hits h where h.kind = 'pv' and h.at > now() - interval '5 minutes' order by h.visit, h.at desc) x group by 1 order by 2 desc limit 8`),
      db.query("select coalesce(nullif(split_part(interest, ',', 1), ''), '미선택') as label, count(*)::int as n from consults where status <> 'spam' and grp is distinct from '예전 사이트' and created_at >= $1 and created_at < $2 group by 1 order by 2 desc limit 12", range),
      db.query(`select ref_url, max(channel) as channel, count(*)::int as sessions, count(consult_id)::int as consults from visits where ref_url is not null and ${visitsRange} group by 1 order by 3 desc, 4 desc limit 40`, range),
      db.query(`select kind, count(*)::int as n, count(*) filter (where booked_at is not null or status in ('booked', 'visited', 'surgery', 'noshow'))::int as booked,
          count(*) filter (where status in ('visited', 'surgery'))::int as visited, count(*) filter (where status = 'surgery')::int as surgery,
          count(*) filter (where status = 'new')::int as waiting
        from consults where status <> 'spam' and grp is distinct from '예전 사이트' and created_at >= $1 and created_at < $2 group by 1 order by 2 desc`, range),
      db.query(`select to_char(date_trunc('month', created_at at time zone 'Asia/Seoul'), 'YYYY-MM') as month, kind, count(*)::int as n
        from consults where status <> 'spam' and grp is distinct from '예전 사이트' and created_at >= (date_trunc('month', now() at time zone 'Asia/Seoul') - interval '11 months') at time zone 'Asia/Seoul'
        group by 1, 2 order by 1`),
    ]);
    const withTitle = (rows) => rows.map((r) => ({ ...r, title: titleOf(r.path) }));
    res.json({
      from: fromDay, to: toDay, days: len, prevFrom: addDays(fromDay, -len), prevTo: addDays(fromDay, -1),
      summary: now, previous: prev, series: ser,
      channels: channels.rows.map((r) => ({ ...r, revenue: Number(r.revenue) })),
      keywords: keywords.rows, campaigns: campaigns.rows, landings: withTitle(landings.rows), pages: withTitle(pages.rows),
      devices: devices.rows, browsers: browsers.rows, oses: oses.rows, heat: heat.rows, heatConsults: heatC.rows,
      funnel: funnel.rows[0], clicks: withTitle(clicks.rows), interests: interests.rows,
      refUrls: refUrls.rows, kinds: kinds.rows, months: months.rows,
      live: { now: live.rows[0].n, pages: withTitle(livePages.rows) },
    });
  }));

  api.get("/stats/live", need, h(async (req, res) => {
    await refreshPostTitles();
    const [live, pages] = await Promise.all([
      db.query("select count(distinct visitor)::int as n from visits where last_at > now() - interval '5 minutes'"),
      db.query("select path, count(*)::int as n from (select distinct on (h.visit) h.path from hits h where h.kind = 'pv' and h.at > now() - interval '5 minutes' order by h.visit, h.at desc) x group by 1 order by 2 desc limit 8"),
    ]);
    res.json({ now: live.rows[0].n, pages: pages.rows.map((r) => ({ ...r, title: titleOf(r.path) })) });
  }));

  // the first screen: what needs a call now, today's bookings, and the last two weeks at a glance
  api.get("/dashboard", need, h(async (req, res) => {
    const today = kstToday();
    const t0 = at(today);
    const t1 = at(addDays(today, 1));
    const t2 = at(addDays(today, 2));
    const m0 = at(`${today.slice(0, 8)}01`);
    await refreshPostTitles();
    const [todayV, todayC, waiting, contacting, bookings, month, ser, chan, live, resp, smsWait] = await Promise.all([
      db.query("select count(distinct visitor)::int as visitors, count(*)::int as sessions from visits where started_at >= $1 and started_at < $2", [t0, t1]),
      db.query("select count(*)::int as n from consults where status <> 'spam' and grp is distinct from '예전 사이트' and created_at >= $1 and created_at < $2", [t0, t1]),
      db.query(`select c.id, c.kind, c.name, c.phone, c.interest, left(c.message, 70) as message, c.prefer_date, c.prefer_time, c.channel, c.created_at, c.read_at,
        case when c.phone = '' then 0 else (select count(*)::int from consults o where o.phone = c.phone and o.id <> c.id and o.status <> 'spam') end as repeat
        from consults c where c.status = 'new' order by c.created_at asc limit 12`),
      db.query("select count(*)::int as n from consults where status = 'contacting'"),
      db.query(`select c.id, c.kind, c.status, c.name, c.phone, c.interest, c.booked_at, u.name as assignee_name from consults c left join users u on u.id = c.assignee
        where c.booked_at >= $1 and c.booked_at < $2 and c.status not in ('spam', 'canceled') order by c.booked_at`, [t0, t2]),
      db.query(`select count(*)::int as consults, count(*) filter (where booked_at is not null or status in ('booked', 'visited', 'surgery', 'noshow'))::int as booked,
        count(*) filter (where status in ('visited', 'surgery'))::int as visited, count(*) filter (where status = 'surgery')::int as surgery
        from consults where status <> 'spam' and grp is distinct from '예전 사이트' and created_at >= $1`, [m0]),
      series(addDays(today, -13), today, at(addDays(today, -13)), t1),
      db.query(`with s as (select coalesce(channel, '직접 방문') as channel, count(*)::int as sessions from visits where started_at >= $1 group by 1),
        c as (select coalesce(channel, '직접 방문') as channel, count(*)::int as consults from consults where status <> 'spam' and grp is distinct from '예전 사이트' and created_at >= $1 group by 1)
        select channel, coalesce(s.sessions, 0) as sessions, coalesce(c.consults, 0) as consults from s full join c using (channel) order by 2 desc, 3 desc limit 6`, [at(addDays(today, -29))]),
      db.query("select count(distinct visitor)::int as n from visits where last_at > now() - interval '5 minutes'"),
      db.query("select round((percentile_cont(0.5) within group (order by extract(epoch from (contacted_at - created_at))))::numeric)::int as secs from consults where contacted_at is not null and grp is distinct from '예전 사이트' and created_at >= $1", [at(addDays(today, -29))]),
      db.query("select count(*)::int as n from consults where kind = 'sms' and replied_at is null and status not in ('closed', 'canceled', 'spam')"),
    ]);
    res.json({
      today, visitors: todayV.rows[0].visitors, sessions: todayV.rows[0].sessions, consultsToday: todayC.rows[0].n,
      waiting: waiting.rows, contacting: contacting.rows[0].n, bookings: bookings.rows, month: month.rows[0], series: ser,
      channels: chan.rows, live: live.rows[0].n, responseSecs: resp.rows[0].secs, smsWait: smsWait.rows[0].n,
    });
  }));
}
