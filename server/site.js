// The site's own address (SITE_URL), read once and forgivingly: "haeun-nuri.com", "https://haeun-nuri.com/" and a
// Railway address all work; anything that is not an address falls back to https://haeun-nuri.com with a warning,
// so a typo in Railway's variables never stops the site from starting.
const FALLBACK = "https://haeun-nuri.com"; // lib/site.ts ORIGIN
function parse(v) {
  let s = String(v || "").trim();
  if (!s) return FALLBACK;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return `${u.protocol}//${u.host}`;
  } catch {
    console.error(`SITE_URL "${v}" is not an address; using ${FALLBACK}`);
    return FALLBACK;
  }
}
export const SITE = parse(process.env.SITE_URL);
export const SITE_HOST = new URL(SITE).host;
