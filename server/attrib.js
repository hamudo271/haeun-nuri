// Where a visitor came from and on what: the referrer, the link's tags (utm_*, Naver and Google ad tags) and the
// browser's own name. Used for the visit counter (stats.js) and for each consultation (consult.js), so both speak of
// the same channels. Labels are the clinic's words: 네이버 검색, 네이버 블로그, 카카오톡, 인스타그램, 직접 방문 …

// [host, group, channel, the referrer's search-word parameter]
const HOSTS = [
  [/(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|wrtn\.ai)$/, "AI 검색", "AI 검색"],
  [/^(adcr|ad\.search|searchad|ader)\.naver\.com$/, "광고", "네이버 광고"],
  [/^(m\.)?search\.naver\.com$/, "검색", "네이버 검색", "query"],
  [/^(m\.)?blog\.naver\.com$|(^|\.)blog\.me$/, "블로그·카페", "네이버 블로그"],
  [/^(m\.)?cafe\.naver\.com$/, "블로그·카페", "네이버 카페"],
  [/^([\w-]+\.)*(map|place)\.naver\.com$|^naver\.me$/, "지도", "네이버 지도"],
  [/^(m\.)?(in|kin)\.naver\.com$/, "검색", "네이버 지식iN"],
  [/(^|\.)naver\.com$/, "검색", "네이버"],
  [/(^|\.)(googleadservices\.com|doubleclick\.net|googlesyndication\.com)$/, "광고", "구글 광고"],
  [/^(www\.|m\.)?google\.[a-z.]+$/, "검색", "구글 검색", "q"],
  [/^(m\.)?search\.daum\.net$/, "검색", "다음 검색", "q"],
  [/^(m\.)?cafe\.daum\.net$/, "블로그·카페", "다음 카페"],
  [/(^|\.)(map|place\.map|m\.map)\.kakao\.com$/, "지도", "카카오맵"],
  [/(^|\.)daum\.net$/, "검색", "다음"],
  [/(^|\.)tistory\.com$/, "블로그·카페", "티스토리"],
  [/(^|\.)brunch\.co\.kr$/, "블로그·카페", "브런치"],
  [/(^|\.)bing\.com$/, "검색", "빙", "q"],
  [/(^|\.)zum\.com$/, "검색", "줌", "query"],
  [/(^|\.)(duckduckgo\.com|search\.yahoo\.com|ecosia\.org|yandex\.[a-z]+)$/, "검색", "기타 검색"],
  [/(^|\.)instagram\.com$/, "SNS", "인스타그램"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, "SNS", "페이스북"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "SNS", "유튜브"],
  [/(^|\.)threads\.(net|com)$/, "SNS", "스레드"],
  [/(^|\.)tiktok\.com$/, "SNS", "틱톡"],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, "SNS", "X(트위터)"],
  [/(^|\.)band\.us$/, "SNS", "밴드"],
  [/(^|\.)daangn\.com$/, "SNS", "당근"],
  [/(^|\.)(kakao\.com|kakao\.co\.kr|kakaocdn\.net)$/, "메신저", "카카오톡"],
  [/(^|\.)gangnamunni\.com$/, "성형앱", "강남언니"],
  [/(^|\.)babitalk\.com$/, "성형앱", "바비톡"],
  [/(^|\.)yeoshin\.co\.kr$/, "성형앱", "여신티켓"],
];

