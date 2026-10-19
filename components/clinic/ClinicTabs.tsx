'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 진료과목 부위 탭(목·허리·어깨…). 본문은 서버에서 모두 그려 두고(검색·AI 가 전부 읽음),
 * 여기서는 보이는 묶음만 바꾼다. 밑바탕이 미끄러지는 알약 모양은 기존 상세 탭과 같다.
 */
export default function ClinicTabs({ labels, children }: { labels: string[]; children: React.ReactNode }) {
  const [cur, setCur] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const ul = useRef<HTMLUListElement>(null);
  const ind = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const k = hover ?? cur;
    const li = ul.current?.querySelectorAll<HTMLElement>('li')[k];
    if (!li || !ind.current) return;
    ind.current.style.width = `${li.offsetWidth}px`;
    ind.current.style.transform = `translateX(${li.offsetLeft}px)`;
  }, [cur, hover]);

  useEffect(() => {
    box.current?.querySelectorAll<HTMLElement>('[data-pane]').forEach((p) => {
      p.hidden = p.dataset.pane !== String(cur);
    });
    // 새로 보인 묶음의 등장 연출을 다시 걸기 위해 스크롤 이벤트를 한 번 흘린다
    requestAnimationFrame(() => window.dispatchEvent(new Event('scroll')));
  }, [cur]);

  const pick = (k: number) => {
    setCur(k);
    const top = box.current ? box.current.getBoundingClientRect().top + window.scrollY - 150 : 0;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div className="cx-tabs" ref={box}>
      <nav className="dt-nav" aria-label="질환 선택">
        <ul ref={ul} role="tablist" onMouseLeave={() => setHover(null)}>
          <span className="dt-ind" ref={ind} aria-hidden="true" />
          {labels.map((t, k) => (
            <li key={t} role="presentation">
              <button type="button" role="tab" aria-selected={cur === k} className={cur === k ? 'is-on' : ''} onClick={() => pick(k)} onMouseEnter={() => setHover(k)}>
                {t}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
