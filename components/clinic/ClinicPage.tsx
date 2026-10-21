import Rich from '../Rich';
import ClinicTabs from './ClinicTabs';
import type { ClinicPage as Page, ClinicSection, ClinicItem } from '@/lib/clinic';
import './clinic.css';

/* 소개 제목(원본: 굵은 명조) — 빌드 때 받아 같은 서버에서 내보냄 */
// 명조(Noto Serif KR)는 자체 부분 글꼴('HN KSerif', app/globals.css · scripts/fonts/subset.py) — 구글 폰트 CSS(렌더링 차단) 없이 같은 글꼴

/**
 * 진료과목 상세 — 원본 통이미지 디자인을 HTML/CSS 로 다시 그린 것.
 * 원본 1920px 시안의 좌표·글자 크기를 그대로 옮겼다(가운데 1300px 기준, CSS 변수 --u 로 비례 축소).
 * 글은 모두 진짜 글자라 검색·AI·화면 낭독기가 읽는다.
 */

function Img({ src, wh, alt = '', eager = false, className }: { src: string; wh: [number, number]; alt?: string; eager?: boolean; className?: string }) {
  return (
    <picture>
      <source srcSet={src.replace(/\.jpg$/, '.webp')} type="image/webp" />
      <img className={className} src={src} alt={alt} width={wh[0]} height={wh[1]} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </picture>
  );
}

const plain = (t?: string) => (t ?? '').replace(/\*\*/g, '').replace(/\n/g, ' ');

function Check() {
  return (
    <svg className="cx-ck" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="13" />
      <path d="M7.6 13.4l3.6 3.5 7.2-7.4" />
    </svg>
  );
}

