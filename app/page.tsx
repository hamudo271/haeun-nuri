import type { Metadata } from 'next';
import HeroSlides from '@/components/HeroSlides';
import DoctorTabs from '@/components/DoctorTabs';
import Coverflow from '@/components/Coverflow';
import Rich, { Lines } from '@/components/Rich';
import Pic, { webpOf } from '@/components/Pic';
import { HERO, PHILOSOPHY, SIGNATURE, DIFFERENT, DOCTORS, STAY } from '@/lib/home';
import { NAV, SITE } from '@/lib/site';

/* canonical 은 레이아웃에 두지 않는다(하위 페이지가 홈 주소를 물려받지 않게) — 페이지마다 자기 주소 */
export const metadata: Metadata = { alternates: { canonical: '/' } };

const CLINIC_PHOTOS: Record<string, { en: string; img: string }> = {
  '/sub/clinic/page01/': { en: 'Traffic Accident', img: '/img/content/sub04-01-00__00.jpg' },
  '/sub/clinic/page02/': { en: 'Spine & Joint', img: '/img/content/sub04-02-00__00.jpg' },
  '/sub/clinic/page03/': { en: 'Internal Medicine', img: '/img/content/sub04-03-01__00.jpg' },
  '/sub/clinic/page04/': { en: "Women's Health", img: '/img/content/fix_sub04-04-02_main1.jpg' },
  '/sub/clinic/page05/': { en: 'Skin', img: '/img/content/sub04-05-03__00.jpg' },
  '/sub/clinic/page06/': { en: 'Mental Health', img: '/img/content/sub04-06-01__00.jpg' },
  '/sub/clinic/page07/': { en: 'Diet', img: '/img/content/sub04-07-01__00.jpg' },
};

