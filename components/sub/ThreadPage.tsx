import { Fragment } from 'react';
import Img from './Img';
import raw from '@/content/sub_treatment_page03.json';
import type { Item, Page, Section } from '@/lib/content';
import '../clinic/clinic.css';
import './thread.css';

const IMG = '/img/sub/treatment-page03';
const data = raw as unknown as Page;
const section = (id: string) => data.sections.find((value) => value.id === id) as Section;

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <em key={partIndex}>{part.slice(2, -2)}</em>
            ) : (
              <Fragment key={partIndex}>{part}</Fragment>
            ),
          )}
        </Fragment>
      ))}
    </>
  );
}

function Intro() {
  const current = section('intro');
  return (
    <section className="s-thr-intro">
      <div className="cx-in s-thr-intro-in">
        <figure className="s-thr-intro-photo" data-rv="clip">
          <Img src={`${IMG}/intro.jpg`} wh={[581, 388]} alt="" eager />
        </figure>
        <div className="s-thr-intro-copy" data-rv="up">
          <p className="s-thr-eyebrow">{current.eyebrow}</p>
          <h2 className="s-thr-intro-title">{current.title}</h2>
          {(current.body ?? []).map((paragraph, index) => (
            <p className="s-thr-intro-body" key={index}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const current = section('how-it-works');
  const items: Item[] = current.items ?? [];
  return (
    <section className="s-thr-how">
      <div className="s-thr-how-band">
        <picture className="s-thr-how-bg">
          <source media="(max-width: 1023px)" srcSet={`${IMG}/how-band-m.webp`} type="image/webp" />
          <source media="(max-width: 1023px)" srcSet={`${IMG}/how-band-m.jpg`} />
          <source srcSet={`${IMG}/how-band.webp`} type="image/webp" />
          <img src={`${IMG}/how-band.jpg`} alt="" width={1920} height={390} loading="lazy" decoding="async" />
        </picture>
        <div className="cx-in s-thr-how-copy" data-rv="up">
          <h2>{current.title}</h2>
          <p>{current.lead}</p>
        </div>
      </div>
      <div className="cx-in">
        <ol className="s-thr-how-list">
          {items.map((item, index) => (
            <li key={item.num} data-rv="up" style={{ ['--d' as string]: `${index * 90}ms` }}>
              <figure>
                <Img src={`${IMG}/how-${index + 1}.jpg`} wh={index === 0 ? [274, 272] : index === 1 ? [262, 277] : [248, 223]} alt="" />
              </figure>
              <div className="s-thr-how-text">
                <b>{item.num}</b>
                <h3>
                  <Rich text={item.title ?? ''} />
                </h3>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg className="s-thr-check-icon" viewBox="0 0 46 46" aria-hidden="true">
      <circle cx="23" cy="23" r="23" />
      <path d="M13 23.5 20.2 31 34 16.5" />
    </svg>
  );
}

function Safety() {
  const current = section('safety');
  return (
    <section className="s-thr-safety">
      <div className="cx-in">
        <header className="s-thr-head" data-rv="up">
          <span className="s-thr-head-line" aria-hidden="true" />
          <p>{current.eyebrow}</p>
          <h2>
            <Rich text={current.title ?? ''} />
          </h2>
        </header>
        <ul className="s-thr-safety-list">
          {(current.checklist ?? []).map((item, index) => (
            <li key={index} data-rv="up" style={{ ['--d' as string]: `${(index % 2) * 90}ms` }}>
              <CheckIcon />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Indications() {
  const current = section('indications');
  return (
    <section className="s-thr-indications">
      <div className="cx-in">
        <header className="s-thr-simple-head" data-rv="up">
          <h2>{current.title}</h2>
          <p>{current.lead}</p>
        </header>
        <ul className="s-thr-indication-list">
          {(current.items ?? []).map((item: Item, index: number) => (
            <li key={index} data-rv="up" style={{ ['--d' as string]: `${(index % 3) * 70}ms` }}>
              <img src={`${IMG}/indication-${index + 1}.png`} width={214} height={151} alt="" loading="lazy" decoding="async" />
              <h3>{item.title}</h3>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Advantages() {
  const current = section('advantages');
  return (
    <section className="s-thr-advantages">
      <div className="cx-in">
        <header className="s-thr-advantages-head" data-rv="up">
          <span aria-hidden="true" />
          <p>{current.itemsEyebrow}</p>
          <h2>
            <Rich text={current.itemsTitle ?? ''} />
          </h2>
        </header>
        <ol className="s-thr-adv-list">
          {(current.items ?? []).map((item: Item, index: number) => (
            <li key={item.num} className={index % 2 ? 'is-reverse' : ''} data-rv="up">
              <figure>
                <Img src={`${IMG}/adv-${index + 1}.jpg`} wh={[593, 273]} alt="" />
              </figure>
              <div className="s-thr-adv-copy">
                <b>{item.num}</b>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function ThreadPage() {
  return (
    <div className="cx s-thr">
      <Intro />
      <HowItWorks />
      <Safety />
      <Indications />
      <Advantages />
    </div>
  );
}
