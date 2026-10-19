import { Fragment } from 'react';
import Img from './Img';
import raw from '@/content/sub_hospital_page02.json';
import type { Page, Section, Item } from '@/lib/content';
import lib from '@/lib/sub_hospital_page02.json';
import '../clinic/clinic.css';
import './admission.css';

/**
 * 입원절차 안내(hospital/page02) — 원본(글·통이미지 혼합)을 HTML/CSS 로 다시 그린 것.
 * 원본 1920px 시안 좌표를 그대로 옮겼고(가운데 1300px, --u), 1023px 이하는 모바일 750 시안(--m) 기준.
 * 글은 모두 진짜 글자. 이미지는 사진·일러스트·바탕 사진뿐이다.
 */

const IMG = '/img/sub/hospital-page02';
const data = raw as unknown as Page;
type Sec = Section;
const sec = (id: string) => data.sections.find((s) => s.id === id) as Sec;

const plain = (t?: string) => (t ?? '').replace(/\*\*/g, '').replace(/\n/g, ' ');

/** 원고의 **강조** → 금색, \n → 줄바꿈. 줄바꿈 앞에 빈칸을 두어 모바일에서 <br> 을 숨겨도 낱말이 붙지 않게 한다 */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((ln, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <>
              {' '}
              <br />
            </>
          )}
          {ln.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? <em key={j}>{part.slice(2, -2)}</em> : <Fragment key={j}>{part}</Fragment>,
          )}
        </Fragment>
      ))}
    </>
  );
}

/** 아이콘: 원본에서 윤곽선을 딴 path (lib/sub_hospital_page02.json) 를 CSS 색으로 칠한다 */
function Icon({ name, className }: { name: keyof typeof lib.icons; className?: string }) {
  const ic = lib.icons[name];
  return (
    <svg className={className} viewBox={`0 0 ${ic.w} ${ic.h}`} aria-hidden="true">
      <path d={ic.d} fillRule="evenodd" />
    </svg>
  );
}

/* 소제목 + 제목 + 요약(원본 통이미지 01·02·05·06 의 머리글) */
function Head({ s, className = '', keepBr = false }: { s: Sec; className?: string; keepBr?: boolean }) {
  return (
    <header className={`s-adm-hd ${className}`} data-rv="up">
      <span className="s-adm-bar" aria-hidden="true" />
      {s.eyebrow && (
        <p className="s-adm-eb">
          <Rich text={s.eyebrow} />
        </p>
      )}
      <h2 className="s-adm-t">
        <Rich text={s.title ?? ''} />
      </h2>
      {s.lead && (
        <p className={`s-adm-lead${keepBr ? ' s-adm-keepbr' : ''}`}>
          <Rich text={s.lead} />
        </p>
      )}
    </header>
  );
}