/* ---------------------------------------------------------------- 소개 */
function Intro({ s }: { s: ClinicSection }) {
  return (
    <section className="cx-intro">
      <div className="cx-in">
        <h2 className="cx-intro-t" data-rv="up">
          {(s.title ?? '').split('\n').map((ln, i) => (
            <span key={i} className="cx-ln">
              {i > 0 && ' '}
              <Rich text={ln} />
            </span>
          ))}
        </h2>
        <div className="cx-intro-r">
          {s.lead && (
            <p className="cx-intro-lead" data-rv="up">
              <Rich text={s.lead} />
            </p>
          )}
          {s.body?.map((b, i) => (
            <p key={i} className="cx-intro-body" data-rv="up">
              <Rich text={b} />
            </p>
          ))}
          {s.photo && (
            <figure className="cx-intro-ph" data-rv="clip">
              <Img src={s.photo.src} wh={s.photo.wh} alt={plain(s.title)} eager />
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 치료 카드 */
// 카드 제목이 가리키는 치료 페이지 — 질환 설명에서 치료 상세로 이어지는 내부 링크(검색엔진이 주제 연결을 따라간다)
const TREAT_HREF: [RegExp, string][] = [
  [/약침|봉침/, '/sub/treatment/page01/'],
  [/추나/, '/sub/treatment/page02/'],
  [/매선/, '/sub/treatment/page03/'],
  [/한약/, '/sub/treatment/page04/'],
];
const treatHref = (title?: string) => title && TREAT_HREF.find(([re]) => re.test(title))?.[1];

function Cards({ items, layout, h = 'h4' }: { items: ClinicItem[]; layout: 'v' | 'h'; h?: 'h3' | 'h4' }) {
  const H = h;
  return (
    <ul className={`cx-cards cx-cards--${layout}`}>
      {items.map((it, i) => (
        <li key={i} className="cx-card" data-rv="up" style={{ ['--d' as string]: `${(i % (layout === 'h' ? 2 : 3)) * 90}ms` }}>
          <figure className="cx-cp">
            {it.photo && (
              <span className="cx-cp-in">
                <Img src={it.photo.src} wh={it.photo.wh} alt={plain(it.title)} />
              </span>
            )}
            {it.num && (
              <span className="cx-badge" aria-hidden="true">
                {it.num}
              </span>
            )}
          </figure>
          <div className="cx-ct">
            {it.title && (
              <H className="cx-ct-t">
                {treatHref(it.title) ? (
                  <a href={treatHref(it.title)} className="cx-ct-link">
                    <Rich text={it.title} />
                  </a>
                ) : (
                  <Rich text={it.title} />
                )}
              </H>
            )}
            {it.text && (
              <p className="cx-ct-x">
                <Rich text={it.text} />
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Treat({ s }: { s: ClinicSection }) {
  if (!s.items.length) return null;
  return (
    <div className="cx-tr">
      <div className="cx-in">
        <header className="cx-hd" data-rv="up">
          {s.itemsEyebrow && (
            <p className="cx-eb">
              <Rich text={s.itemsEyebrow} />
            </p>
          )}
          {s.itemsTitle && (
            <h3 className="cx-t2">
              <Rich text={s.itemsTitle} />
            </h3>
          )}
        </header>
        <Cards items={s.items} layout={s.items.length === 4 ? 'h' : 'v'} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 질환 블록 */
function Disease({ s }: { s: ClinicSection }) {
  return (
    <article className="cx-dz" id={s.id} aria-labelledby={`${s.id}-t`}>
      <div className="cx-in">
        <header className="cx-hd" data-rv="up">
          {s.eyebrow && (
            <p className="cx-eb">
              <Rich text={s.eyebrow} />
            </p>
          )}
          <h2 className="cx-t" id={`${s.id}-t`}>
            <Rich text={s.title ?? ''} />
          </h2>
        </header>
        <div className={`cx-stage${s.checklist?.length ? '' : ' no-check'}`}>
          {s.photo && (
            <figure className="cx-ph" data-rv="clip">
              <Img src={s.photo.src} wh={s.photo.wh} alt={plain(s.title)} />
            </figure>
          )}
          {s.callout && (
            <aside
              className="cx-co"
              data-rv="up"
              style={{ ['--d' as string]: '160ms', ...(s.co ? { ['--co-x' as string]: s.co.x, ['--co-w' as string]: s.co.w } : {}) }}
            >
              {s.callout.eyebrow && (
                <p className="cx-co-eb">
                  <Rich text={s.callout.eyebrow} />
                </p>
              )}
              {s.callout.title && (
                <p className="cx-co-t">
                  <Rich text={s.callout.title} />
                </p>
              )}
              {s.callout.text && (
                <p className="cx-co-x">
                  <Rich text={s.callout.text} />
                </p>
              )}
            </aside>
          )}
          {!!s.checklist?.length && (
            <div className="cx-chk" data-rv="up">
              {s.checklistTitle && (
                <p className="cx-chk-t">
                  {/* 원고에 강조 표시가 빠진 블록(내과·여성)도 원본처럼 앞 구절을 금색으로 */}
                  <Rich text={s.checklistTitle.includes('**') ? s.checklistTitle : s.checklistTitle.replace(/^(이런 증상이 있다면)/, '**$1**')} />
                </p>
              )}
              <ul>
                {s.checklist.map((c, i) => (
                  <li key={i}>
                    <Check />
                    <span>
                      <Rich text={c} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <Treat s={s} />
    </article>
  );
}

/* ---------------------------------------------------------------- 일반 카드 묶음(다이어트 치료 등) */
function CardBlock({ s, band }: { s: ClinicSection; band?: boolean }) {
  return (
    <section className={`cx-cardsec${band ? ' cx-silk' : ''}`} id={s.id} style={s.band ? { backgroundImage: `url(${s.band.src.replace(/\.jpg$/, '.webp')})` } : undefined}>
      <div className="cx-in">
        <header className="cx-hd" data-rv="up">
          {s.eyebrow && (
            <p className="cx-eb">
              <Rich text={s.eyebrow} />
            </p>
          )}
          <h2 className="cx-t2">
            <Rich text={s.title ?? ''} />
          </h2>
        </header>
        <Cards items={s.items} layout={s.items.length === 4 ? 'h' : 'v'} h="h3" />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 자동차사고 전용 */
function Eohyeol({ s }: { s: ClinicSection }) {
  return (
    <section className="cx-eo" id={s.id} style={s.band ? { backgroundImage: `url(${s.band.src.replace(/\.jpg$/, '.webp')})` } : undefined}>
      <div className="cx-in">
        <header className="cx-hd" data-rv="up">
          <p className="cx-eb">
            <Rich text={s.eyebrow ?? ''} />
          </p>
          <h2 className="cx-t2">
            <Rich text={s.title ?? ''} />
          </h2>
          <span className="cx-bar" aria-hidden="true" />
        </header>
        {s.body?.map((b, i) => (
          <p key={i} className="cx-eo-x" data-rv="up">
            <Rich text={b} />
          </p>
        ))}
        {s.photo && (
          <figure className="cx-eo-ph" data-rv="up">
            <Img src={s.photo.src} wh={s.photo.wh} alt="혈관 속에 뭉친 어혈 그림" />
            <span className="cx-eo-line" aria-hidden="true" />
          </figure>
        )}
        {s.callout?.text && (
          <p className="cx-eo-box" data-rv="up">
            <Rich text={s.callout.text} />
          </p>
        )}
      </div>
    </section>
  );
}

function Symptoms({ s }: { s: ClinicSection }) {
  return (
    <section className="cx-sym" id={s.id}>
      <div className="cx-in">
        <header className="cx-hd" data-rv="up">
          <p className="cx-eb">
            <Rich text={s.eyebrow ?? ''} />
          </p>
          <h2 className="cx-t2">
            <Rich text={s.title ?? ''} />
          </h2>
        </header>
        <ul className="cx-sym-list">
          {s.items.map((it, i) => (
            <li key={i} data-rv="up" style={{ ['--d' as string]: `${i * 100}ms` }}>
              <figure>
                {it.photo && <Img src={it.photo.src} wh={it.photo.wh} alt={plain(it.title)} />}
                <span className="cx-sym-tag">
                  {it.num}. {it.title}
                </span>
              </figure>
              <p>
                <Rich text={it.text ?? ''} />
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Timeline({ s }: { s: ClinicSection }) {
  return (
    <section className="cx-tl" id={s.id} style={s.band ? { backgroundImage: `url(${s.band.src.replace(/\.jpg$/, '.webp')})` } : undefined}>
      <div className="cx-in">
        <span className="cx-tl-mark" aria-hidden="true" />
        <h2 className="cx-tl-t" data-rv="up">
          {(s.title ?? '').split('\n').map((ln, i) => (
            <span key={i} className="cx-ln">
              {i > 0 && ' '}
              <Rich text={ln} />
            </span>
          ))}
        </h2>
        <ol className="cx-tl-row" data-rv="up">
          {s.items.map((it, i) =>
            i % 2 === 0 ? (
              <li key={i} className={`cx-tl-c${(it.title ?? '').includes('**') ? ' is-key' : ''}`}>
                <span>
                  <Rich text={(it.title ?? '').replace(/\*\*/g, '')} />
                </span>
              </li>
            ) : (
              <li key={i} className="cx-tl-l">
                <strong>{it.title}</strong>
                <span>{it.text}</span>
              </li>
            ),
          )}
        </ol>
      </div>
    </section>
  );
}

function Process({ s }: { s: ClinicSection }) {
  return (
    <section className="cx-pr" id={s.id}>
      <div className="cx-in">
        <header className="cx-hd" data-rv="up">
          <p className="cx-eb">
            <Rich text={s.eyebrow ?? ''} />
          </p>
          <h2 className="cx-t2">
            <Rich text={s.title ?? ''} />
          </h2>
          <span className="cx-bar" aria-hidden="true" />
          {s.lead && (
            <p className="cx-pr-lead">
              <Rich text={s.lead} />
            </p>
          )}
        </header>
        <ol className="cx-pr-list">
          {s.items.map((it, i) => (
            <li key={i} className={i % 2 ? 'is-r' : 'is-l'}>
              <figure data-rv="clip">{it.photo && <Img src={it.photo.src} wh={it.photo.wh} alt={plain(it.title)} />}</figure>
              <div className="cx-pr-tx" data-rv="up">
                <span className="cx-pr-dot" aria-hidden="true" />
                <h3>
                  <b>{it.num}</b> {it.title}
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

/* ---------------------------------------------------------------- 페이지 */
export default function ClinicPage({ page }: { page: Page }) {
  const [intro, ...rest] = page.sections;
  const tabbed = page.tabs.length > 1;
  const diseases = rest.filter((s) => s.kind === 'disease');
  const others = rest.filter((s) => s.kind !== 'disease');
  const p1 = page.slug === 'sub_clinic_page01';

  return (
    <div className={`cx cx-clinic${p1 ? ' cx--p1' : ''}`}>
      <Intro s={intro} />
      {p1 &&
        others.map((s) => {
          if (s.id === 'eohyeol') return <Eohyeol key={s.id} s={s} />;
          if (s.id === 'symptoms') return <Symptoms key={s.id} s={s} />;
          if (s.id === 'timeline') return <Timeline key={s.id} s={s} />;
          if (s.id === 'process') return <Process key={s.id} s={s} />;
          return <CardBlock key={s.id} s={s} band />;
        })}
      {!p1 && tabbed && (
        <ClinicTabs labels={page.tabs}>
          {page.tabs.map((t, k) => (
            <div key={t} data-pane={k} role="tabpanel" aria-label={t} hidden={k !== 0}>
              {diseases
                .filter((s) => s.tab === t)
                .map((s) => (
                  <Disease key={s.id} s={s} />
                ))}
            </div>
          ))}
        </ClinicTabs>
      )}
      {!p1 && !tabbed && diseases.map((s) => <Disease key={s.id} s={s} />)}
      {!p1 && others.map((s) => <CardBlock key={s.id} s={s} />)}
    </div>
  );
}
