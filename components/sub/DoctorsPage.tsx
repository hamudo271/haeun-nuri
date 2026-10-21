import Rich from '../Rich';
import { loadPage } from '@/lib/content';
import './doctors.css';

/* 원본: 소개 제목·한 줄 소개는 명조 */
// 명조(Noto Serif KR)는 자체 부분 글꼴('HN KSerif', app/globals.css · scripts/fonts/subset.py) — 구글 폰트 CSS(렌더링 차단) 없이 같은 글꼴

/**
 * 의료진 소개(about/page03) — 원본 통이미지(sub01-03-01~04.jpg, 1920px 시안)를 HTML/CSS 로 다시 그린 것.
 * 글자는 모두 진짜 글자, 이미지는 접수대 배경 사진·원장 사진·육각 로고 무늬뿐.
 * 좌표는 원본 1920 시안의 가운데 1300px 기준(--u), 1023px 이하는 모바일 750 시안 기준(--m).
 */

const IMG = '/img/sub/about-page03';

type Doc = {
  id: string;
  file: string;
  side: 'l' | 'r';
  /** PC: 섹션 높이 / 사진 top / 글 묶음(점) top / 로고 top — 원본 시안 좌표 */
  h: number;
  ph: number;
  tx: number;
  hex: number;
  /** 모바일: 사진 top / 섹션 아래 여백 */
  phm: number;
  pbm: number;
};

const DOCS: Doc[] = [
  { id: 'doctor-koo', file: 'doc-koo', side: 'l', h: 695, ph: 80, tx: 126, hex: 137, phm: 127, pbm: 27 },
  { id: 'doctor-kim', file: 'doc-kim', side: 'r', h: 698, ph: 67, tx: 195, hex: 167, phm: 108, pbm: 24 },
  { id: 'doctor-lee', file: 'doc-lee', side: 'l', h: 716, ph: 36, tx: 166, hex: 177, phm: 104, pbm: 47 },
];

const webp = (s: string) => s.replace(/\.jpg$/, '.webp');

/** PC/모바일 사진을 따로(모바일 원본에서 잘라 낸 것) */
function Pic({ pc, mo, wh, alt, eager = false }: { pc: string; mo?: string; wh: [number, number]; alt: string; eager?: boolean }) {
  return (
    <picture>
      {mo && <source media="(max-width: 1023px)" srcSet={webp(mo)} type="image/webp" />}
      {mo && <source media="(max-width: 1023px)" srcSet={mo} />}
      <source srcSet={webp(pc)} type="image/webp" />
      <img src={pc} alt={alt} width={wh[0]} height={wh[1]} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </picture>
  );
}

export default function DoctorsPage() {
  const data = loadPage('sub_about_page03');
  const quote = data.sections[0];
  const docs = data.sections.slice(1);
  const [eb1, eb2] = (quote.eyebrow ?? '').split('\n');

  return (
    <div className="s-doc">
      {/* ---------------------------------------------------------- 진료 철학(어두운 접수대 사진 위) */}
      <section className="s-doc-quote" id={quote.id} aria-labelledby="s-doc-quote-t">
        <Pic pc={`${IMG}/quote-bg.jpg`} mo={`${IMG}/quote-bg-m.jpg`} wh={[1920, 529]} alt="" eager />
        <div className="s-doc-in">
          <span className="s-doc-qm" aria-hidden="true">
            “
          </span>
          <p className="s-doc-eb" data-rv="up">
            <span className="s-doc-eb-ln">{eb1}</span>
            <span className="s-doc-eb-ln">{eb2}</span>
          </p>
          <span className="s-doc-vl" aria-hidden="true" />
          <span className="s-doc-dot" aria-hidden="true" />
          <h2 className="s-doc-qt" id="s-doc-quote-t" data-rv="up">
            <Rich text={quote.title ?? ''} />
          </h2>
          {quote.body?.map((b, i) => (
            <p key={i} className="s-doc-qx" data-rv="up">
              {b.split('\n').map((ln, j) => (
                <span key={j} className="s-doc-ln">
                  {j > 0 && ' '}
                  <Rich text={ln} />
                </span>
              ))}
            </p>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- 원장 3명 */}
      {docs.map((s, i) => {
        const d = DOCS[i];
        if (!d) return null;
        const left = (s.items?.[0]?.text ?? '').split('\n').filter(Boolean);
        const right = (s.items?.[1]?.text ?? '').split('\n').filter(Boolean);
        const rows = Math.max(left.length, right.length);
        return (
          <article
            key={s.id}
            id={s.id}
            className={`s-doc-dr is-${d.side}`}
            aria-labelledby={`${s.id}-t`}
            style={{ ['--h' as string]: d.h, ['--ph-y' as string]: d.ph, ['--tx-y' as string]: d.tx, ['--hex-y' as string]: d.hex, ['--phm-y' as string]: d.phm, ['--pbm' as string]: d.pbm }}
          >
            <div className="s-doc-in">
              <span className="s-doc-hex" aria-hidden="true" />
              <figure className="s-doc-ph" data-rv="clip">
                <Pic pc={`${IMG}/${d.file}.jpg`} mo={`${IMG}/${d.file}-m.jpg`} wh={[513, 565]} alt={`${s.title} ${s.eyebrow}`} eager={i === 0} />
              </figure>
              <div className="s-doc-tx" data-rv="up">
                <h2 className="s-doc-nm" id={`${s.id}-t`}>
                  <strong>{s.title}</strong> <span>{s.eyebrow}</span>
                </h2>
                {s.lead && <p className="s-doc-lead">{s.lead}</p>}
                <div className="s-doc-list">
                  <ul>
                    {Array.from({ length: rows }, (_, k) => (
                      <li key={k}>{left[k]}</li>
                    ))}
                  </ul>
                  <ul>
                    {Array.from({ length: rows }, (_, k) => (
                      <li key={k}>{right[k]}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
