import Rich from './Rich';
import Pic from './Pic';
import { photoSrc, isBadged, type Section, type Item } from '@/lib/content';

/** 원고 한 섹션을 종류(kind)에 맞는 화면 배치로 그린다. 글은 원고 그대로. */

function Head({ s, center = false, light = false }: { s: Section; center?: boolean; light?: boolean }) {
  if (!s.eyebrow && !s.title && !s.lead && !s.body && !s.num && !s.tags) return null;
  return (
    <div className={`blk-head ${center ? 'center' : ''} ${light ? 'light' : ''}`} data-rv="up">
      {s.num && <p className="blk-num">{s.num}</p>}
      {s.eyebrow && (
        <p className="blk-eyebrow">
          <Rich text={s.eyebrow} />
        </p>
      )}
      {s.title && (
        <h2 className="blk-title">
          <Rich text={s.title} />
        </h2>
      )}
      {s.tags && (
        <p className="tags">
          {s.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </p>
      )}
      {s.lead && (
        <p className="blk-lead">
          <Rich text={s.lead} />
        </p>
      )}
      {s.body && (
        <div className="blk-body blk-lead">
          {s.body.map((b, i) => (
            <p key={i}>
              <Rich text={b} />
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Img({ p, alt = '', className = '' }: { p?: string; alt?: string; className?: string }) {
  const src = photoSrc(p);
  if (!src) return null;
  return <Pic className={className} src={src} alt={alt} />;
}

function Checklist({ s }: { s: Section }) {
  if (!s.checklist?.length) return null;
  return (
    <div className="check" data-rv="up">
      {s.checklistTitle && (
        <p className="check-title">
          <Rich text={s.checklistTitle} />
        </p>
      )}
      <ul>
        {s.checklist.map((c, i) => (
          <li key={i}>
            <Rich text={c} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Callout({ s }: { s: Section }) {
  if (!s.callout) return null;
  return (
    <div className="dz-callout" data-rv="up" style={{ ['--d' as string]: '150ms' }}>
      {s.callout.eyebrow && (
        <p className="eyebrow">
          <Rich text={s.callout.eyebrow} />
        </p>
      )}
      {s.callout.title && (
        <h4>
          <Rich text={s.callout.title} />
        </h4>
      )}
      {s.callout.text && (
        <p>
          <Rich text={s.callout.text} />
        </p>
      )}
    </div>
  );
}

function textLines(t?: string) {
  if (!t) return null;
  if (/(^|\n)- /.test(t)) {
    return (
      <ul className="dash">
        {t.split('\n').map((l, i) => (
          <li key={i}>{l.replace(/^- /, '')}</li>
        ))}
      </ul>
    );
  }
  return <Rich text={t} />;
}

function Card({ it, i, plain }: { it: Item; i: number; plain?: boolean }) {
  const inner = (
    <>
      {it.photo && (
        <span className={`card-img ${isBadged(it.photo) ? 'badged' : ''}`}>
          <Img p={it.photo} alt={it.title?.replace(/\*\*/g, '')} />
        </span>
      )}
      <span className="card-body">
        {(it.num || plain) && <span className="card-num">{it.num ?? String(i + 1).padStart(2, '0')}</span>}
        {it.eyebrow && <span className="card-eyebrow en">{it.eyebrow}</span>}
        {it.title && (
          <span className="card-title">
            <Rich text={it.title} />
          </span>
        )}
        {it.text && <span className="card-text">{textLines(it.text)}</span>}
        {it.href && <span className="card-link">자세히 보기 →</span>}
      </span>
    </>
  );
  const props = { className: `card ${it.photo ? '' : 'no-img'}`, 'data-rv': 'up', style: { ['--d' as string]: `${(i % 4) * 90}ms` } };
  return it.href ? (
    <a href={it.href} {...props}>
      {inner}
    </a>
  ) : (
    <div {...props}>{inner}</div>
  );
}

function Cards({ items, cols }: { items: Item[]; cols?: number }) {
  const n = cols ?? (items.length === 4 || items.length === 8 ? 4 : items.length === 2 ? 2 : 3);
  const plain = items.every((it) => !it.photo && !it.num);
  return (
    <div className={`cards c${n}`}>
      {items.map((it, i) => (
        <Card key={i} it={it} i={i} plain={plain} />
      ))}
    </div>
  );
}

function ItemsHead({ s }: { s: Section }) {
  if (!s.itemsTitle && !s.itemsEyebrow) return null;
  return (
    <div className="dz-cards-head" data-rv="up">
      {s.itemsEyebrow && (
        <p className="blk-eyebrow">
          <Rich text={s.itemsEyebrow} />
        </p>
      )}
      {s.itemsTitle && (
        <h3 className="blk-title">
          <Rich text={s.itemsTitle} />
        </h3>
      )}
    </div>
  );
}

function Extras({ s }: { s: Section }) {
  return (
    <>
      {s.badge && (
        <p className="badge-pill" data-rv="up">
          <Rich text={s.badge} />
        </p>
      )}
      {s.note && <p className="note">{s.note}</p>}
      {s.cta && (
        <p data-rv="up" style={{ marginTop: 28 }}>
          <a className="btn btn-gold" href={s.cta.href}>
            {s.cta.label} <span className="arr" aria-hidden="true" />
          </a>
        </p>
      )}
    </>
  );
}

export default function SectionView({ s, index }: { s: Section; index: number }) {
  const anchor = { id: s.id, 'data-tab': s.tab };

  if (s.kind === 'disease') {
    return (
      <section className="blk dz" {...anchor}>
        <div className="dz-top">
          <div className="dz-photo" data-rv="clip">
            <Img p={s.photo} alt={s.title?.replace(/\*\*/g, '')} />
            <Callout s={s} />
          </div>
          <div className="dz-info">
            <Head s={s} />
            <Checklist s={s} />
          </div>
        </div>
        {s.items && (
          <div className="dz-cards">
            <ItemsHead s={s} />
            <Cards items={s.items} />
          </div>
        )}
        <Extras s={s} />
      </section>
    );
  }

  if (s.kind === 'quote') {
    return (
      <section className="blk quote" {...anchor} data-rv="up">
        <Head s={s} center light />
        <Extras s={s} />
      </section>
    );
  }

  if (s.kind === 'steps') {
    return (
      <section className="blk" {...anchor}>
        <Head s={s} center />
        <Checklist s={s} />
        <div className="steps">
          {s.items?.map((it, i) => (
            <div className="step" key={i} data-rv="up" style={{ ['--d' as string]: `${(i % 6) * 80}ms` }}>
              <span className="step-num">{it.num ?? String(i + 1).padStart(2, '0')}</span>
              {it.photo && (
                <div className="step-img">
                  <Img p={it.photo} alt={it.title?.replace(/\*\*/g, '')} />
                </div>
              )}
              {it.title && (
                <p className="step-title">
                  <Rich text={it.title} />
                </p>
              )}
              {it.text && <div className="step-text">{textLines(it.text)}</div>}
            </div>
          ))}
        </div>
        <Extras s={s} />
      </section>
    );
  }

  if (s.kind === 'list') {
    return (
      <section className="blk" {...anchor}>
        <div className={s.photo ? 'feat' : ''}>
          {s.photo && (
            <div className="feat-media" data-rv="clip">
              <Img p={s.photo} />
            </div>
          )}
          <div>
            <Head s={s} />
            <ItemsHead s={s} />
            <Checklist s={s} />
            {s.items && (
              <ul className="blist" data-rv="up">
                {s.items.map((it, i) => (
                  <li key={i}>
                    {it.title && (
                      <b>
                        <Rich text={it.title} />
                      </b>
                    )}
                    {it.text && (
                      <span>
                        {' '}
                        <Rich text={it.text} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Extras s={s} />
      </section>
    );
  }

  // 의료진(경력 두 칸)
  const careerCols = s.kind === 'feature' && s.items?.length === 2 && s.items.every((it) => !it.title && it.text) && /한의사|원장/.test(s.eyebrow ?? '');
  if (careerCols) {
    return (
      <section className="blk dr" {...anchor}>
        <div className="dr-photo" data-rv="up">
          <Img p={s.photo} alt={s.title} />
        </div>
        <div data-rv="up" style={{ ['--d' as string]: '120ms' }}>
          {s.lead && <p className="dr-motto">{s.lead}</p>}
          <h2 className="dr-name">
            {s.title} <span>{s.eyebrow}</span>
          </h2>
          <div className="dr-cols">
            {s.items!.map((it, i) => (
              <ul key={i}>
                {it.text!.split('\n').map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (((s.kind === 'feature' || s.kind === 'intro' || s.kind === 'text') && s.photo) || (s.kind === 'feature' && s.photos?.length)) {
    const gallery = s.photos?.length ? s.photos : [];
    return (
      <section className={`blk feat ${index % 2 ? 'rev' : ''}`} {...anchor}>
        <div className={`feat-media ${s.kind === 'intro' ? 'arch' : ''}`} data-rv="clip">
          {s.photo ? <Img p={s.photo} alt={s.title?.replace(/\*\*/g, '')} /> : gallery[0] && <Img p={gallery[0]} />}
          {gallery.length > (s.photo ? 0 : 1) && (
            <div className="more-photos">
              {gallery.slice(s.photo ? 0 : 1).map((g) => (
                <Img key={g} p={g} />
              ))}
            </div>
          )}
        </div>
        <div>
          <Head s={s} />
          <Callout s={s} />
          <Checklist s={s} />
          {s.items && (
            <ul className="feat-list" data-rv="up">
              {s.items.map((it, i) => (
                <li key={i}>
                  <span className="n en">{it.num ?? String(i + 1).padStart(2, '0')}</span>
                  <span>
                    {it.title && (
                      <b>
                        <Rich text={it.title} />
                      </b>
                    )}
                    {it.text && <span className="t">{textLines(it.text)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Extras s={s} />
        </div>
      </section>
    );
  }

  // intro(사진 없음) · text · cards
  return (
    <section className={`blk k-${s.kind}`} {...anchor}>
      <Head s={s} center={s.kind !== 'text'} />
      <Callout s={s} />
      {(s.photos?.length ?? 0) > 0 && (
        <div className="photo-row" data-rv="up">
          {s.photos!.map((p) => (
            <Img key={p} p={p} />
          ))}
        </div>
      )}
      {s.items && s.kind === 'feature' ? (
        <ul className="feat-list narrow-list" data-rv="up">
          {s.items.map((it, i) => (
            <li key={i}>
              <span className="n en">{it.num ?? String(i + 1).padStart(2, '0')}</span>
              <span>
                {it.title && (
                  <b>
                    <Rich text={it.title} />
                  </b>
                )}
                {it.text && <span className="t">{textLines(it.text)}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        s.items && (
          <div className="blk-items">
            <ItemsHead s={s} />
            <Cards items={s.items} />
          </div>
        )
      )}
      <Checklist s={s} />
      <Extras s={s} />
    </section>
  );
}
