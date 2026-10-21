/* 공유 미리보기 이미지(og:image) 만들기 — 1200×630 JPG → public/og/
 * 실행: NODE_PATH=$(npm root -g) node scripts/og/make-og.cjs [키 …]   (키를 주면 그 이미지만)
 * 필요: puppeteer(-core) 전역 설치 + Google Chrome. 글꼴은 Pretendard(public/fonts)·Noto Serif KR·Cormorant(Google Fonts).
 * 문구는 원고·병원 안내에 있는 사실만 쓴다. 페이지와 이미지 연결은 lib/seo.ts 의 og 값.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
let puppeteer;
try { puppeteer = require('puppeteer'); } catch { puppeteer = require('puppeteer-core'); }

const ROOT = path.resolve(__dirname, '../../public');
const OUT = path.join(ROOT, 'og');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// key: 파일 이름 · label: 위 작은 글 · h: 제목(<em> = 금색) · sub: 아래 한 줄 · img: 사진 · pos: 사진에서 보일 위치
const CARDS = [
  { key: 'home', label: '부산 해운대 · 장산역 1번 출구 앞', h: '<em>해운대 한의원</em><br>해운누리한의원', sub: '한의사 3인 협진 · 365일 진료 · 1인실 입원실', img: 'img/facility/01.jpg', pos: '58% center' },
  { key: 'about-hours', label: '진료시간', h: '<em>일요일·공휴일</em>에도<br>진료합니다', sub: '평일 09:00–21:00 · 주말·공휴일 09:00–17:00', img: 'img/facility/01.jpg', pos: '88% center' },
  { key: 'about-location', label: '오시는 길', h: '<em>장산역 1번 출구</em> 앞<br>좌동 한의원', sub: '부산 해운대구 세실로 48 해운대삼정코아주상복합 2층', img: 'img/facility/06.jpg', pos: '82% center' },
  { key: 'about-doctors', label: '의료진 소개', h: '한의사 <em>3인</em>이<br>함께 진료합니다', sub: '구가현 대표원장 · 김민성 원장 · 이근서 원장', doctors: ['img/doctors/cut-16.png', 'img/doctors/cut-13.png', 'img/doctors/cut-15.png'] },
  { key: 'about-tour', label: '둘러보기', h: '해운누리한의원<br><em>공간 둘러보기</em>', sub: '접수처 · 진료실 · 치료실 · 1인실 입원실', img: 'img/facility/02.jpg', pos: '42% center' },
  { key: 'hospital-ward', label: '입원실 안내', h: '<em>해운대 한의원 입원</em><br>전 병실 1인실', sub: '365일 당일 입원 · 자동차보험·건강보험 적용', img: 'img/facility/04.jpg', pos: '30% center' },
  { key: 'hospital-admission', label: '입원절차 안내', h: '준비물 없이<br><em>당일 입원</em>', sub: '교통사고 입원 서류는 해운누리가 처리합니다', img: 'img/facility/03.jpg', pos: '35% center' },
  { key: 'treatment-acu', label: '약침치료', h: '<em>해운대 약침</em><br>치료', sub: '통증 부위와 경혈에 한약재 약액을 주입', img: 'img/main/img-07.jpg', pos: '55% center' },
  { key: 'treatment-chuna', label: '추나요법', h: '<em>해운대</em><br><em>추나요법</em>', sub: '건강보험 적용 · 본인부담률 50~80%', img: 'img/main/img-02.jpg', pos: '50% center' },
  { key: 'treatment-thread', label: '통증매선', h: '<em>해운대 매선</em><br>치료', sub: '녹는 의료용 실(PDO) · 마취·절개 없는 시술', img: 'img/main/img-03.jpg', pos: '45% center' },
  { key: 'treatment-herb', label: '한약치료', h: '<em>체질 맞춤</em><br>한약 치료', sub: '나이·체질·체형에 따라 1:1 상담 후 처방', img: 'img/sub/treatment-page04/decoction-m.jpg', pos: '50% center' },
  { key: 'clinic-accident', label: '진료과목 · 자동차사고', h: '<em>해운대 교통사고</em><br>한의원', sub: '자동차보험 진료 · 1인실 입원 · 365일 진료', img: 'img/clinic/p1/intro.jpg', pos: '42% center' },
  { key: 'clinic-spine', label: '진료과목 · 척추관절', h: '<em>목·허리·어깨·무릎</em><br>통증 진료', sub: '디스크 · 척추관협착증 · 오십견 · 관절 통증', img: 'img/clinic/p2/intro.jpg', pos: '24% center' },
  { key: 'clinic-digestive', label: '진료과목 · 내과질환', h: '<em>소화불량·담적</em><br>위장 질환 진료', sub: '위염 · 역류성식도염 · 과민성 대장증후군', img: 'img/clinic/p3/intro.jpg', pos: '70% center' },
  { key: 'clinic-women', label: '진료과목 · 여성질환', h: '<em>여성질환</em><br>한방 진료', sub: '생리통 · 난임 · 갱년기 · 산후 조리', img: 'img/clinic/p4/intro.jpg', pos: '45% center' },
  { key: 'clinic-skin', label: '진료과목 · 피부질환', h: '<em>피부질환</em><br>한방 진료', sub: '여드름 · 습진 · 건선 · 두드러기', img: 'img/clinic/p5/intro.jpg', pos: '50% center' },
  { key: 'clinic-mind', label: '진료과목 · 정신건강', h: '<em>불면증·공황장애</em><br>마음 진료', sub: '화병 · 스트레스증후군', img: 'img/clinic/p6/intro.jpg', pos: '38% center' },
  { key: 'clinic-diet', label: '진료과목 · 다이어트', h: '<em>한방 다이어트</em><br>체질별 맞춤', sub: '여성 · 남성 · 체질별 다이어트', img: 'img/clinic/p7/intro.jpg', pos: '50% center' },
  { key: 'media-video', label: '해운누리 미디어 · 유튜브', h: '원장님이 직접<br><em>설명하는 건강 영상</em>', sub: '질환과 치료 이야기를 영상으로', img: 'img/facility/07.jpg', pos: '40% center' },
  { key: 'media-column', label: '해운누리 미디어 · 전문칼럼', h: '해운누리<br><em>전문칼럼</em>', sub: '원장님이 직접 쓰는 건강 칼럼', img: 'img/main/img-04.jpg', pos: '50% center' },
  { key: 'board-news', label: '공지사항', h: '<em>해운누리</em> 소식', sub: '진료 일정과 병원 안내', img: 'img/facility/06.jpg', pos: '60% center' },
  { key: 'nonpay', label: '비급여 진료비용', h: '<em>비급여</em><br>진료비용 안내', sub: '의료법에 따른 비급여 항목·금액 고지', img: 'img/facility/01.jpg', pos: '20% center' },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500&family=Noto+Serif+KR:wght@600&display=block');
@import url('/og-fonts.css');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1200px;height:630px;overflow:hidden;background:#2b2019}
body{font-family:'Pretendard Variable',sans-serif;-webkit-font-smoothing:antialiased}
.card{position:relative;width:1200px;height:630px;overflow:hidden;
  background:radial-gradient(130% 150% at 0% 0%,#3d2e23 0%,#2b2019 52%,#1d1611 100%)}
.grain{position:absolute;inset:0;opacity:.18;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.55'/></svg>")}
.wm{position:absolute;left:52px;bottom:-58px;font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:500;
  font-size:190px;letter-spacing:-.01em;color:rgba(188,156,112,.05);white-space:nowrap}
.left{position:absolute;left:84px;top:74px;bottom:66px;width:640px;display:flex;flex-direction:column}
.en{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:500;font-size:25px;letter-spacing:.04em;color:#bc9c70}
.label{margin-top:30px;display:flex;align-items:center;gap:14px;font-size:22px;font-weight:500;color:#dcc9a8;letter-spacing:-.01em}
.label::before{content:'';width:40px;height:1px;background:#bc9c70}
h1{margin-top:20px;font-family:'Noto Serif KR',serif;font-weight:600;font-size:60px;line-height:1.26;letter-spacing:-.025em;color:#f7f4ef;word-break:keep-all}
h1 em{font-style:normal;color:#dcb98a}
.sub{margin-top:24px;font-size:24px;font-weight:400;line-height:1.5;color:rgba(247,244,239,.8);letter-spacing:-.01em;word-break:keep-all}
.foot{margin-top:auto;display:flex;align-items:center;gap:22px;font-size:20px;font-weight:500;color:rgba(247,244,239,.78)}
.logo{width:205px;height:28px;background:url(/img/brand/logo-white.png) no-repeat;background-size:218px 100px;background-position:-6.5px -36.5px}
.bar{width:1px;height:26px;background:rgba(188,156,112,.7)}
.tel{font-family:'Pretendard Variable';font-weight:600;letter-spacing:.01em;color:#dcc9a8}
.arch-line{position:absolute;right:66px;top:40px;width:408px;height:550px;border:1px solid rgba(188,156,112,.8);border-radius:204px 204px 16px 16px}
.arch-line.in{right:74px;top:48px;width:392px;height:534px;border-color:rgba(188,156,112,.35);border-radius:196px 196px 12px 12px}
.arch{position:absolute;right:84px;top:58px;width:372px;height:514px;border-radius:186px 186px 8px 8px;overflow:hidden;background:#3a2c22}
.arch img{width:100%;height:100%;object-fit:cover;filter:saturate(.92) contrast(1.02)}
.arch::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(43,32,25,0) 55%,rgba(43,32,25,.35) 100%)}
.dot{position:absolute;right:266px;top:30px;width:9px;height:9px;border-radius:50%;background:#bc9c70}
.docs{position:absolute;inset:0;background:radial-gradient(90% 70% at 50% 70%,#f7f4ef 0%,#e9e1d4 70%,#d9cdb9 100%)}
.arch.wide{right:60px;width:520px;border-radius:260px 260px 8px 8px}
.arch-line.wide{right:42px;width:556px;border-radius:278px 278px 16px 16px}
.arch-line.in.wide{right:50px;width:540px;border-radius:270px 270px 12px 12px}
.dot.wide{right:316px}
.left.narrow{width:500px}
.docs .d{position:absolute;bottom:0;width:auto;max-width:none;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(43,32,25,.18))}
`;

function html(c) {
  // 의료진: 아치를 넓혀 세 분을 나란히(가운데 대표원장이 앞)
  const right = c.doctors
    ? `<div class="arch-line wide"></div><div class="arch-line in wide"></div><div class="arch wide"><div class="docs">
        <img class="d" src="/${c.doctors[0]}" style="left:-30px;height:360px">
        <img class="d" src="/${c.doctors[2]}" style="right:-14px;height:370px">
        <img class="d" src="/${c.doctors[1]}" style="left:50%;transform:translateX(-50%);height:410px">
      </div></div>`
    : `<div class="arch-line"></div><div class="arch-line in"></div><div class="arch"><img src="/${c.img}" style="object-position:${c.pos || 'center'}"></div>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${CSS}</style></head><body>
  <div class="card"><div class="grain"></div><div class="wm">Haeun-Nuri</div>
    ${right}<i class="dot${c.doctors ? ' wide' : ''}"></i>
    <div class="left${c.doctors ? ' narrow' : ''}">
      <p class="en">Haeun-Nuri Oriental Clinic</p>
      <p class="label">${c.label}</p>
      <h1>${c.h}</h1>
      <p class="sub">${c.sub}</p>
      <div class="foot"><span class="logo" role="img" aria-label="해운누리한의원"></span><span class="bar"></span>${c.doctors ? '' : '<span>장산역 1번 출구 앞</span>'}<span class="tel">051-715-4723</span></div>
    </div>
  </div></body></html>`;
}

// public/ 을 그대로 내보내는 작은 서버(+ Pretendard @font-face 를 /og-fonts.css 로)
const TYPES = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.css': 'text/css', '.html': 'text/html; charset=utf-8' };
const fontsCss = fs.readFileSync(path.resolve(__dirname, '../../app/fonts.css'), 'utf8');
const pages = new Map();
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/og-fonts.css') { res.writeHead(200, { 'Content-Type': 'text/css' }); return res.end(fontsCss); }
  if (pages.has(u)) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(pages.get(u)); }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  const only = process.argv.slice(2);
  const list = only.length ? CARDS.filter((c) => only.includes(c.key)) : CARDS;
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: fs.existsSync(CHROME) ? CHROME : undefined, headless: 'new', args: ['--font-render-hinting=none'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  for (const c of list) {
    pages.set(`/__og/${c.key}.html`, html(c));
    await page.goto(`${base}/__og/${c.key}.html`, { waitUntil: 'networkidle0' });
    await page.evaluate(async () => { await document.fonts.ready; });
    const file = path.join(OUT, `${c.key}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
    console.log(`${c.key}.jpg ${Math.round(fs.statSync(file).size / 1024)}KB`);
  }
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
