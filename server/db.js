// The database: one Postgres (DATABASE_URL). Tables for the board (posts, media), the staff (users, sessions, audit),
// the consultations (consults, consult_notes, consult_files) and the visit counter (visits, hits). Every table is made
// with "if not exists" and every later column with "add column if not exists", so a start on an older database only adds.
import pg from "pg";

pg.types.setTypeParser(1082, (v) => v); // a date stays "2026-10-05", whatever the server's time zone

const URL_ = process.env.DATABASE_URL || "";
export const db = URL_
  ? new pg.Pool({ connectionString: URL_, max: Number(process.env.PG_POOL_MAX) || 5, ssl: /\.railway\.internal|localhost|127\.0\.0\.1/.test(URL_) ? false : { rejectUnauthorized: false } })
  : null;
export const state = { ready: false };

const SCHEMA = `
create table if not exists settings (key text primary key, value text not null);

create table if not exists posts (
  id serial primary key,
  cat text not null,
  title text not null,
  body text not null default '',
  youtube text,
  ba_proc text,
  ba_after text,
  ba_parts text[] not null default '{}',
  consent boolean not null default false,
  cover text,
  seed_key text unique,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists media (
  id serial primary key,
  post_id integer references posts(id) on delete cascade,
  ord integer not null default 0,
  width integer not null,
  height integer not null,
  data bytea not null,
  thumb bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists media_post on media(post_id, ord);
create index if not exists posts_pub on posts(published, created_at desc);

create table if not exists users (
  id serial primary key,
  login text not null unique,
  name text not null,
  role text not null default 'staff',
  pw text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login timestamptz
);
create table if not exists sessions (
  id text primary key,
  user_id integer not null references users(id) on delete cascade,
  pwtag text not null default '',
  created_at timestamptz not null default now(),
  seen_at timestamptz not null default now(),
  ip text,
  ua text
);
create index if not exists sessions_user on sessions(user_id);
create table if not exists audit (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id integer,
  who text,
  ip text,
  action text not null,
  target text,
  detail text
);
create index if not exists audit_at on audit(at desc);

create table if not exists consults (
  id serial primary key,
  kind text not null,
  status text not null default 'new',
  name text not null,
  phone text not null,
  interest text,
  message text not null default '',
  prefer_date date,
  prefer_time text,
  age text,
  gender text,
  booked_at timestamptz,
  amount integer,
  assignee integer references users(id) on delete set null,
  grp text,
  channel text,
  source text,
  medium text,
  campaign text,
  keyword text,
  first_channel text,
  first_at timestamptz,
  landing text,
  referrer text,
  page text,
  device text,
  browser text,
  visitor text,
  visit text,
  ip text,
  agree boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  read_at timestamptz,
  contacted_at timestamptz
);
create index if not exists consults_created on consults(created_at desc);
create index if not exists consults_status on consults(status, created_at desc);
create index if not exists consults_phone on consults(phone);
create index if not exists consults_booked on consults(booked_at);
create table if not exists consult_notes (
  id serial primary key,
  consult_id integer not null references consults(id) on delete cascade,
  at timestamptz not null default now(),
  user_id integer,
  who text,
  kind text not null default 'note',
  body text not null
);
create index if not exists consult_notes_c on consult_notes(consult_id, at);
create table if not exists consult_files (
  id serial primary key,
  consult_id integer not null references consults(id) on delete cascade,
  ord integer not null default 0,
  width integer not null,
  height integer not null,
  data bytea not null,
  thumb bytea not null
);
create index if not exists consult_files_c on consult_files(consult_id, ord);

create table if not exists visits (
  id text primary key,
  visitor text not null,
  started_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  pages integer not null default 0,
  landing text,
  referrer text,
  grp text,
  channel text,
  source text,
  medium text,
  campaign text,
  keyword text,
  device text,
  os text,
  browser text,
  is_new boolean not null default true,
  consult_id integer
);
create index if not exists visits_started on visits(started_at);
create index if not exists visits_visitor on visits(visitor, started_at);
create table if not exists hits (
  id bigserial primary key,
  at timestamptz not null default now(),
  visit text not null,
  kind text not null,
  path text,
  target text
);
create index if not exists hits_at on hits(at);
create index if not exists hits_visit on hits(visit, at);

alter table consults add column if not exists topic text;
-- 문자 상담: answered or still waiting, who checked it, and whether the visitor's phone opened its SMS app afterwards
alter table consults add column if not exists replied_at timestamptz;
alter table consults add column if not exists replied_by text;
alter table consults add column if not exists sms_opened_at timestamptz;
alter table consults add column if not exists client_key text;
-- 예전 상담 가져오기: one key per old record (the old board's 글ID, or a hash of the row), so a file sent twice adds nothing
alter table consults add column if not exists import_key text;
create unique index if not exists consults_import_key on consults(import_key) where import_key is not null;
-- 2026-10-01: nothing is deleted on its own unless the owner sets a 보관 기간 ("디비는 소중해서 함부로 지우면 안 된다").
-- Once, whatever was set before becomes "자동으로 지우지 않음"; after that the owner's choice in 설정 stands.
update settings set value = '0' where key = 'retention_months' and not exists (select 1 from settings where key = 'retention_policy_v2');
insert into settings (key, value) values ('retention_months', '0') on conflict (key) do nothing;
insert into settings (key, value) values ('retention_policy_v2', '2026-10-01') on conflict (key) do nothing;
alter table visits add column if not exists ref_url text;
create table if not exists popups (
  id serial primary key,
  title text not null default '',
  link text,
  image bytea,
  image_path text,
  width integer,
  height integer,
  starts_on date,
  ends_on date,
  ord integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists prices (
  id serial primary key,
  cat text not null default '',
  item text not null,
  price_min integer,
  price_max integer,
  note text,
  ord integer not null default 0,
  updated_at timestamptz not null default now()
);`;

export async function init(onReady) {
  if (!db) return;
  for (let tries = 1; ; tries += 1) {
    try {
      await db.query(SCHEMA);
      if (onReady) await onReady();
      state.ready = true;
      console.log("database ready");
      return;
    } catch (e) {
      console.error(`database not ready (try ${tries}):`, e.message);
      if (tries >= 20) return;
      await new Promise((r) => setTimeout(r, Math.min(15000, 1000 * tries)));
    }
  }
}

// settings: small values, read often (the visit counter checks the excluded addresses on every hit)
const cache = new Map();
export async function getSetting(key, fallback = "") {
  const c = cache.get(key);
  if (c && c.at > Date.now() - 30000) return c.value;
  const { rows } = await db.query("select value from settings where key = $1", [key]);
  const value = rows[0] ? rows[0].value : fallback;
  cache.set(key, { value, at: Date.now() });
  return value;
}
export async function setSetting(key, value) {
  await db.query("insert into settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value", [key, String(value)]);
  cache.set(key, { value: String(value), at: Date.now() });
}
