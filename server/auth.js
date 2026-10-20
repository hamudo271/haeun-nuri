// Staff log-in. Each person has an account (개인정보 안전성 확보조치: 취급자별 계정, 접속 기록, 인증 실패 제한, 일정 시간
// 뒤 자동 로그아웃). The owner's account is "admin": its password is ADMIN_PASSWORD in Railway's variables, so it can
// always get back in; the owner makes the staff accounts in 설정. A log-in is a random token in an HttpOnly cookie; the
// database keeps only its hash, and drops it after 12 hours without use or 30 days in all.
import crypto from "node:crypto";
import { db, state } from "./db.js";

const OWNER_PW = process.env.ADMIN_PASSWORD || "";
const COOKIE = "fb_sess";
const IDLE = 12 * 3600 * 1000;
const MAX_AGE = 30 * 86400;
export const hasOwnerPassword = () => !!OWNER_PW;

export const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const cookies = (req) => Object.fromEntries((req.headers.cookie || "").split(/;\s*/).filter(Boolean).map((c) => {
  const i = c.indexOf("=");
  try { return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; } catch { return [c.slice(0, i), ""]; }
}));
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const same = (a, b) => { const x = Buffer.from(sha(a)); const y = Buffer.from(sha(b)); return crypto.timingSafeEqual(x, y); };

export function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  return new Promise((ok, no) => crypto.scrypt(String(pw), salt, 32, { N: 16384, r: 8, p: 1 }, (e, key) => (e ? no(e) : ok(`scrypt$${salt.toString("base64")}$${key.toString("base64")}`))));
}
export function checkPw(pw, stored) {
  const [kind, salt, key] = String(stored || "").split("$");
  if (kind !== "scrypt" || !salt || !key) return Promise.resolve(false);
  return new Promise((ok) => crypto.scrypt(String(pw), Buffer.from(salt, "base64"), 32, { N: 16384, r: 8, p: 1 }, (e, got) => {
    const want = Buffer.from(key, "base64");
    ok(!e && got.length === want.length && crypto.timingSafeEqual(got, want));
  }));
}
export function pwProblem(pw, login = "") {
  const s = String(pw || "");
  if (s.length < 8) return "비밀번호는 8자 이상으로 정해 주세요.";
  if (s.length > 128) return "비밀번호가 너무 깁니다.";
  const kinds = [/[a-zA-Z]/, /\d/, /[^a-zA-Z\d]/].filter((re) => re.test(s)).length;
  if (kinds < 2) return "영문, 숫자, 특수문자 중 두 가지 이상을 섞어 주세요.";
  if (login && s.toLowerCase().includes(String(login).toLowerCase())) return "아이디가 들어간 비밀번호는 쓸 수 없습니다.";
  return "";
}
// a log-in stays good only while the password it was made with is still the password
const tagOf = (u) => (u.role === "owner" && !u.pw ? sha(`owner|${OWNER_PW}`) : sha(`pw|${u.pw}`)).slice(0, 16);

export async function ensureOwner() {
  await db.query("insert into users (login, name, role) values ('admin', '대표 관리자', 'owner') on conflict (login) do nothing");
}

export async function whoIs(req) {
  if (req._user !== undefined) return req._user;
  req._user = null;
  if (!db || !state.ready) return null;
  const token = cookies(req)[COOKIE];
  if (!token || token.length > 100) return null;
  const sid = sha(token);
  const { rows } = await db.query("select s.pwtag, s.created_at as s_at, s.seen_at, u.id, u.login, u.name, u.role, u.pw, u.active from sessions s join users u on u.id = s.user_id where s.id = $1", [sid]);
  const r = rows[0];
  if (!r) return null;
  const now = Date.now();
  if (!r.active || r.pwtag !== tagOf(r) || now - new Date(r.seen_at) > IDLE || now - new Date(r.s_at) > MAX_AGE * 1000 || (r.role === "owner" && !r.pw && !OWNER_PW)) {
    await db.query("delete from sessions where id = $1", [sid]);
    return null;
  }
  if (now - new Date(r.seen_at) > 60000) db.query("update sessions set seen_at = now() where id = $1", [sid]).catch(() => {});
  req._user = { id: r.id, login: r.login, name: r.name, role: r.role, sid };
  return req._user;
}

