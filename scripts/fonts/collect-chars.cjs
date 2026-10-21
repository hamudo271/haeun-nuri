// 글꼴 부분집합용 글자 수집: 로컬 서버(npm start, :8099)의 모든 페이지에서 각 페이지에서 명조(Noto Serif KR)·Song Myung·Montserrat 로 그려지는 글자만 모은다(computed font-family 기준)
const puppeteer = require('puppeteer-core');
const PAGES = ['/', '/sub/about/page01/', '/sub/about/page02/', '/sub/about/page03/', '/sub/about/page04/', '/sub/hospital/page01/', '/sub/hospital/page02/', '/sub/treatment/page01/', '/sub/treatment/page02/', '/sub/treatment/page03/', '/sub/treatment/page04/', '/sub/clinic/page01/', '/sub/clinic/page02/', '/sub/clinic/page03/', '/sub/clinic/page04/', '/sub/clinic/page05/', '/sub/clinic/page06/', '/sub/clinic/page07/', '/sub/media/page01/', '/sub/media/page02/', '/sub/board/page01/', '/nonpay/', '/service_rull/', '/personal/'];
(async () => {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  const fams = { 'Noto Serif KR': {}, 'Song Myung': {}, 'Montserrat': {} };
  for (const path of PAGES) {
    await p.goto('http://localhost:8099' + path, { waitUntil: 'networkidle0' });
    const r = await p.evaluate((names) => {
      const out = {}; for (const n of names) out[n] = { chars: new Set(), weights: new Set(), els: 0 };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = node.nodeValue; if (!t || !t.trim()) continue;
        const el = node.parentElement; if (!el) continue;
        const cs = getComputedStyle(el); const ff = cs.fontFamily;
        for (const n of names) if (ff.includes(n) && !/HN Num|Cormorant/.test(ff.split(',')[0])) {
          // 첫 후보 글꼴이 그 이름일 때만(폴백 목록에 들어 있는 것은 제외)
          if (!ff.split(',')[0].replace(/["']/g, '').trim().includes(n) && !ff.split(',')[0].includes('--')) continue;
          for (const c of t) out[n].chars.add(c); out[n].weights.add(cs.fontWeight); out[n].els++;
        }
      }
      for (const n of names) { out[n].chars = [...out[n].chars].join(''); out[n].weights = [...out[n].weights]; }
      return out;
    }, Object.keys(fams));
    for (const n of Object.keys(fams)) { if (r[n].els) { fams[n][path] = { n: r[n].els, chars: r[n].chars.length, weights: r[n].weights }; fams[n].__all = (fams[n].__all || '') + r[n].chars; } }
  }
  for (const n of Object.keys(fams)) { const all = [...new Set(fams[n].__all || '')].sort().join(''); delete fams[n].__all; console.log('##', n, 'unique chars', all.length, JSON.stringify(fams[n])); require('fs').writeFileSync(require('path').join(__dirname, 'chars', n.toLowerCase().replace(/ /g, '-') + '.txt'), all); }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
