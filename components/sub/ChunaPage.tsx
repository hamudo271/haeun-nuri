import type { CSSProperties } from 'react';
import Rich from '../Rich';
import { loadPage, type Section } from '@/lib/content';
import ph from '@/lib/sub_treatment_page02.json';
import '../clinic/clinic.css';
import './chuna.css';

/**
 * 추나요법(treatment/page02) — 원본 통이미지 5장(sub03-02-01~05)을 HTML/CSS 로 다시 그린 화면.
 * 좌표·크기는 원본 1920px 시안 그대로(가운데 1300px 기준, --u 로 비례 축소), 1023px 이하는 모바일 시안(750px, --m).
 * 이미지는 사진·아이콘·도해·무늬뿐이고 글자는 모두 진짜 글자다.
 */

type Photo = { src: string; wh: number[] };
type Hex = Photo & { discs: (number | string)[][] };
const P = ph as unknown as Record<string, Photo> & { badge: number[]; mBadge: number[]; hexNeck: Hex; hexBack: Hex; mHexNeck: Hex; mHexBack: Hex };

const webp = (s: string) => s.replace(/\.jpg$/, '.webp');
const plain = (t?: string) => (t ?? '').replace(/\*\*/g, '').replace(/\n/g, ' ');
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

/** PC 사진 + (있으면) 모바일 사진. 모바일 시안은 사진을 다르게 잘라 써서 따로 받는다 */
function Pic({ pc, mo, alt = '', eager, className }: { pc: Photo; mo?: Photo; alt?: string; eager?: boolean; className?: string }) {
  return (
    <picture>
      {mo && <source media="(max-width: 1023px)" srcSet={webp(mo.src)} type="image/webp" width={mo.wh[0]} height={mo.wh[1]} />}
      {mo && <source media="(max-width: 1023px)" srcSet={mo.src} width={mo.wh[0]} height={mo.wh[1]} />}
      <source srcSet={webp(pc.src)} type="image/webp" />
      <img className={className} src={pc.src} alt={alt} width={pc.wh[0]} height={pc.wh[1]} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </picture>
  );
}

/** 원본의 육각 로고 무늬(선만) — 벡터 마스크에 색을 입힌다 */
function Mark({ className }: { className: string }) {
  return <i className={className} aria-hidden="true" />;
}

