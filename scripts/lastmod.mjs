// 사이트맵 lastmod 용: 페이지마다 그 내용을 이루는 파일들의 마지막 git 커밋 시각 → lib/lastmod.json
// 빌드(build:prod) 앞에 돈다. git 이 없는 곳(Railway 빌드)에서는 그냥 넘어가고 커밋된 lib/lastmod.json 을 쓴다.
// 디자인·메타 공통 파일(layout·globals.css·lib/seo.ts)은 넣지 않는다 — 전 페이지 날짜가 한꺼번에 바뀌면 검색엔진이 lastmod 를 믿지 않는다.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'lib/lastmod.json');
const sub = (g, p, ...extra) => [`content/sub_${g}_${p}.json`, ...extra];
const SOURCES = {
  '/': ['lib/home.ts', 'app/page.tsx', 'components/HeroSlides.tsx', 'components/DoctorTabs.tsx'],
  '/sub/about/page01/': sub('about', 'page01', 'components/sub/HoursPage.tsx', 'lib/site.ts'),
  '/sub/about/page02/': ['app/sub/about/page02/page.tsx', 'lib/site.ts'],
  '/sub/about/page03/': sub('about', 'page03', 'components/sub/DoctorsPage.tsx'),
  '/sub/about/page04/': ['app/sub/about/page04/page.tsx'],
  '/sub/hospital/page01/': sub('hospital', 'page01', 'components/sub/WardPage.tsx'),
  '/sub/hospital/page02/': sub('hospital', 'page02', 'components/sub/AdmissionPage.tsx'),
  '/sub/treatment/page01/': sub('treatment', 'page01', 'components/sub/AcuPage.tsx'),
  '/sub/treatment/page02/': sub('treatment', 'page02', 'components/sub/ChunaPage.tsx'),
  '/sub/treatment/page03/': sub('treatment', 'page03', 'components/sub/ThreadPage.tsx'),
  '/sub/treatment/page04/': sub('treatment', 'page04', 'components/sub/HerbPage.tsx'),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [`/sub/clinic/page0${n}/`, sub('clinic', `page0${n}`, 'components/clinic/ClinicPage.tsx', 'lib/clinic.ts')])),
  '/sub/media/page01/': ['app/sub/media/page01/page.tsx'],
  '/sub/media/page02/': ['app/sub/media/page02/page.tsx'],
  '/sub/board/page01/': ['app/sub/board/page01/page.tsx'],
  '/nonpay/': ['app/nonpay/page.tsx'],
  '/service_rull/': ['content/service_rull.json'],
  '/personal/': ['content/personal.json'],
};
// FAQ 는 화면 내용이므로 그 페이지의 날짜에 넣는다: lib/seo.ts 에서 faq 가 바뀐 커밋은 알 수 없어 seo.ts 전체 날짜를 쓰지 않는다

let out = {};
try {
  if (!fs.existsSync(path.join(ROOT, '.git'))) throw new Error('no .git');
  for (const [p, files] of Object.entries(SOURCES)) {
    const t = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...files], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (t) out[p] = t;
  }
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  if (JSON.stringify(prev) !== JSON.stringify(out)) {
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
    console.log(`lib/lastmod.json: ${Object.keys(out).length} pages updated`);
  }
} catch (e) {
  console.log(`lastmod: skipped (${e.message.split('\n')[0]}); using committed lib/lastmod.json`);
}