/* ---------------------------------------------------------------- 1. ONE-STOP + 원 3개 */
function OneStop() {
  const s = sec('one-stop');
  const p = sec('promises');
  const icons: (keyof typeof lib.icons)[] = ['plus', 'user', 'mac'];
  return (
    <section className="s-adm-top" id="one-stop">
      <div className="cx-in">
        <Head s={s} />
        <ul className="s-adm-pill" data-rv="up">
          {(p.items ?? []).map((it: Item, i) => (
            <li key={i} className={`s-adm-circle s-adm-circle--${i + 1}`} style={{ ['--d' as string]: `${i * 100}ms` }}>
              <Icon name={icons[i]} className="s-adm-ci" />
              <h3>
                <Rich text={it.title ?? ''} />
              </h3>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 2. 맞춤 집중 입원 케어 + 치료 카드 4 */
function Care() {
  const s = sec('custom-care');
  const t = sec('treatments');
  return (
    <section className="s-adm-care" id="custom-care">
      <div className="cx-in">
        <Head s={s} keepBr />
        <ul className="s-adm-cares">
          {(t.items ?? []).map((it: Item, i) => (
            <li key={i} data-rv="up" style={{ ['--d' as string]: `${(i % 2) * 90}ms` }}>
              <a href={it.href} className="s-adm-care-card">
                <Img src={`${IMG}/care-${i + 1}.jpg`} wh={[637, 306]} alt="" />
                <span className="s-adm-care-tx">
                  <span className="s-adm-care-en">{it.eyebrow}</span>
                  <strong>{it.title}</strong>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 3. 입원치료 특별함(검은 띠) */
function Special() {
  const s = sec('special');
  return (
    <section className="s-adm-dark" id="special">
      <div className="cx-in">
        <div className="s-adm-dark-hd" data-rv="up">
          <h2 className="s-adm-dark-t">
            <Rich text={s.title ?? ''} />
          </h2>
          <p className="s-adm-dark-lead">
            <Rich text={s.lead ?? ''} />
          </p>
        </div>
        <ul className="s-adm-rooms">
          {(s.items ?? []).map((it: Item, i) => (
            <li key={i} data-rv="up" style={{ ['--d' as string]: `${(i % 2) * 90}ms` }}>
              <figure className="s-adm-room-ph">
                <Img src={`${IMG}/room-${i + 1}.jpg`} wh={[547, 295]} alt="" />
              </figure>
              <div className="s-adm-room-box">
                <h3>{it.title}</h3>
                <p>{it.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {/* 원본처럼 5초마다 다음 카드로(마우스를 올리면 멈춤). 손으로도 밀 수 있다 */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){var s=document.querySelector('.s-adm-rooms');if(!s)return;var n=0,h=false;s.addEventListener('mouseenter',function(){h=true});s.addEventListener('mouseleave',function(){h=false});s.addEventListener('touchstart',function(){h=true},{passive:true});setInterval(function(){if(h||document.hidden)return;var c=s.children,w=c[0].offsetWidth,g=c.length>1?c[1].offsetLeft-c[0].offsetLeft-w:0,v=Math.max(1,Math.round((s.clientWidth+g)/(w+g)));n=(n+1)%(c.length-v+1);s.scrollTo({left:(w+g)*n,behavior:'smooth'})},5000)})();",
        }}
      />
    </section>
  );
}

/* ---------------------------------------------------------------- 4. 교통사고 한방치료비(입원실 사진 띠) */
function Insurance() {
  const s = sec('insurance');
  return (
    <section className="s-adm-band" id="insurance">
      <picture className="s-adm-band-bg">
        <source media="(max-width: 1023px)" srcSet={`${IMG}/band-m.webp`} type="image/webp" />
        <source media="(max-width: 1023px)" srcSet={`${IMG}/band-m.jpg`} />
        <source srcSet={`${IMG}/band.webp`} type="image/webp" />
        <img src={`${IMG}/band.jpg`} alt="" width={1920} height={731} loading="lazy" decoding="async" />
      </picture>
      <div className="cx-in">
        <h2 className="s-adm-band-t" data-rv="up">
          <Rich text={s.title ?? ''} />
        </h2>
        <div className="s-adm-box" data-rv="up">
          <p className="s-adm-box-eb">
            <Icon name="alert" className="s-adm-alert" />
            <span>
              <Rich text={s.itemsEyebrow ?? ''} />
            </span>
          </p>
          <p className="s-adm-box-t">
            <Rich text={s.itemsTitle ?? ''} />
          </p>
          <ul className="s-adm-pills">
            {(s.items ?? []).map((it: Item, i) => (
              <li key={i}>{it.title}</li>
            ))}
          </ul>
          <p className="s-adm-box-chk">
            <Icon name="clip" className="s-adm-clip" />
            <span>
              <Rich text={(s.checklist ?? []).join('\n')} />
            </span>
          </p>
          <Img className="s-adm-woman" src={`${IMG}/woman.jpg`} wh={[188, 233]} alt="" />
          <Img className="s-adm-doctor" src={`${IMG}/doctor.jpg`} wh={[184, 247]} alt="" />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 5. 버틀러 서비스 카드 5 */
function Butler() {
  const s = sec('butler');
  const icons: (keyof typeof lib.icons)[] = ['doc', 'car', 'coin', 'bed', 'hosp'];
  return (
    <section className="s-adm-butler" id="butler">
      <div className="cx-in">
        <Head s={s} />
        <ol className="s-adm-bcards">
          {(s.items ?? []).map((it: Item, i) => (
            <li key={i} data-rv="up" style={{ ['--d' as string]: `${(i % 3) * 90}ms` }}>
              <Icon name={icons[i]} className="s-adm-bi" />
              <div>
                <h3>
                  {it.num}. {it.title}
                </h3>
                <p>
                  <Rich text={it.text ?? ''} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 6. 입원절차 및 치료 과정(원 4개 흐름도) */
function Process() {
  const s = sec('process');
  return (
    <section className="s-adm-proc" id="process">
      <div className="cx-in">
        <Head s={s} keepBr />
        <ol className="s-adm-flow" data-rv="up">
          {(s.items ?? []).map((it: Item, i) => (
            <li key={i} className={i === 2 ? 'is-key' : ''}>
              <div className="s-adm-fc">
                <b>{it.num}</b>
                <strong>{it.title}</strong>
              </div>
              <p>{it.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 7. STEP 탭(라디오로만 전환, 스크립트 없음) */
function Steps() {
  const s = sec('steps');
  const items: Item[] = s.items ?? [];
  return (
    <section className="s-adm-steps" id="steps">
      <div className="cx-in">
        <div className="s-adm-tabs">
          {items.map((it, i) => (
            <input key={i} type="radio" name="s-adm-step" id={`s-adm-st${i + 1}`} defaultChecked={i === 0} aria-label={`STEP ${it.num} ${it.title}`} />
          ))}
          <div className="s-adm-tabbar" role="tablist" aria-label="입원 단계">
            {items.map((it, i) => (
              <label key={i} htmlFor={`s-adm-st${i + 1}`} role="tab">
                <span>STEP</span>
                <span>{it.num}</span>
              </label>
            ))}
          </div>
          <div className="s-adm-panes">
            {items.map((it, i) => (
              <div key={i} className="s-adm-pane" data-pane={i} role="tabpanel">
                <div className="s-adm-step-tx">
                  <h3>
                    <b>STEP {it.num}.</b> {it.title}
                  </h3>
                  <ul>
                    {(it.text ?? '').split('\n').map((ln, k) => (
                      <li key={k}>{ln}</li>
                    ))}
                  </ul>
                </div>
                <figure className="s-adm-step-ph">
                  <Img src={`${IMG}/step-${i + 1}.jpg`} wh={[563, 305]} alt={plain(it.title)} />
                </figure>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AdmissionPage() {
  return (
    <div className="cx s-adm">
      <OneStop />
      <Care />
      <Special />
      <Insurance />
      <Butler />
      <Process />
      <Steps />
    </div>
  );
}