// utm_source → the clinic's word for it, and the group it goes in when it is not an ad
const SOURCES = {
  naver: ["네이버", "검색"], naverblog: ["네이버 블로그", "블로그·카페"], blog: ["블로그", "블로그·카페"], navercafe: ["네이버 카페", "블로그·카페"],
  naverplace: ["네이버 지도", "지도"], place: ["네이버 지도", "지도"], google: ["구글", "검색"], daum: ["다음", "검색"],
  kakao: ["카카오톡", "메신저"], kakaotalk: ["카카오톡", "메신저"], kakaochannel: ["카카오톡", "메신저"],
  instagram: ["인스타그램", "SNS"], insta: ["인스타그램", "SNS"], ig: ["인스타그램", "SNS"], facebook: ["페이스북", "SNS"], fb: ["페이스북", "SNS"],
  meta: ["메타", "SNS"], youtube: ["유튜브", "SNS"], yt: ["유튜브", "SNS"], threads: ["스레드", "SNS"], tiktok: ["틱톡", "SNS"],
  daangn: ["당근", "SNS"], karrot: ["당근", "SNS"], band: ["밴드", "SNS"],
  gangnamunni: ["강남언니", "성형앱"], babitalk: ["바비톡", "성형앱"], yeoshin: ["여신티켓", "성형앱"],
  qr: ["QR코드", "오프라인"], flyer: ["전단지", "오프라인"], sms: ["문자", "메신저"], lms: ["문자", "메신저"], mms: ["문자", "메신저"],
  email: ["이메일", "메신저"], newsletter: ["이메일", "메신저"],
};
const PAID = /^(cpc|ppc|cpm|cpv|paid|paidsearch|paid_search|paidsocial|paid_social|ad|ads|display|banner|sa|da|gfa|powerlink|brandsearch|search_ad)$/i;

export const GROUPS = ["검색", "광고", "지도", "블로그·카페", "SNS", "메신저", "성형앱", "AI 검색", "캠페인", "오프라인", "기타 사이트", "직접 방문"];

const clip = (s, n = 120) => String(s || "").trim().slice(0, n) || null;

