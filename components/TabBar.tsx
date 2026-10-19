'use client';

import { useEffect, useState } from 'react';

/** 질환 바로가기(원본 페이지 상단 탭과 같은 항목). 스크롤 위치에 따라 현재 탭이 표시된다. */
export default function TabBar({ tabs }: { tabs: { label: string; id: string }[] }) {
  const [on, setOn] = useState(tabs[0]?.label);
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-tab]'));
    const onScroll = () => {
      const line = window.innerHeight * 0.35;
      let cur = tabs[0]?.label;
      for (const el of els) {
        if (el.getBoundingClientRect().top < line && el.dataset.tab) cur = el.dataset.tab;
      }
      setOn(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [tabs]);
  return (
    <nav className="tabbar" aria-label="질환 바로가기">
      <ul>
        {tabs.map((t) => (
          <li key={t.label}>
            <a href={`#${t.id}`} className={t.label === on ? 'is-on' : ''}>
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