export function audit(req, action, target = null, detail = null) {
  if (!db || !state.ready) return;
  const u = req && req._user;
  db.query("insert into audit (user_id, who, ip, action, target, detail) values ($1, $2, $3, $4, $5, $6)", [
    u ? u.id : null, u ? `${u.name} (${u.login})` : null, (req && req.ip) || null, action, target, detail == null ? null : String(detail).slice(0, 500),
  ]).catch((e) => console.error("audit:", e.message));
}

export const need = h(async (req, res, next) => {
  if (!db || !state.ready) return res.status(503).json({ error: "데이터베이스가 연결되지 않았습니다." });
  if (!(await whoIs(req))) return res.status(401).json({ error: "다시 로그인해 주세요." });
  next();
});
export const ownerOnly = h(async (req, res, next) => {
  const u = await whoIs(req);
  if (!u) return res.status(401).json({ error: "다시 로그인해 주세요." });
  if (u.role !== "owner") return res.status(403).json({ error: "대표 관리자만 할 수 있습니다." });
  next();
});

const cookie = (req, token, age) => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${req.secure ? "; Secure" : ""}`;

// failed log-ins: an address is held after 10 in 15 minutes, an account after 5
const fails = new Map();
const failKey = (k) => { const f = fails.get(k); return f && f.until > Date.now() ? f : null; };
const addFail = (k) => { const f = failKey(k); fails.set(k, { n: (f ? f.n : 0) + 1, until: Date.now() + 15 * 60 * 1000 }); };
setInterval(() => { const now = Date.now(); for (const [k, f] of fails) if (f.until < now) fails.delete(k); }, 10 * 60 * 1000).unref();

const userOut = (u) => ({ id: u.id, login: u.login, name: u.name, role: u.role });
const LOGIN_RE = /^[a-z0-9][a-z0-9._-]{2,19}$/;

export function authRoutes(api) {
  api.get("/me", h(async (req, res) => {
    const u = await whoIs(req);
    res.json({ user: u ? userOut(u) : null, admin: !!u, db: !!(db && state.ready), password: !!OWNER_PW, ready: !!(db && state.ready) });
  }));

  api.post("/login", h(async (req, res) => {
    if (!db || !state.ready) return res.status(503).json({ error: "데이터베이스가 연결되지 않았습니다." });
    const login = String(req.body?.login || "").trim().toLowerCase().slice(0, 40);
    const pw = String(req.body?.password || "").slice(0, 200);
    if (!login || !pw) return res.status(400).json({ error: "아이디와 비밀번호를 넣어 주세요." });
    const ipKey = `ip:${req.ip}`;
    const byIp = failKey(ipKey);
    const byLogin = failKey(`id:${login}`);
    if ((byIp && byIp.n >= 10) || (byLogin && byLogin.n >= 5)) return res.status(429).json({ error: "여러 번 틀려서 15분 동안 로그인할 수 없습니다." });
    const { rows } = await db.query("select * from users where login = $1", [login]);
    const u = rows[0];
    let ok = false;
    if (u && u.active) {
      if (u.role === "owner" && !u.pw) ok = !!OWNER_PW && same(pw, OWNER_PW);
      else ok = await checkPw(pw, u.pw);
    } else await hashPw(pw); // the same time whether or not the account exists
    if (!ok) {
      addFail(ipKey); addFail(`id:${login}`);
      audit(req, "login.fail", login);
      if (u && u.role === "owner" && !OWNER_PW) return res.status(503).json({ error: "대표 관리자 비밀번호가 아직 정해지지 않았습니다. Railway 변수 ADMIN_PASSWORD를 확인해 주세요." });
      const left = 5 - (failKey(`id:${login}`)?.n || 0);
      return res.status(401).json({ error: left > 0 && left < 3 ? `아이디나 비밀번호가 맞지 않습니다. (${left}번 더 틀리면 15분 동안 잠깁니다)` : "아이디나 비밀번호가 맞지 않습니다." });
    }
    fails.delete(`id:${login}`);
    const token = crypto.randomBytes(32).toString("base64url");
    await db.query("insert into sessions (id, user_id, pwtag, ip, ua) values ($1, $2, $3, $4, $5)", [sha(token), u.id, tagOf(u), req.ip || null, String(req.headers["user-agent"] || "").slice(0, 300)]);
    await db.query("update users set last_login = now() where id = $1", [u.id]);
    await db.query("delete from sessions where user_id = $1 and (seen_at < now() - interval '12 hours' or created_at < now() - interval '30 days')", [u.id]);
    req._user = { ...userOut(u), sid: sha(token) };
    audit(req, "login");
    res.set("Set-Cookie", cookie(req, token, MAX_AGE));
    res.json({ user: userOut(u) });
  }));

  api.post("/logout", h(async (req, res) => {
    const u = await whoIs(req);
    if (u) { await db.query("delete from sessions where id = $1", [u.sid]); audit(req, "logout"); }
    res.set("Set-Cookie", cookie(req, "", 0));
    res.json({ user: null });
  }));

  // my own account: the name shown on notes, my password, my other log-ins
  api.patch("/me", need, h(async (req, res) => {
    const name = String(req.body?.name || "").trim().slice(0, 20);
    if (!name) return res.status(400).json({ error: "이름을 적어 주세요." });
    await db.query("update users set name = $1 where id = $2", [name, req._user.id]);
    audit(req, "me.name", null, name);
    res.json({ user: { ...userOut(req._user), name } });
  }));
  api.post("/me/password", need, h(async (req, res) => {
    const { rows } = await db.query("select * from users where id = $1", [req._user.id]);
    const u = rows[0];
    if (u.role === "owner" && !u.pw) return res.status(400).json({ error: "대표 관리자 비밀번호는 Railway 변수 ADMIN_PASSWORD에서 바꿉니다." });
    if (!(await checkPw(String(req.body?.current || ""), u.pw))) return res.status(400).json({ error: "지금 비밀번호가 맞지 않습니다." });
    const next = String(req.body?.next || "");
    const bad = pwProblem(next, u.login);
    if (bad) return res.status(400).json({ error: bad });
    const pw = await hashPw(next);
    await db.query("update users set pw = $1 where id = $2", [pw, u.id]);
    await db.query("delete from sessions where user_id = $1 and id <> $2", [u.id, req._user.sid]);
    await db.query("update sessions set pwtag = $1 where id = $2", [tagOf({ ...u, pw }), req._user.sid]);
    audit(req, "me.password");
    res.json({ ok: true });
  }));
  api.post("/me/logout-others", need, h(async (req, res) => {
    const { rowCount } = await db.query("delete from sessions where user_id = $1 and id <> $2", [req._user.id, req._user.sid]);
    audit(req, "me.logout-others", null, rowCount);
    res.json({ ok: true, n: rowCount });
  }));

  // the owner's list of staff accounts
  api.get("/users", ownerOnly, h(async (req, res) => {
    const { rows } = await db.query(`select u.id, u.login, u.name, u.role, u.active, u.created_at, u.last_login,
      (select count(*)::int from sessions s where s.user_id = u.id and s.seen_at > now() - interval '12 hours') as online
      from users u order by (u.role = 'owner') desc, u.active desc, u.id`);
    res.json({ users: rows });
  }));
  api.get("/users/names", need, h(async (req, res) => {
    const { rows } = await db.query("select id, name, role, active from users order by (role = 'owner') desc, id");
    res.json({ users: rows });
  }));
  api.post("/users", ownerOnly, h(async (req, res) => {
    const login = String(req.body?.login || "").trim().toLowerCase();
    const name = String(req.body?.name || "").trim().slice(0, 20);
    const pw = String(req.body?.password || "");
    if (!LOGIN_RE.test(login)) return res.status(400).json({ error: "아이디는 영문 소문자와 숫자로 3~20자입니다." });
    if (login === "admin") return res.status(400).json({ error: "admin은 대표 관리자 아이디입니다." });
    if (!name) return res.status(400).json({ error: "이름을 적어 주세요." });
    const bad = pwProblem(pw, login);
    if (bad) return res.status(400).json({ error: bad });
    try {
      const { rows } = await db.query("insert into users (login, name, role, pw) values ($1, $2, 'staff', $3) returning id", [login, name, await hashPw(pw)]);
      audit(req, "user.create", `user:${rows[0].id}`, `${name} (${login})`);
      res.json({ id: rows[0].id });
    } catch (e) {
      if (e.code === "23505") return res.status(400).json({ error: "이미 있는 아이디입니다." });
      throw e;
    }
  }));
  api.patch("/users/:id", ownerOnly, h(async (req, res) => {
    const id = Number(req.params.id) || 0;
    const { rows } = await db.query("select * from users where id = $1", [id]);
    const u = rows[0];
    if (!u) return res.status(404).json({ error: "없는 계정입니다." });
    const b = req.body || {};
    if (b.name !== undefined) {
      const name = String(b.name).trim().slice(0, 20);
      if (!name) return res.status(400).json({ error: "이름을 적어 주세요." });
      await db.query("update users set name = $1 where id = $2", [name, id]);
    }
    if (b.active !== undefined) {
      if (u.role === "owner") return res.status(400).json({ error: "대표 관리자 계정은 멈출 수 없습니다." });
      await db.query("update users set active = $1 where id = $2", [!!b.active, id]);
      if (!b.active) await db.query("delete from sessions where user_id = $1", [id]);
    }
    if (b.password !== undefined) {
      if (u.role === "owner") return res.status(400).json({ error: "대표 관리자 비밀번호는 Railway 변수 ADMIN_PASSWORD에서 바꿉니다." });
      const bad = pwProblem(b.password, u.login);
      if (bad) return res.status(400).json({ error: bad });
      await db.query("update users set pw = $1 where id = $2", [await hashPw(b.password), id]);
      await db.query("delete from sessions where user_id = $1", [id]);
    }
    audit(req, "user.update", `user:${id}`, Object.keys(b).filter((k) => k !== "password").concat(b.password !== undefined ? ["password"] : []).join(","));
    res.json({ ok: true });
  }));
  api.delete("/users/:id", ownerOnly, h(async (req, res) => {
    const id = Number(req.params.id) || 0;
    const { rows } = await db.query("delete from users where id = $1 and role <> 'owner' returning name, login", [id]);
    if (!rows[0]) return res.status(404).json({ error: "지울 수 없는 계정입니다." });
    audit(req, "user.delete", `user:${id}`, `${rows[0].name} (${rows[0].login})`);
    res.json({ ok: true });
  }));

  // 접속 기록: who logged in, opened, changed, downloaded or deleted what, and from where
  api.get("/audit", ownerOnly, h(async (req, res) => {
    const size = 50;
    const page = Math.max(1, Number(req.query.page) || 1);
    const args = [];
    const where = [];
    if (req.query.user) { args.push(Number(req.query.user) || 0); where.push(`user_id = $${args.length}`); }
    if (req.query.action) { args.push(`${String(req.query.action).replace(/[%_]/g, "")}%`); where.push(`action like $${args.length}`); }
    const w = where.length ? `where ${where.join(" and ")}` : "";
    const total = (await db.query(`select count(*)::int as n from audit ${w}`, args)).rows[0].n;
    args.push(size, (page - 1) * size);
    const { rows } = await db.query(`select id, at, who, ip, action, target, detail from audit ${w} order by at desc, id desc limit $${args.length - 1} offset $${args.length}`, args);
    res.json({ items: rows, total, page, size });
  }));
}
