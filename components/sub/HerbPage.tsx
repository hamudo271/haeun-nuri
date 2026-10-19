import { Fragment, type ReactNode } from 'react';
import Rich from '../Rich';
import Img from './Img';
import { loadPage } from '@/lib/content';
import './herb.css';

const IMG = '/img/sub/treatment-page04';

/**
 * 원고 문장은 한 글자도 바꾸지 않고, 원본 시안의 줄바꿈 자리에만 <br> 을 끼운다.
 * pc / mo: 각 줄의 끝 글자 묶음(앞에서부터 차례로 찾음). 두 시안이 같은 자리면 항상 줄바꿈,
 * 한쪽만이면 그 화면 폭에서만 보이는 <br>(CSS .s-hrb-bp / .s-hrb-bm).
 */
function Brk({ text, pc = [], mo = [] }: { text: string; pc?: string[]; mo?: string[] }) {
  const cuts = (ends: string[]) => {
    const out: number[] = [];
    let from = 0;
    for (const e of ends) {
      const i = text.indexOf(e, from);
      if (i < 0) continue;
      from = i + e.length;
      out.push(from);
    }
    return out;
  };
  const P = cuts(pc);
  const M = cuts(mo);
  const all = Array.from(new Set([...P, ...M])).sort((a, b) => a - b);
  const nodes: ReactNode[] = [];
  let prev = 0;
  all.forEach((c, k) => {
    nodes.push(<Fragment key={`t${k}`}>{text.slice(prev, c)}</Fragment>);
    const both = P.includes(c) && M.includes(c);
    nodes.push(<br key={`b${k}`} className={both ? undefined : P.includes(c) ? 's-hrb-bp' : 's-hrb-bm'} />);
    prev = c;
  });
  nodes.push(<Fragment key="end">{text.slice(prev)}</Fragment>);
  return <>{nodes}</>;
}

/* 장점 4개의 본문 줄바꿈(원본 PC 1920 / 모바일 750 시안에서 읽은 줄 끝) */
const ADV_BR: { pc: string[]; mo: string[] }[] = [
  { pc: ['한약입니다.'], mo: ['증상과', '의료용', '한약입니다.', '바탕으로', '치유를'] },
  { pc: ['한약재만을', '따른'], mo: ['규정에', '청정', '철저한', '약재로', '내성이', '의존성에'] },
  { pc: ['아닌', '체질에'], mo: ['약재라도', '사용하면', '개선', '있습니다.', '증상과', '한약재를', '없이'] },
  { pc: ['품질관리를'], mo: ['약재', '품질관리를', '모든'] },
];

/* 장점 4개의 좌표(원본 시안 px): PC 사진 x,y · 글 배지 top / 모바일 사진 y · 배지 top. side: 글이 사진의 어느 쪽인지 */
const ADV_POS = [
  { px: 76, py: 182, ty: 246, mpy: 205, mty: 251, side: 'r' },
  { px: 703, py: 460, ty: 537, mpy: 588, mty: 629, side: 'l' },
  { px: 76, py: 737, ty: 816, mpy: 996, mty: 1042, side: 'r' },
  { px: 703, py: 1013, ty: 1121, mpy: 1449, mty: 1490, side: 'l' },
];

function Check() {
  return (
    <svg className="s-hrb-ck" viewBox="0 0 24 19" aria-hidden="true">
      <path d="M2 9.5l7 7L22 2" />
    </svg>
  );
}

/** 사진 가장자리의 흰 원 + 금색 점 + 점선(글 쪽으로) */
function Dot() {
  return (
    <span className="s-hrb-dot" aria-hidden="true">
      <i />
    </span>
  );
}

/**
 * 한약치료(treatment/page04) — 원본 통이미지 sub03-04-01~05(1920 시안) / m_(750 시안)를 HTML/CSS 로 다시 그린 것.
 * 글은 전부 진짜 글자. 이미지는 사진·배경 결·육각 무늬뿐.
 */
