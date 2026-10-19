'use client';

import { useEffect, useRef, useState } from 'react';
import type { Slice } from '@/lib/details';

/** 원본의 탭 전환(척추관절: 목·허리·어깨…) — 밑바탕이 미끄러지고, 바뀐 탭의 조각들이 다시 차례로 등장한다 */
function Pieces({ list, tag }: { list: Slice[]; tag: string }) {
  return (
    <div className={tag}>
      {list.map((s) => (
        <figure key={s.src} className={`dt-s k-${s.kind}`} data-tabrv style={{ aspectRatio: `${s.w} / ${s.h}` }}>
          <picture>
            <source srcSet={s.src.replace(/\.jpg$/, '.webp')} type="image/webp" />
            <img src={s.src} alt={s.alt} width={s.w} height={s.h} loading="lazy" decoding="async" />
          </picture>
        </figure>
      ))}
    </div>
  );
}

export default function DetailTabs({ tabs }: { tabs: { label: string; pc: Slice[]; mo: Slice[] }[] }) {
  const [cur, setCur] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const ul = useRef<HTMLUListElement>(null);
  const ind = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = hover ?? cur;
    const b = ul.current?.querySelectorAll<HTMLElement>('button')[k];
    if (!b || !ind.current) return;
    const li = b.parentElement as HTMLElement; // 버튼의 위치 기준은 li 이므로 li 의 위치를 쓴다
    ind.current.style.width = `${li.offsetWidth}px`;
    ind.current.style.transform = `translateX(${li.offsetLeft}px)`;
  }, [cur, hover]);

  // 보이는 탭의 조각을 화면에 들어올 때 등장시킨다(탭을 바꾸면 처음부터 다시)
  useEffect(() => {
    const root = box.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(root.querySelectorAll<HTMLElement>(`[data-pane="${cur}"] [data-tabrv]`));
    els.forEach((e) => e.classList.remove('is-in'));
    if (reduce) {
      els.forEach((e) => e.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (ens) =>
        ens.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    );
    requestAnimationFrame(() => els.forEach((e) => io.observe(e)));
    return () => io.disconnect();
  }, [cur]);

  const pick = (k: number) => {
    setCur(k);
    const top = box.current ? box.current.getBoundingClientRect().top + window.scrollY - 150 : 0;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div className="dt-tabs" ref={box}>
      <nav className="dt-nav" aria-label="부위 선택">
        <ul ref={ul} role="tablist" onMouseLeave={() => setHover(null)}>
          <span className="dt-ind" ref={ind} aria-hidden="true" />
          {tabs.map((t, k) => (
            <li key={t.label} role="presentation">
              <button type="button" role="tab" aria-selected={cur === k} className={cur === k ? 'is-on' : ''} onClick={() => pick(k)} onMouseEnter={() => setHover(k)}>
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {tabs.map((t, k) => (
        <div key={t.label} role="tabpanel" data-pane={k} hidden={cur !== k} className="dt-pane">
          <Pieces list={t.pc} tag="dt-pc" />
          <Pieces list={t.mo} tag="dt-mo" />
        </div>
      ))}
    </div>
  );
}
