import type { ReactNode } from 'react';
import { Noto_Serif_KR } from 'next/font/google';
import Rich from '../Rich';
import Img from './Img';
import { loadPage, type Section } from '@/lib/content';
import '../clinic/clinic.css';
import './acu.css';

/**
 * 진료안내 > 약침치료(treatment/page01) — 원본 통이미지(sub03-01-01~10, 1920 시안)를 HTML/CSS 로 다시 그린 것.
 * 글은 모두 원고(content/sub_treatment_page01.json) 그대로. 이미지는 사진·장식 무늬뿐(tools_sub/treatment_page01.py).
 * 좌표·크기는 원본 1920 시안을 잰 값(가운데 1300px 기준 --u), 1023px 이하는 모바일 750 시안(--m).
 */

/* 띠 제목 "01. 경근약침" — 원본은 가는 명조 */
const serif = Noto_Serif_KR({ weight: ['500'], subsets: ['latin'], display: 'swap', preload: false, variable: '--font-acu-serif' });

const P = '/img/sub/treatment-page01/';
const plain = (t?: string) => (t ?? '').replace(/\*\*/g, '').replace(/\n/g, ' ');

/**
 * 원본 디자이너가 손으로 끊은 줄바꿈을 그대로 — 글자는 바꾸지 않고 <br> 만 끼운다.
 * marks: 그 뒤에서 줄을 바꿀 글귀. kind: 'pc'(PC 에서만) | 'mo'(모바일에서만) | 'all'
 */
function Br({ text, marks, kind = 'pc' }: { text: string; marks: string[]; kind?: 'pc' | 'mo' | 'all' }) {
  const parts: ReactNode[] = [];
  let rest = text;
  marks.forEach((m, i) => {
    const at = rest.indexOf(m);
    if (at < 0) return;
    const cut = at + m.length;
    parts.push(<Rich key={`t${i}`} text={rest.slice(0, cut)} />);
    parts.push(<br key={`b${i}`} className={`s-acu-br s-acu-br--${kind}`} />);
    rest = rest.slice(cut); // 띄어쓰기는 그대로 둔다(줄바꿈을 숨길 때 단어가 붙지 않게)
  });
  parts.push(<Rich key="last" text={rest} />);
  return <>{parts}</>;
}

/* 패널 머리글: "| 해운누리한의원 ○○" + 큰 제목 + 가는 선 */
function Head({ eb, title, moMarks }: { eb?: string; title?: string; moMarks?: string[] }) {
  return (
    <header className="s-acu-hd" data-rv="up">
      {eb && (
        <p className="s-acu-eb">
          <Rich text={eb} />
        </p>
      )}
      {title && <h3 className="s-acu-t">{moMarks ? <Br text={title} marks={moMarks} kind="mo" /> : <Rich text={title} />}</h3>}
      <span className="s-acu-rule" aria-hidden="true" />
    </header>
  );
}