export default function HerbPage() {
  const page = loadPage('sub_treatment_page04');
  const S = (id: string) => page.sections.find((s) => s.id === id)!;
  const intro = S('intro');
  const custom = S('custom-prescription');
  const adv = S('advantages');
  const eff = S('efficacy');
  const dec = S('decoction');

  return (
    <div className="s-hrb">
      {/* ------------------------------------------------------------ 1. 소개 */}
      <section className="s-hrb-a" aria-labelledby="s-hrb-a-t">
        <div className="s-hrb-in">
          <figure className="s-hrb-a-ph" data-rv="clip">
            <Img className="s-hrb-pc" src={`${IMG}/intro.jpg`} wh={[586, 392]} alt="한약 그릇과 약첩" eager />
            <Img className="s-hrb-mo" src={`${IMG}/intro-m.jpg`} wh={[689, 392]} alt="한약 그릇과 약첩" eager />
          </figure>
          <span className="s-hrb-mark s-hrb-a-mark" aria-hidden="true" />
          <div className="s-hrb-a-tx" data-rv="up">
            <p className="s-hrb-a-eb">{intro.eyebrow}</p>
            <h2 className="s-hrb-a-t" id="s-hrb-a-t">
              {intro.title}
            </h2>
            {intro.body?.map((b, i) => (
              <p key={i} className="s-hrb-a-body">
                <Brk text={b} pc={['치료합니다.', '개선하고,']} mo={['치료합니다.', '개선하고,']} />
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ 2. 나이/체질/체형 띠 + 체크리스트 */}
      <section className="s-hrb-b" aria-labelledby="s-hrb-b-t">
        <div className="s-hrb-band">
          <div className="s-hrb-in" data-rv="up">
            <h2 className="s-hrb-b-t" id="s-hrb-b-t">
              {custom.title}
            </h2>
            <p className="s-hrb-b-lead">
              <Brk text={custom.lead ?? ''} pc={['있습니다.']} mo={['되기도, 어떤 사람에게는', '체형, 체질에']} />
            </p>
          </div>
        </div>
        <div className="s-hrb-in">
          <div className="s-hrb-box">
            <header className="s-hrb-hd" data-rv="up">
              <p className="s-hrb-eb">{custom.eyebrow}</p>
              <h3 className="s-hrb-t2">
                <Rich text={custom.checklistTitle ?? ''} />
              </h3>
            </header>
            <ul className="s-hrb-chk" data-rv="up">
              {custom.checklist?.map((c, i) => (
                <li key={i}>
                  <span className="s-hrb-chk-i" aria-hidden="true">
                    <Check />
                  </span>
                  <span className="s-hrb-chk-x">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ 3. 장점 01~04 */}
      <section className="s-hrb-c" aria-labelledby="s-hrb-c-t">
        <div className="s-hrb-in">
          <header className="s-hrb-hd" data-rv="up">
            <p className="s-hrb-eb">{adv.itemsEyebrow}</p>
            <h2 className="s-hrb-t2" id="s-hrb-c-t">
              <Rich text={adv.itemsTitle ?? ''} />
            </h2>
          </header>
          <ol className="s-hrb-adv">
            {adv.items?.map((it, i) => {
              const p = ADV_POS[i];
              return (
                <li
                  key={i}
                  className={`s-hrb-adv-${p.side}`}
                  style={{
                    ['--px' as string]: p.px,
                    ['--py' as string]: p.py,
                    ['--ty' as string]: p.ty,
                    ['--mpy' as string]: p.mpy,
                    ['--mty' as string]: p.mty,
                  }}
                >
                  <figure className="s-hrb-adv-ph" data-rv="clip">
                    <Img className="s-hrb-pc" src={`${IMG}/adv-${i + 1}.jpg`} wh={[597, 277]} alt={it.title ?? ''} />
                    <Img className="s-hrb-mo" src={`${IMG}/adv-${i + 1}-m.jpg`} wh={[300, 276]} alt={it.title ?? ''} />
                    <Dot />
                  </figure>
                  <div className="s-hrb-adv-tx" data-rv="up">
                    <h3>
                      <b className="s-hrb-badge" aria-hidden="true">
                        {it.num}
                      </b>
                      <span>{it.title}</span>
                    </h3>
                    <p>
                      <Brk text={it.text ?? ''} pc={ADV_BR[i].pc} mo={ADV_BR[i].mo} />
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ 4. 효능 */}
      <section className="s-hrb-d" aria-labelledby="s-hrb-d-t">
        <span className="s-hrb-mark s-hrb-d-mark" aria-hidden="true" />
        <div className="s-hrb-in">
          <header className="s-hrb-d-hd" data-rv="up">
            <h2 className="s-hrb-d-t" id="s-hrb-d-t">
              {eff.title}
            </h2>
            <p className="s-hrb-d-lead">
              <Brk text={eff.lead ?? ''} pc={['필요합니다.']} mo={['있듯이,', '필요합니다.', '問切)과']} />
            </p>
          </header>
          <ul className="s-hrb-eff" data-rv="up">
            {eff.items?.map((it, i) => (
              <li key={i} style={{ ['--d' as string]: `${(i % 5) * 70}ms` }}>
                <span>{it.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ 5. 탕전 띠 */}
      <section className="s-hrb-e" aria-labelledby="s-hrb-e-t">
        <div className="s-hrb-in" data-rv="up">
          <p className="s-hrb-e-eb">{dec.eyebrow}</p>
          <h2 className="s-hrb-e-t" id="s-hrb-e-t">
            {dec.title}
          </h2>
          <span className="s-hrb-e-bar" aria-hidden="true" />
          <p className="s-hrb-e-lead">
            <Brk text={dec.lead ?? ''} pc={['통과한']} mo={['통과한']} />
          </p>
        </div>
      </section>
    </div>
  );
}
