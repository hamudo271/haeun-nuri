/* 해운누리한의원 — 광고·분석 코드 (네이버, 구글, 메타, 카카오).
   The server writes window.FB_TAGS into a page (관리자 → 홈페이지 → 광고·분석 코드) and adds this script. The codes load
   once the page is idle, so they never hold up what a visitor sees. window.fbConvert(kind) is called by js/sub.js only
   after the server has saved a consultation, and sends no name or number, only the kind of request. */
(() => {
  "use strict";
  const T = window.FB_TAGS || {};
  const load = (src, onload) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    if (onload) s.onload = onload;
    document.head.append(s);
  };
  const later = (fn) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200));
  const host = location.hostname.replace(/^www\./, "");
  const pending = { kakao: [], naver: [] }; // conversions that came before these two scripts arrived

  // Google and Meta keep a queue of their own, so their calls can start before their scripts arrive
  if (T.ga4 || T.gads) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
    window.gtag("js", new Date());
    if (T.ga4) window.gtag("config", T.ga4);
    if (T.gads) window.gtag("config", T.gads);
  }
  if (T.meta && !window.fbq) {
    const q = function fbq() { if (q.callMethod) q.callMethod.apply(q, arguments); else q.queue.push(arguments); }; // eslint-disable-line prefer-rest-params
    q.push = q; q.loaded = true; q.version = "2.0"; q.queue = [];
    window.fbq = q;
    if (!window._fbq) window._fbq = q;
    window.fbq("init", T.meta);
    window.fbq("track", "PageView");
  }

  const kakaoConvert = () => window.kakaoPixel(T.kakaoConv || T.kakao).participation();
  const naverConvert = () => window.wcs_do({ cnv: window.wcs.cnv("4", "1") }); // 4: 신청·예약

  later(() => {
    if (T.ga4 || T.gads) load(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(T.ga4 || T.gads)}`);
    if (T.meta) load("https://connect.facebook.net/en_US/fbevents.js");
    if (T.naver) {
      load("https://wcs.naver.net/wcslog.js", () => {
        if (!window.wcs) return;
        window.wcs_add = window.wcs_add || {};
        window.wcs_add.wa = T.naver;
        window._nasa = window._nasa || {};
        window.wcs.inflow(host);
        window.wcs_do(window._nasa);
        pending.naver.splice(0).forEach(naverConvert);
      });
    }
    if (T.kakao || T.kakaoConv) {
      load("https://t1.daumcdn.net/kas/static/kp.js", () => {
        if (!window.kakaoPixel) return;
        if (T.kakao) window.kakaoPixel(T.kakao).pageView();
        pending.kakao.splice(0).forEach(kakaoConvert);
      });
    }
  });

  window.fbConvert = (kind) => {
    const k = String(kind || "consult");
    if (window.gtag) {
      if (T.gads && T.gadsLabel) window.gtag("event", "conversion", { send_to: `${T.gads}/${T.gadsLabel}` });
      if (T.ga4) window.gtag("event", "generate_lead", { lead_type: k });
    }
    if (T.meta && window.fbq) window.fbq("track", T.metaEvent || "CompleteRegistration", { content_category: k });
    if (T.kakao || T.kakaoConv) { if (window.kakaoPixel) kakaoConvert(); else pending.kakao.push(k); }
    if (T.naver) { if (window.wcs && window.wcs.cnv) naverConvert(); else pending.naver.push(k); }
  };
})();