/* ---------------------------------------------------------------- 1. 소개 */
function Intro({ s }: { s: Section }) {
  return (
    <section className="s-chu-intro">
      <div className="cx-in">
        <figure className="s-chu-intro-ph" data-rv="clip">
          <Pic pc={P.intro} mo={P.mIntro} alt="추나요법 시술 장면" eager />
        </figure>
        <div className="s-chu-intro-tx">
          <Mark className="s-chu-wm" />
          <p className="s-chu-intro-eb" data-rv="up">
            {s.eyebrow}
          </p>
          <h2 className="s-chu-intro-t" data-rv="up">
            {s.title}
          </h2>
          {s.body?.map((b, i) => (
            <p key={i} className="s-chu-intro-x" data-rv="up" style={{ ['--d' as string]: '120ms' }}>
              {splitLines(b, ['이용하여 ', '만들어 '])}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 2. 건강보험 띠 */
function Insurance({ s }: { s: Section }) {
  const [, rest] = (s.badge ?? '').split('본인부담률');
  const [lo, hi] = (rest ?? '').split('~').map((t) => t.trim().replace('%', ''));
  return (
    <section className="s-chu-ins">
      <div className="s-chu-bg" aria-hidden="true">
        <Pic pc={P.band} mo={P.mBand} />
      </div>
      <div className="cx-in">
        <h2 className="s-chu-ins-t" data-rv="up">
          {richMo(s.title ?? '', '** ')}
        </h2>
        <span className="s-chu-ins-bar" aria-hidden="true" />
        <p className="s-chu-ins-lead" data-rv="up">
          {(s.lead ?? '').split(/(?<=,) /).map((ln, i) => (
            <span key={i} className="s-chu-ln">
              <Rich text={ln} />
            </span>
          ))}
        </p>
        <p className="s-chu-ins-note" data-rv="up">
          {s.note}
        </p>
        <p className="s-chu-badge" data-rv="zoom" aria-label={s.badge}>
          <span className="s-chu-badge-k">본인부담률</span>
          <span className="s-chu-badge-a">
            {lo}
            <small>%</small>
          </span>
          <span className="s-chu-badge-b">
            <small className="s-chu-tilde">~ </small>
            {hi}
            <small>%</small>
          </span>
          <i className="s-chu-arrow" aria-hidden="true" />
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 3. 숙련도(원형 사진) */
function Skill({ s }: { s: Section }) {
  return (
    <section className="s-chu-skill">
      <div className="cx-in">
        <div className="s-chu-skill-ph">
          <figure data-rv="zoom">
            <Pic pc={P.skill} alt="경추 모형을 든 한의사의 손" />
          </figure>
          <i className="s-chu-ring" aria-hidden="true" />
        </div>
        <div className="s-chu-skill-tx">
          <p className="s-chu-skill-eb" data-rv="up">
            {s.eyebrow}
          </p>
          <h2 className="s-chu-skill-t" data-rv="up">
            <Rich text={s.title ?? ''} />
          </h2>
          {s.body?.map((b, i) => (
            <p key={i} className="s-chu-skill-x" data-rv="up" style={{ ['--d' as string]: '120ms' }}>
              {splitLines(b, ['찾아내 ', '치료로, '])}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 모바일 시안에서만 줄을 바꾸는 자리 — PC 에서는 숨은 <br>(.s-chu-mbr) */
function MoBr() {
  return <br className="s-chu-mbr" />;
}

/** `after`(끝에 공백 포함) 뒤에서 모바일 줄바꿈. 글자는 그대로, 공백 자리만 <br> 로 */
function richMo(text: string, after?: string) {
  const k = after ? text.indexOf(after) : -1;
  if (k < 0 || !after) return <Rich text={text} />;
  return (
    <>
      <Rich text={text.slice(0, k + after.length - 1)} />
      <MoBr />{' '}
      <Rich text={text.slice(k + after.length)} />
    </>
  );
}

/** 원본 줄바꿈 자리(PC)에서 끊는다(.s-chu-ln = block). mo: 그 줄 안에서 모바일에서만 더 끊는 자리 */
function splitLines(text: string, after: string[], mo: string[] = []) {
  const out: string[] = [];
  let rest = text;
  for (const a of after) {
    const k = rest.indexOf(a);
    if (k < 0) continue;
    out.push(rest.slice(0, k + a.length - 1));
    rest = rest.slice(k + a.length);
  }
  out.push(rest);
  return out.map((t, i) => (
    <span key={i} className="s-chu-ln">
      {i > 0 && ' '}
      {richMo(t, mo.find((m) => t.includes(m)))}
    </span>
  ));
}

/* ---------------------------------------------------------------- 머리글(금색 막대 소제목 + 제목 + 가는 선) */
function Head({ eb, t, id, mo }: { eb?: string; t?: string; id?: string; mo?: string }) {
  return (
    <header className="s-chu-hd" data-rv="up">
      <p className="s-chu-hd-eb">{eb}</p>
      <h3 className="s-chu-hd-t" id={id}>
        {richMo(t ?? '', mo)}
      </h3>
    </header>
  );
}

/* ---------------------------------------------------------------- 4. 특징 목록 */
/** 모바일 시안에서 두 줄인 항목(4번째)의 줄바꿈 자리 */
const CHK_MO: (string | undefined)[] = [undefined, undefined, undefined, '비수술적 '];
function Features({ s }: { s: Section }) {
  return (
    <section className="s-chu-list">
      <div className="s-chu-list-bg" aria-hidden="true">
        <Pic pc={P.listBg} mo={P.mListBg} />
      </div>
      <div className="cx-in">
        <Head eb={s.eyebrow} t={s.title} />
        <ul className="s-chu-chk">
          {s.checklist?.map((c, i) => (
            <li key={i} data-rv="up" style={{ ['--d' as string]: `${i * 70}ms` }}>
              <Mark className="s-chu-ic" />
              <span>{richMo(c, CHK_MO[i])}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 5. 적용 질환 카드 */
const ICONS = ['neck', 'spine', 'knee', 'pelvis', 'car', 'child'];
/** 카드 이름표: 모바일 시안의 줄바꿈 자리 */
const CAP_MO = ['거북목, ', '디스크, ', '무릎통증, ', '골반, '];
function Cards({ s }: { s: Section }) {
  return (
    <section className="s-chu-cards">
      <div className="s-chu-band">
        <div className="s-chu-bg" aria-hidden="true">
          <Pic pc={P.cardsBand} mo={P.mCardsBand} />
        </div>
        <div className="cx-in">
          <h2 className="s-chu-band-t" data-rv="up">
            {s.title}
          </h2>
          <p className="s-chu-band-x" data-rv="up">
            {splitLines(s.lead ?? '', ['치료방법입니다. '], ['무릎 등 '])}
          </p>
        </div>
      </div>
      <div className="s-chu-box">
        <ul className="s-chu-cardl">
          {s.items?.map((it, i) => (
            <li key={i} data-rv="up" style={{ ['--d' as string]: `${(i % 3) * 90}ms` }}>
              <Pic pc={P['ic-' + ICONS[i]]} mo={P['m-ic-' + ICONS[i]]} alt="" />
              <p>{richMo(it.title ?? '', CAP_MO[i])}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 6. 질환(사진 + 제목/태그 + 설명) */
function Disease({ s, photo, mphoto }: { s: Section; photo: Photo; mphoto: Photo }) {
  return (
    <article className="s-chu-dz" id={s.id} aria-labelledby={`${s.id}-t`}>
      <div className="cx-in">
        <figure className="s-chu-dz-ph" data-rv="clip">
          <Pic pc={photo} mo={mphoto} alt={plain(s.title)} />
        </figure>
        <div className="s-chu-dz-row">
          <div className="s-chu-dz-l" data-rv="up">
            <h2 className="s-chu-dz-t" id={`${s.id}-t`}>
              {s.title}
            </h2>
            <ul className="s-chu-tags">
              {s.tags?.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="s-chu-dz-r" data-rv="up" style={{ ['--d' as string]: '120ms' }}>
            <p className="s-chu-dz-lead">{s.lead}</p>
            {s.body?.map((b, i) => (
              <p key={i} className="s-chu-dz-x">
                {b}
              </p>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------------- 7. 증상 육각 도해 + 설명 */
function Symptoms({ s, hex, mhex, mo, coMo }: { s: Section; hex: Hex; mhex: Hex; mo?: string; coMo?: string }) {
  const [W, H] = hex.wh;
  const [mW, mH] = mhex.wh;
  return (
    <section className="s-chu-sym" aria-label={plain(s.itemsTitle)}>
      <div className="cx-in">
        <Head eb={s.itemsEyebrow} t={s.itemsTitle} mo={mo} />
        <div className="s-chu-sym-row">
          <div className="s-chu-hex" data-rv="zoom">
            <Pic pc={hex} mo={mhex} alt="" />
            <ul>
              {s.items?.map((it, i) => {
                const [x, y, r, col] = hex.discs[i] as [number, number, number, string];
                const [mx, my, mr] = mhex.discs[i] as [number, number, number, string];
                const st = {
                  '--x': pct(x - r, W),
                  '--y': pct(y - r, H),
                  '--w': pct(2 * r, W),
                  '--mx': pct(mx - mr, mW),
                  '--my': pct(my - mr, mH),
                  '--mw': pct(2 * mr, mW),
                  '--c': col,
                } as CSSProperties;
                return (
                  <li key={i} style={st}>
                    <span>
                      <Rich text={it.title ?? ''} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          {s.callout && (
            <div className="s-chu-co" data-rv="up">
              <p className="s-chu-co-eb">{s.callout.eyebrow}</p>
              <h3 className="s-chu-co-t">
                <Rich text={s.callout.title ?? ''} />
              </h3>
              <p className="s-chu-co-x">{richMo(s.callout.text ?? '', coMo)}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function ChunaPage() {
  const page = loadPage('sub_treatment_page02');
  const by = (id: string) => page.sections.find((x) => x.id === id) as Section;
  return (
    <div className="cx s-chu">
      <Intro s={by('intro')} />
      <Insurance s={by('insurance')} />
      <Skill s={by('skill')} />
      <Features s={by('chuna-features')} />
      <Cards s={by('indications')} />
      <div className="s-chu-dzs">
        <Disease s={by('forward-head')} photo={P.neck} mphoto={P.mNeck} />
        <Symptoms s={by('forward-head-symptoms')} hex={P.hexNeck} mhex={P.mHexNeck} />
        <Disease s={by('lumbar-disc')} photo={P.back} mphoto={P.mBack} />
        <Symptoms s={by('lumbar-disc-symptoms')} hex={P.hexBack} mhex={P.mHexBack} mo="풀어주고 " coMo="과정에서 " />
      </div>
    </div>
  );
}