export default function Home() {
  const clinic = NAV.find((g) => g.key === 'clinic')!;
  return (
    <>
      {/* 01. 첫 화면 — 레퍼런스: 파시아의원(메디컬디자인) 메인 비주얼. 가운데서 사진이 열리고 글이 좌·아래·우에서 모인다 */}
      <section className="hero hv">
        <HeroSlides slides={HERO.slides}>
          <p className="hero-info-head">
            <b>진료시간</b>
            <span>연중무휴</span>
          </p>
          <ul className="hero-hours">
            {SITE.hours.map((h) => (
              <li key={h.label}>
                <span>{h.label}</span>
                {h.time}
              </li>
            ))}
          </ul>
        </HeroSlides>
        <div className="hv-in wrap">
          {/* 첫 화면 글은 JS 를 기다리지 않고 CSS 애니메이션으로 바로 나타난다(LCP) */}
          <div className="hv-copy">
          {/* 글 뒤의 아치 창: 금색 이중선 + 안쪽만 살짝 흐리고 어둡게 해서 복잡한 사진에서 글을 띄운다 */}
          <span className="hv-arch" aria-hidden="true">
            <i />
          </span>
          <p className="hv-en en">
            <i className="hv-cue" aria-hidden="true" />
            {HERO.en}
          </p>
          <p className="hv-kicker">
            <span className="hv-w hv-w1">{HERO.kicker}</span>
          </p>
          <h1 className="hv-title">
            {HERO.title.map((line, k) => (
              <span key={k} className={`hv-w ${k === 0 ? 'hv-w2' : 'hv-w3'}`}>
                <Rich text={line} />
              </span>
            ))}
          </h1>
          <p className="hv-text">
            <Lines lines={HERO.text} />
          </p>
          <div className="hv-cta">
            <a className="btn btn-gold" href={SITE.booking} target="_blank" rel="noopener noreferrer">
              네이버 예약하기 <span className="arr" aria-hidden="true" />
            </a>
            <a className="btn hero-tel" href={`tel:${SITE.tel}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" />
              </svg>
              {SITE.tel}
            </a>
          </div>
          </div>
        </div>
        <span className="hv-grain" aria-hidden="true" />
      </section>

      {/* 02. 고정 스크롤: 작은 창이 화면 가득 커지며 철학 문장이 나타남 */}
      <section id="philosophy" className="pin" data-pin>
        <div className="pin-stick">
          <div className="pin-marquee en" aria-hidden="true">
            <span>Haeun-Nuri Oriental Clinic · Haeun-Nuri Oriental Clinic · Haeun-Nuri Oriental Clinic · </span>
          </div>
          <div className="pin-intro">
            <p className="label">( {PHILOSOPHY.eyebrow} )</p>
            <h2>
              <Lines lines={PHILOSOPHY.title} />
            </h2>
          </div>
          <div className="pin-frame">
            <Pic src="/img/facility/06.jpg" alt="해운누리한의원 내부" />
            <div className="pin-shade" />
            <div className="pin-text">
              <p className="label light">( {PHILOSOPHY.bandEyebrow} )</p>
              <h3>
                <Lines lines={PHILOSOPHY.bandTitle} />
              </h3>
              {PHILOSOPHY.bandText.map((p, k) => (
                <p key={k} className={`pin-line pin-line-${k + 1}`}>
                  <Lines lines={p} />
                </p>
              ))}
              <a className="btn btn-white pin-cta" href={PHILOSOPHY.cta.href}>
                {PHILOSOPHY.cta.label} <span className="arr" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 03. 대표 치료 3가지 */}
      <section className="sig">
        {SIGNATURE.map((s, k) => (
          <a key={s.href} className="sig-card" href={s.href} data-rv="up" style={{ ['--d' as string]: `${k * 120}ms` }}>
            <span className="sig-img" style={{ backgroundImage: `url(${webpOf(s.img)})` }} />
            <span className="sig-num en">0{k + 1}</span>
            <span className="sig-body">
              <span className="en">{s.en}</span>
              <strong>{s.ko}</strong>
              <span className="sig-more">자세히 보기</span>
            </span>
          </a>
        ))}
      </section>

      {/* 04. 어떻게 다른가요 — 숫자 */}
      <section className="diff">
        <div className="wrap diff-grid">
          <div className="diff-head">
            <p className="label" data-rv="up">
              ( {DIFFERENT.eyebrow} )
            </p>
            <h2 className="h2" data-rv="up">
              <Lines lines={DIFFERENT.title} />
            </h2>
            <figure className="diff-photo" data-rv="clip">
              <Pic src="/img/facility/01.jpg" alt="해운누리한의원 접수 데스크" />
              <figcaption>
                {SITE.address}
                <span className="en">Haeun-Nuri Oriental Clinic</span>
              </figcaption>
            </figure>
          </div>
          <ul className="diff-stats">
            {DIFFERENT.stats.map((s, k) => (
              <li key={k} data-rv="up" style={{ ['--d' as string]: `${k * 120}ms` }}>
                <p className="diff-num">
                  {s.num.length === 2 ? (
                    <>
                      <span data-count={s.num[0]}>{s.num[0]}</span>
                      <small className="to"> to </small>
                      <span data-count={s.num[1]}>{s.num[1]}</span>
                    </>
                  ) : (
                    <span data-count={s.num[0]}>{s.num[0]}</span>
                  )}
                  {s.unit && <small>{s.unit}</small>}
                </p>
                <p className="diff-text">
                  <Lines lines={s.text} />
                </p>
              </li>
            ))}
          </ul>
        </div>
        <p className="diff-bigtype en" aria-hidden="true" data-parallax="0.25">
          Haeun-Nuri Oriental Clinic
        </p>
      </section>

      {/* 05. 의료진 */}
      <section className="docs">
        <div className="wrap">
          <div className="sec-head light" data-rv="up">
            <p className="label light">( Medical Staff )</p>
            <h2 className="h2">해운누리 의료진</h2>
          </div>
          <DoctorTabs doctors={DOCTORS} />
        </div>
      </section>

      {/* 06. 진료과목 — 왼쪽 사진 무대 + 오른쪽 번호 목록(올리면 사진이 바뀜) */}
      <section className="dept">
        <div className="wrap dept-grid">
          <div className="dept-side">
            <div className="sec-head" data-rv="up">
              <p className="label">( {clinic.en} )</p>
              <h2 className="h2">{clinic.label}</h2>
            </div>
            <div className="dept-stage" data-rv="clip" aria-hidden="true">
              {clinic.items.map((it, k) => {
                const m = CLINIC_PHOTOS[it.href];
                return (
                  <figure key={it.href} className={`dept-shot dept-shot-${k + 1}`}>
                    <Pic src={m.img} alt="" />
                    <figcaption className="en">
                      <i>{String(k + 1).padStart(2, '0')}</i> {m.en}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
          <ul className="dept-list">
            {clinic.items.map((it, k) => {
              const m = CLINIC_PHOTOS[it.href];
              return (
                <li key={it.href} data-rv="up" style={{ ['--d' as string]: `${k * 70}ms` }}>
                  <a href={it.href} className={`dept-item dept-${k + 1}`}>
                    <span className="dept-img">
                      <Pic src={m.img} alt="" />
                    </span>
                    <span className="dept-num en">{String(k + 1).padStart(2, '0')}</span>
                    <span className="dept-txt">
                      <strong>{it.label}</strong>
                      <span className="en">{m.en}</span>
                    </span>
                    <span className="more en">View more</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 07. 입원실 — 아치로 열리는 어두운 구간 + 특징 카드 + 공간 사진 */}
      <section className="stay">
        <div className="stay-arch" aria-hidden="true" />
        <div className="wrap stay-in">
          <div className="sec-head light center" data-rv="up">
            <Pic className="stay-logo" src="/img/brand/logo-white.png" alt="" ariaHidden />
            <p className="label light">( {STAY.eyebrow} )</p>
            <h2 className="h2">
              <Lines lines={STAY.title} />
            </h2>
          </div>
          <ul className="pills">
            {STAY.features.map((f, k) => (
              <li key={f.title} data-rv="up" style={{ ['--d' as string]: `${k * 90}ms` }}>
                <span className="pill-num en">0{k + 1}</span>
                <strong>{f.title}</strong>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
          <div className="stay-more" data-rv="up">
            <a className="btn btn-line light" href="/sub/hospital/page01/">
              입원실 안내 <span className="arr" aria-hidden="true" />
            </a>
            <a className="btn btn-line light" href="/sub/hospital/page02/">
              입원절차 안내 <span className="arr" aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="stay-gallery" data-rv="up">
          <Coverflow images={STAY.gallery} alt="해운누리한의원 공간" />
        </div>
      </section>
    </>
  );
}