// a page's address as the reports keep it: no query, no ".html", "/" for the main page
export function cleanPath(p) {
  let s = String(p || "/").split(/[?#]/)[0].slice(0, 200);
  if (!s.startsWith("/")) s = `/${s}`;
  s = s.replace(/\.html$/, "").replace(/\/index$/, "/").replace(/\/{2,}/g, "/");
  return s || "/";
}

// the few link tags that say where a visit came from; everything else in the address is dropped
export function pickTags(search) {
  let q;
  try { q = new URLSearchParams(String(search || "")); } catch { return {}; }
  const out = {};
  for (const [k, v] of q) if (/^(utm_(source|medium|campaign|term|content)|gclid|gbraid|wbraid|fbclid|n_(media|query|keyword|ad_group|campaign_type|rank)|NaPm|igshid)$/.test(k) && v) out[k] = String(v).slice(0, 160);
  return out;
}

export function parseUA(ua = "") {
  const s = String(ua);
  const bot = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|scrapy|phantom|puppeteer|playwright|daum(oa|os)|yeti|naverbot|kakaotalk-scrap|whatsapp|telegrambot|discordbot|slackbot/i.test(s);
  const tablet = /ipad|tablet|(android(?!.*mobile))|kindle|silk/i.test(s);
  const mobile = !tablet && /mobi|iphone|ipod|android.*mobile|windows phone/i.test(s);
  const os = /iphone|ipad|ipod/i.test(s) ? "iOS" : /android/i.test(s) ? "Android" : /windows/i.test(s) ? "Windows" : /mac os x|macintosh/i.test(s) ? "macOS" : /cros/i.test(s) ? "ChromeOS" : /linux/i.test(s) ? "Linux" : "기타";
  const inapp = /kakaotalk/i.test(s) ? "카카오톡" : /naver\(inapp|naver\//i.test(s) ? "네이버 앱" : /instagram/i.test(s) ? "인스타그램" : /fban|fbav|fb_iab/i.test(s) ? "페이스북"
    : /daumapps/i.test(s) ? "다음 앱" : /\bline\//i.test(s) ? "라인" : /band\//i.test(s) ? "밴드" : /everytimeapp/i.test(s) ? "에브리타임" : /threads/i.test(s) ? "스레드" : /tiktok|musical_ly|bytedance/i.test(s) ? "틱톡" : null;
  const browser = inapp ? `${inapp} 앱` : /samsungbrowser/i.test(s) ? "삼성 인터넷" : /whale/i.test(s) ? "웨일" : /edg\//i.test(s) ? "엣지" : /opr\/|opera/i.test(s) ? "오페라"
    : /firefox|fxios/i.test(s) ? "파이어폭스" : /crios|chrome/i.test(s) ? "크롬" : /safari/i.test(s) ? "사파리" : "기타";
  return { bot, device: tablet ? "태블릿" : mobile ? "모바일" : "PC", os, browser, inapp };
}

// A visit's channel. ref: the page it came from (document.referrer); tags: pickTags(); ua: the browser; own: this site's hosts.
export function classify({ ref = "", tags = {}, ua = "", own = [] } = {}) {
  let host = "";
  let refUrl = null;
  try { refUrl = new URL(ref); host = refUrl.hostname.toLowerCase(); } catch { /* no referrer */ }
  if (host && own.some((o) => host === o || host.endsWith(`.${o}`))) host = ""; // from this site itself: not a source
  const out = { grp: "직접 방문", channel: "직접 방문", source: null, medium: null, campaign: clip(tags.utm_campaign), keyword: null, refHost: host || null };
  const keyword = (k) => { if (!out.keyword && k) out.keyword = clip(k, 80); };
  keyword(tags.utm_term);
  keyword(tags.n_keyword || tags.n_query);
  const rule = host && HOSTS.find(([re]) => re.test(host));
  if (rule && rule[3] && refUrl) keyword(refUrl.searchParams.get(rule[3]));

  // 1. the link's own tags
  const src = String(tags.utm_source || "").toLowerCase().replace(/[\s_-]+/g, "");
  const med = String(tags.utm_medium || "").toLowerCase();
  if (src) {
    const [label, grp] = SOURCES[src] || [clip(tags.utm_source, 40), "캠페인"];
    out.source = clip(tags.utm_source, 60);
    out.medium = clip(tags.utm_medium, 60);
    if (PAID.test(med)) return { ...out, grp: "광고", channel: `${label.replace(/^네이버 (블로그|카페|지도)$/, "네이버")} 광고` };
    if (src === "naver" && /blog/.test(med)) return { ...out, grp: "블로그·카페", channel: "네이버 블로그" };
    if (src === "naver" && /place|map/.test(med)) return { ...out, grp: "지도", channel: "네이버 지도" };
    return { ...out, grp, channel: label };
  }
  if (tags.n_media || tags.n_keyword || tags.n_query || tags.n_ad_group) return { ...out, grp: "광고", channel: "네이버 광고", source: "naver", medium: "cpc" };
  if (tags.NaPm && /tr(%3D|=)(sa|brnd|plc|pla|gfa)/i.test(tags.NaPm)) {
    const tr = (tags.NaPm.match(/tr(?:%3D|=)(\w+)/i) || [])[1] || "";
    return { ...out, grp: "광고", channel: tr === "brnd" ? "네이버 브랜드검색" : /pl/.test(tr) ? "네이버 플레이스 광고" : "네이버 광고", source: "naver", medium: "cpc" };
  }
  if (tags.gclid || tags.gbraid || tags.wbraid) return { ...out, grp: "광고", channel: "구글 광고", source: "google", medium: "cpc" };

  // 2. the page it came from
  if (rule) return { ...out, grp: rule[1], channel: rule[2] };
  if (host) return { ...out, grp: "기타 사이트", channel: host.replace(/^(www|m)\./, "") };

  // 3. no referrer: the app it was opened in says the rest
  if (tags.fbclid) return { ...out, grp: "SNS", channel: /instagram/i.test(ua) ? "인스타그램" : "페이스북" };
  const { inapp } = parseUA(ua);
  const APPS = { 카카오톡: "메신저", "네이버 앱": "검색", 인스타그램: "SNS", 페이스북: "SNS", "다음 앱": "검색", 라인: "메신저", 밴드: "SNS", 스레드: "SNS", 틱톡: "SNS", 에브리타임: "SNS" };
  if (inapp && APPS[inapp]) return { ...out, grp: APPS[inapp], channel: inapp === "네이버 앱" ? "네이버" : inapp === "다음 앱" ? "다음" : inapp };
  return out;
}
