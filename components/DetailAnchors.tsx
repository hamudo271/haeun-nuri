'use client';

import { useEffect, useRef, useState } from 'react';

/** 질환 바로가기: 화면 위에 붙어 다니고, 지금 보고 있는 질환에 밑바탕이 미끄러져 따라간다(스크롤 감지) */
export default function DetailAnchors({ items }: { items: { id: string; label: string }[] }) {
  const [on, setOn] = useState(items[0]?.id);
  const [hover, setHover] = useState<string | null>(null);
  const ul = useRef<HTMLUListElement>(null);
  const ind = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (ens) => {
        const vis = ens.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setOn(vis[0].target.id);
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);

  useEffect(() => {
    const id = hover ?? on;
    const a = ul.current?.querySelector<HTMLElement>(`[data-id="${id}"]`);
    if (!a || !ind.current || !ul.current) return;
    const li = a.parentElement as HTMLElement; // 링크의 위치 기준은 li 이므로 li 의 위치를 쓴다
    ind.current.style.width = `${li.offsetWidth}px`;
    ind.current.style.transform = `translateX(${li.offsetLeft}px)`;
    if (!hover) {
      const box = ul.current;
      const target = li.offsetLeft - box.clientWidth / 2 + li.offsetWidth / 2;
      box.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
  }, [on, hover]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 150;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  return (
    <nav className="dt-nav" aria-label="질환 바로가기">
      <ul ref={ul} onMouseLeave={() => setHover(null)}>
        <span className="dt-ind" ref={ind} aria-hidden="true" />
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} data-id={i.id} className={on === i.id ? 'is-on' : ''} onClick={go(i.id)} onMouseEnter={() => setHover(i.id)}>
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
