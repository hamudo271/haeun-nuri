import Link from 'next/link';
import Rich from '../Rich';
import { loadPage } from '@/lib/content';
import './ward.css';

/**
 * 입원실 안내(hospital/page01) — 원본 통이미지(sub02-01-01~07.jpg, 1920px 시안)를 HTML/CSS 로 다시 그린 것.
 * 글자는 모두 진짜 글자, 이미지는 입원실 사진뿐(사진 속 간판·라벨 글자도 지움).
 * 좌표는 원본 1920 시안의 가운데 1300px 기준(--u), 1023px 이하는 모바일 750 시안 기준(--m).
 */

const IMG = '/img/sub/hospital-page01';

type Feat = {
  side: 'l' | 'r';
  /** PC: 섹션 높이 / 제목 글자 top / 둥근 사진 top / 아래 사진 두 장 top / 회색 띠 [시작, 끝] */
  h: number;
  tx: number;
  ph: number;
  pair: number;
  band?: [number, number];
  /** 모바일: 번호 top / 섹션 아래 여백 / 본문을 원고 줄바꿈 없이 흐르게(원본 모바일 05) */
  numm: number;
  padm: number;
  flow?: boolean;
};

const FEATS: Feat[] = [
  { side: 'l', h: 878, tx: 173, ph: 74, pair: 410, band: [0, 857], numm: 66, padm: 50 },
  { side: 'r', h: 774, tx: 172, ph: 73, pair: 409, numm: 56, padm: 51 },
  { side: 'l', h: 1001, tx: 273, ph: 174, pair: 510, band: [68, 957], numm: 65, padm: 39 },
  { side: 'r', h: 907, tx: 161, ph: 79, pair: 458, numm: 69, padm: 50 },
  { side: 'l', h: 898, tx: 216, ph: 117, pair: 453, band: [11, 898], numm: 56, padm: 125, flow: true },
];

const webp = (s: string) => s.replace(/\.jpg$/, '.webp');

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

const plain = (t?: string) => (t ?? '').replace(/\*\*/g, '').replace(/\n/g, ' ');

export default function WardPage() {
  const data = loadPage('sub_hospital_page01');
  const intro = data.sections[0];
  const feats = data.sections.filter((s) => s.kind === 'feature');
  const cta = data.sections[data.sections.length - 1];

  return (
    <div className="s-wd">
      {/* ---------------------------------------------------------- 맨 위: 입구 사진 + 갈색 설명 박스 + 베이지 띠 */}
      <section className="s-wd-intro" id={intro.id} aria-labelledby="s-wd-intro-t">
        <div className="s-wd-in">
          <figure className="s-wd-intro-ph" data-rv="clip">
            <Pic pc={`${IMG}/intro.jpg`} mo={`${IMG}/intro-m.jpg`} wh={[966, 405]} alt="해운누리한의원 입원실 입구와 안내 데스크" eager />
          </figure>
          <span className="s-wd-brand" aria-hidden="true">
            Haeun-Nuri
          </span>
          <aside className="s-wd-box" data-rv="up">
            {intro.eyebrow && (
              <p className="s-wd-box-eb">
                <Rich text={intro.eyebrow} />
              </p>
            )}
            <h2 className="s-wd-box-t" id="s-wd-intro-t">
              <Rich text={intro.title ?? ''} />
            </h2>
            {intro.lead && (
              <p className="s-wd-box-x">
                <Rich text={intro.lead} />
              </p>
            )}
          </aside>
        </div>
      </section>

      {/* ---------------------------------------------------------- 번호 블록 5개(사진 좌우 번갈아) */}
      {feats.map((s, i) => {
        const f = FEATS[i];
        if (!f) return null;
        const n = i + 1;
        return (
          <section
            key={s.id}
            id={s.id}
            className={`s-wd-f is-${f.side}${f.band ? ' has-band' : ''}${f.flow ? ' is-flow' : ''}`}
            aria-labelledby={`${s.id}-t`}
            style={{
              ['--h' as string]: f.h,
              ['--tx-y' as string]: f.tx,
              ['--ph-y' as string]: f.ph,
              ['--pair-y' as string]: f.pair,
              ['--band-a' as string]: f.band?.[0] ?? 0,
              ['--band-b' as string]: f.band?.[1] ?? 0,
              ['--num-ym' as string]: f.numm,
              ['--pad-m' as string]: f.padm,
            }}
          >
            <div className="s-wd-in">
              <div className="s-wd-tx" data-rv="up">
                <span className="s-wd-num" aria-hidden="true">
                  {s.num}
                </span>
                <h2 className="s-wd-t" id={`${s.id}-t`}>
                  {(s.title ?? '').split('\n').map((ln, j) => (
                    <span key={j} className="s-wd-ln">
                      {j > 0 && ' '}
                      <Rich text={ln} />
                    </span>
                  ))}
                </h2>
                {s.body?.map((b, j) => (
                  <p key={j} className="s-wd-x">
                    {b.split('\n').map((ln, k) => (
                      <span key={k} className="s-wd-ln">
                        {k > 0 && ' '}
                        <Rich text={ln} />
                      </span>
                    ))}
                  </p>
                ))}
              </div>
              <figure className="s-wd-std" data-rv="clip">
                <Pic pc={`${IMG}/room-0${n}.jpg`} wh={[550, 270]} alt={plain(s.title)} eager={i === 0} />
              </figure>
              <ul className="s-wd-pair">
                <li data-rv="up">
                  <Pic pc={`${IMG}/room-0${n}a.jpg`} wh={[624, 324]} alt={`${plain(s.title)} 사진 1`} />
                </li>
                <li data-rv="up" style={{ ['--d' as string]: '120ms' }}>
                  <Pic pc={`${IMG}/room-0${n}b.jpg`} wh={[624, 324]} alt={`${plain(s.title)} 사진 2`} />
                </li>
              </ul>
            </div>
          </section>
        );
      })}

      {/* ---------------------------------------------------------- 맨 아래: 입원 절차 배너 */}
      <section className="s-wd-cta" id={cta.id} aria-labelledby="s-wd-cta-t">
        <div className="s-wd-in">
          <figure className="s-wd-cta-ph">
            <Pic pc={`${IMG}/banner.jpg`} mo={`${IMG}/banner-m.jpg`} wh={[1300, 455]} alt="" />
          </figure>
          <div className="s-wd-cta-tx" data-rv="up">
            {cta.eyebrow && (
              <p className="s-wd-cta-eb">
                <Rich text={cta.eyebrow} />
              </p>
            )}
            <h2 className="s-wd-cta-t" id="s-wd-cta-t">
              <Rich text={cta.title ?? ''} />
            </h2>
            {cta.cta && (
              <Link className="s-wd-btn" href={cta.cta.href}>
                {cta.cta.label}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
