import { Montserrat, Song_Myung } from 'next/font/google';
import Rich from '../Rich';
import { loadPage } from '@/lib/content';
import './hours.css';

/* 제목(원본: 붓 느낌 명조) · 큰 숫자 365(원본: 굵은 기하 산세리프) — 빌드 때 받아 같은 서버에서 내보냄 */
const song = Song_Myung({ weight: '400', display: 'swap', variable: '--font-song' });
const mont = Montserrat({ weight: '800', subsets: ['latin'], display: 'swap', preload: false, variable: '--font-mont' });

const IMG = '/img/sub/about-page01';
/* 항목 앞 원형 금색 아이콘(약탕기·침대·자동차) — tools_sub/about_page01.py 가 원본 선을 따라 그린 SVG */
const ICONS = [1, 2, 3].map((n) => `${IMG}/ic-${n}.svg`);

/**
 * 진료시간 — 원본 통이미지(sub01-01-01·02, 1920px 시안 / m_ 750px 시안)를 HTML/CSS 로 다시 그린 것.
 * 위: 연중무휴 제목 + 진료시간 표 / 아래: 365 띠(배경 사진만 이미지, 글·아이콘 자리는 HTML).
 */
export default function HoursPage() {
  const page = loadPage('sub_about_page01');
  const hours = page.sections.find((s) => s.id === 'hours')!;
  const f365 = page.sections.find((s) => s.id === '365')!;
  const [t1, t2] = (hours.title ?? '').split('\n');

  return (
    <div className={`s-hrs ${song.variable} ${mont.variable}`}>
      {/* ---------------------------------------------------------- 진료시간 */}
      <section className="s-hrs-a" aria-labelledby="s-hrs-t">
        <div className="s-hrs-in">
          <header data-rv="up">
            <h2 className="s-hrs-t" id="s-hrs-t">
              <span>{t1}</span> <span>{t2 && <Rich text={t2} />}</span>
            </h2>
            {hours.lead && <p className="s-hrs-lead">{hours.lead}</p>}
          </header>
          <dl className="s-hrs-tb" data-rv="up">
            {hours.items?.map((it, i) => (
              <div key={i}>
                <dt>{it.title}</dt>
                <dd>{it.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------------------------------------------------- 365 띠 */}
      <section className="s-hrs-b" aria-labelledby="s-hrs-h">
        <div className="s-hrs-in">
          <span className="s-hrs-tab" aria-hidden="true" />
          <div className="s-hrs-l" data-rv="up">
            <p className="s-hrs-num">
              <b>{f365.num}</b>
              <span>
                <Rich text={f365.eyebrow ?? ''} />
              </span>
            </p>
            <h2 className="s-hrs-h" id="s-hrs-h">
              <Rich text={f365.title ?? ''} />
            </h2>
            <p className="s-hrs-lead2">
              <Rich text={f365.lead ?? ''} />
            </p>
          </div>
          <ul className="s-hrs-it" data-rv="up" style={{ ['--d' as string]: '120ms' }}>
            {f365.items?.map((it, i) => (
              <li key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ICONS[i]} width={64} height={64} alt="" loading="lazy" decoding="async" />
                <span>{it.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