/* ---------------------------------------------------------------- 1. 소개 */
function Intro({ s }: { s: Section }) {
  return (
    <section className="s-acu-intro" aria-labelledby="acu-intro-t">
      <div className="cx-in">
        <figure className="s-acu-intro-ph" data-rv="clip">
          <Img src={`${P}intro.jpg`} wh={[582, 388]} alt={plain(s.title)} eager className="s-acu-pc" />
          <Img src={`${P}m-intro.jpg`} wh={[685, 388]} alt={plain(s.title)} eager className="s-acu-mo" />
        </figure>
        <div className="s-acu-intro-tx" data-rv="up">
          <p className="s-acu-intro-eb">
            <Rich text={s.eyebrow ?? ''} />
          </p>
          <h2 className="s-acu-intro-t" id="acu-intro-t">
            <Rich text={s.title ?? ''} />
          </h2>
          {s.body?.map((b, i) => (
            <p key={i} className="s-acu-intro-body">
              <span className="s-acu-intro-copy--pc">
                <Br text={b} marks={['통증부위 및', '강화하며']} />
              </span>
              <span className="s-acu-intro-copy--mo">
                <Br text={b} marks={['주입하여']} kind="all" />
              </span>
            </p>
          ))}
        </div>
        <span className="s-acu-intro-mark" aria-hidden="true">
          <Img src={`${P}intro-mark.jpg`} wh={[261, 227]} alt="" />
        </span>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 2·5·8. 갈색 띠 + 흰 패널 */
type BandBreaks = { lead?: string[]; body?: string[]; moLead?: string[] };
function Band({ s, n, img, brk, children }: { s: Section; n: 1 | 2 | 3; img: string; brk: BandBreaks; children: ReactNode }) {
  return (
    <section
      className={`s-acu-bsec s-acu-bsec--${n}`}
      id={s.id}
      aria-labelledby={`${s.id}-t`}
      style={{ ['--band' as string]: `url(${P}${img}.webp)`, ['--mband' as string]: `url(${P}m-${img}.webp)` }}
    >
      <div className="s-acu-band" aria-hidden="true" />
      <div className="cx-in">
        <div className="s-acu-band-tx">
          <div className="s-acu-band-l" data-rv="up">
            <h2 className={`s-acu-band-t ${serif.className}`} id={`${s.id}-t`}>
              {s.title}
            </h2>
            {!!s.tags?.length && (
              <ul className="s-acu-tags">
                {s.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="s-acu-band-r" data-rv="up">
            <p className="s-acu-band-lead">{brk.moLead ? <Br text={s.lead ?? ''} marks={brk.moLead} kind="mo" /> : <Rich text={s.lead ?? ''} />}</p>
            {s.body?.map((b, i) => (
              <p key={i} className="s-acu-band-body">
                <Br text={b} marks={brk.body ?? []} />
              </p>
            ))}
          </div>
        </div>
        <div className="s-acu-panel">{children}</div>
      </div>
    </section>
  );
}

/* 사진 396×208 카드 3×2 (경근약침·자하거약침) */
type CardBr = { pc?: string[] };
function Cards3({ s, prefix, brs, wide }: { s: Section; prefix: string; brs: CardBr[]; wide?: boolean }) {
  return (
    <ul className={`s-acu-cards${wide ? ' s-acu-cards--text' : ''}`}>
      {s.items?.map((it, i) => (
        <li key={i} className="s-acu-card" data-rv="up" style={{ ['--d' as string]: `${(i % 3) * 90}ms` }}>
          <figure className="s-acu-card-ph">
            <Img src={`${P}${prefix}-${i + 1}.jpg`} wh={[392, 204]} alt={plain(it.title)} />
          </figure>
          {it.text ? (
            <>
              <h4 className="s-acu-card-t">
                <Rich text={it.title ?? ''} />
              </h4>
              <p className="s-acu-card-x">
                <Br text={it.text} marks={brs[i]?.pc ?? []} />
              </p>
            </>
          ) : (
            <p className="s-acu-card-cap">
              <Br text={it.title ?? ''} marks={brs[i]?.pc ?? []} />
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- 3. 노하우(원형 사진 + 갈색 바탕) */
function KnowHow({ s }: { s: Section }) {
  return (
    <section className="s-acu-know" id={s.id} aria-labelledby={`${s.id}-t`}>
      <div className="cx-in">
        <figure className="s-acu-know-ph" data-rv="clip">
          <Img src={`${P}knowhow.jpg`} wh={[463, 463]} alt="약침 주사기를 들고 설명하는 의료진" />
        </figure>
        <span className="s-acu-know-ring" aria-hidden="true">
          <i />
        </span>
        <div className="s-acu-know-tx" data-rv="up">
          <p className="s-acu-know-eb">
            <Rich text={s.eyebrow ?? ''} />
          </p>
          <h2 className="s-acu-know-t" id={`${s.id}-t`}>
            <Rich text={s.title ?? ''} />
          </h2>
          {s.body?.map((b, i) => (
            <p key={i} className="s-acu-know-body">
              <Br text={b} marks={['의료진이', '진행합니다.']} kind="all" />
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 4. 경근약침 프로세스(지그재그) */
const STEP_BR = [['더 불편한지'], ['결과들을'], ['용량을'], ['소염진통과']];
function Process({ s }: { s: Section }) {
  return (
    <section className="s-acu-proc" id={s.id}>
      <div className="cx-in">
        <Head eb={s.itemsEyebrow} title={s.itemsTitle} />
        <ol className="s-acu-steps">
          {s.items?.map((it, i) => (
            <li key={i} className={`s-acu-step${i % 2 ? ' is-r' : ' is-l'}`}>
              <figure className="s-acu-step-ph" data-rv="clip">
                <Img src={`${P}step-${i + 1}.jpg`} wh={[593, 273]} alt={plain(it.title)} />
                <span className="s-acu-step-dot" aria-hidden="true" />
              </figure>
              <div className="s-acu-step-tx" data-rv="up">
                <h4>
                  <b>{it.num}</b>
                  <span>{it.title}</span>
                </h4>
                <p>
                  <Br text={it.text ?? ''} marks={STEP_BR[i] ?? []} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 5. 봉침 카드 2장(597×277) */
const BEE_BR = [['있습니다.', '제품보다'], ['입니다.', '흡수율을']];
function BeeCards({ s }: { s: Section }) {
  return (
    <ul className="s-acu-bee">
      {s.items?.map((it, i) => (
        <li key={i} className="s-acu-bee-card" data-rv="up" style={{ ['--d' as string]: `${i * 120}ms` }}>
          <figure className="s-acu-bee-ph">
            <Img src={`${P}bee-${i + 1}.jpg`} wh={[593, 273]} alt={plain(it.title)} className="s-acu-pc" />
            <Img src={`${P}m-bee-${i + 1}.jpg`} wh={[685, 273]} alt={plain(it.title)} className="s-acu-mo" />
          </figure>
          <h4 className="s-acu-bee-t">
            <Rich text={it.title ?? ''} />
          </h4>
          <p className="s-acu-bee-x">
            <Br text={it.text ?? ''} marks={BEE_BR[i]} />
          </p>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- 6·10. 육각형 4개 + 말풍선 상자 */
function HexRing() {
  // 링 R126(선) + 꼭짓점 점 r5 — viewBox 는 원본 px 그대로
  const R = 126;
  const pts = [0, 60, 120, 180, 240, 300].map((a) => [132 + R * Math.cos((a * Math.PI) / 180), 132 + R * Math.sin((a * Math.PI) / 180)] as const);
  return (
    <svg className="s-acu-hex-ring" viewBox="0 0 264 264" aria-hidden="true">
      <polygon points={pts.map((p) => p.join(',')).join(' ')} />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="5" />
      ))}
    </svg>
  );
}

function Hexes({ s, widths, moMarks, boxBr }: { s: Section; widths: number[]; moMarks?: string[]; boxBr?: string[][] }) {
  return (
    <>
      <Head eb={s.itemsEyebrow} title={s.itemsTitle} moMarks={moMarks} />
      <ul className="s-acu-hexes">
        {s.items?.map((it, i) => (
          <li key={i} className="s-acu-hex" data-rv="up" style={{ ['--d' as string]: `${i * 110}ms`, ['--bw' as string]: widths[i] }}>
            <p className="s-acu-hex-box">
              <Br text={it.text ?? ''} marks={boxBr?.[i] ?? []} />
            </p>
            <span className="s-acu-hex-dots" aria-hidden="true" />
            <div className="s-acu-hex-shape">
              <HexRing />
              <h4>
                <Rich text={it.title ?? ''} />
              </h4>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------------------------------------------------------------- 7. 적용질환 체크 목록 */
function Check() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M20 33.5l8.5 8.5L45 23" />
    </svg>
  );
}
function CheckList({ s }: { s: Section }) {
  return (
    <section className="s-acu-list" id={s.id}>
      <div className="cx-in">
        <Head eb={s.eyebrow} title={s.checklistTitle} moMarks={['생기게 하는']} />
        <ul className="s-acu-rows" data-rv="up">
          {s.checklist?.map((c, i) => (
            <li key={i} style={{ ['--d' as string]: `${i * 80}ms` }}>
              <i className="s-acu-row-ck">
                <Check />
              </i>
              <span>
                <Rich text={c} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 9. 자하거 안전성(흐린 사진 바탕 + 상자 5개) */
function Safety({ s }: { s: Section }) {
  return (
    <section className="s-acu-safe" id={s.id}>
      <div className="s-acu-safe-bg" aria-hidden="true" />
      <div className="cx-in">
        <Head eb={s.eyebrow} title={s.title} moMarks={['준수하며']} />
        <ul className="s-acu-safe-rows">
          {s.checklist?.map((c, i) => (
            <li key={i} data-rv="up" style={{ ['--d' as string]: `${i * 90}ms` }}>
              <Img src={`${P}safety-icon.jpg`} wh={[44, 40]} alt="" className="s-acu-safe-ic" />
              <span>
                <Rich text={c} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 페이지 */
export default function AcuPage() {
  const page = loadPage('sub_treatment_page01');
  const by = Object.fromEntries(page.sections.map((s) => [s.id, s])) as Record<string, Section>;
  const intro = by.intro;
  const gg = by.gyeonggeun;
  const know = by['know-how'];
  const proc = by['gyeonggeun-process'];
  const bee = by['bee-venom'];
  const beeFx = by['bee-venom-effects'];
  const beeList = by['bee-venom-indications'];
  const pla = by.placenta;
  const plaSafe = by['placenta-safety'];
  const plaFx = by['placenta-effects'];

  return (
    <div className={`cx s-acu ${serif.variable}`}>
      <Intro s={intro} />

      <Band s={gg} n={1} img="band-1" brk={{ body: ["'경근약침'", '강력한'] }}>
        <Head eb={gg.itemsEyebrow} title={gg.itemsTitle} moMarks={['약침을']} />
        <Cards3 s={gg} prefix="card1" brs={[{}, {}, {}, {}, { pc: ['허리디스크,'] }, { pc: ['수 없는'] }]} />
      </Band>

      <KnowHow s={know} />
      <Process s={proc} />

      <Band s={bee} n={2} img="band-2" brk={{ body: ['질병을', '폭넓게'], moLead: ['자극을 주어'] }}>
        <Head eb={bee.itemsEyebrow} title={bee.itemsTitle} moMarks={['치료하는']} />
        <BeeCards s={bee} />
      </Band>

      <section className="s-acu-hexsec s-acu-hexsec--bee" id={beeFx.id}>
        <div className="s-acu-hexbg" aria-hidden="true" />
        <div className="cx-in">
          <Hexes
            s={beeFx}
            widths={[321, 361, 371, 421]}
            moMarks={['거쳐']}
            boxBr={[['사라져'], ['있어'], ['회복시켜'], ['않는']]}
          />
        </div>
      </section>

      <CheckList s={beeList} />

      <Band s={pla} n={3} img="band-3" brk={{ body: ['건조한', '다양한'], moLead: ['추출하여'] }}>
        <Head eb={pla.itemsEyebrow} title={pla.itemsTitle} moMarks={['개선에']} />
        <Cards3
          s={pla}
          prefix="card3"
          wide
          brs={[{ pc: ['촉진 등'] }, { pc: ['막고'] }, { pc: ['증상을'] }, { pc: ['생산해주며'] }, { pc: ['효능으로'] }, { pc: ['존재하여'] }]}
        />
      </Band>

      <Safety s={plaSafe} />

      <section className="s-acu-hexsec s-acu-hexsec--pla" id={plaFx.id}>
        <div className="cx-in">
          <Hexes s={plaFx} widths={[254, 343, 311, 343]} moMarks={['체질을']} />
        </div>
      </section>
    </div>
  );
}

