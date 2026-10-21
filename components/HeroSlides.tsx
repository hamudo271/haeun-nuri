'use client';

import { useEffect, useState, type ReactNode } from 'react';

const DELAY = 6000;
export const webp = (src: string) => src.replace(/\.(jpe?g|png)$/i, '.webp');

/** m: 세로 화면(모바일)에서 보여줄 사진의 가로 위치(background-position) */
export type HeroSlide = { src: string; m?: string };

/**
 * 메인 첫 화면 사진: 천천히 확대되며(켄번스) 6초마다 겹쳐 바뀐다.
 * 아래 유리 띠에는 진료시간(children)과 장면 번호·진행 막대를 둔다. 번호를 누르면 다음 사진.
 */

export default function HeroSlides({ slides, children }: { slides: HeroSlide[]; children?: ReactNode }) {
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0); // 넘길 때마다 진행 막대·타이머를 처음부터
  const [still, setStill] = useState(false);
  // 사진은 지금 장면과 바로 다음 장면만 받는다. 처음에는 1장만(첫 화면 속도) — 나머지는 페이지를 다 읽은 뒤
  const [loaded, setLoaded] = useState(1);
  useEffect(() => {
    const more = () => setLoaded((l) => Math.max(l, 2));
    if (document.readyState === 'complete') {
      const t = setTimeout(more, 300);
      return () => clearTimeout(t);
    }
    window.addEventListener('load', more, { once: true });
    return () => window.removeEventListener('load', more);
  }, []);
  useEffect(() => setLoaded((l) => Math.max(l, Math.min(slides.length, i + 2))), [i, slides.length]);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true);
      return;
    }
    const t = setTimeout(() => setI((v) => (v + 1) % slides.length), DELAY);
    return () => clearTimeout(t);
  }, [i, tick, slides.length]);
  const next = () => {
    setI((v) => (v + 1) % slides.length);
    setTick((v) => v + 1);
  };
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <>
      <div className="hero-slides" aria-hidden="true">
        {slides.map((s, k) => (
          <div
            key={s.src}
            className={`hero-slide ${k === i ? 'is-on' : ''}`}
            style={{ backgroundImage: k < loaded ? `url(${webp(s.src)})` : undefined, ['--mpos' as string]: s.m ?? 'center' }}
          />
        ))}
      </div>
      <div className="hero-bar">
        <div className="hero-bar-in wrap">
          <div className="hero-info hero-up" style={{ animationDelay: '420ms' }}>
            {children}
          </div>
          <button type="button" className="hero-count" onClick={next} aria-label="다음 사진">
            <span className="en cur">{pad(i + 1)}</span>
            <span className="line">{!still && <i key={`${i}-${tick}`} />}</span>
            <span className="en tot">{pad(slides.length)}</span>
          </button>
        </div>
      </div>
    </>
  );
}
