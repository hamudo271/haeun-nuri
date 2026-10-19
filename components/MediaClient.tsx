'use client';

import { useEffect } from 'react';

/** 미디어 화면: 유튜브 카드를 누르면 화면 위 영상 창으로 재생, 칼럼 '링크 복사' */
export default function MediaClient() {
  useEffect(() => {
    let modal: HTMLDivElement | null = null;
    let last: HTMLElement | null = null;
    const close = () => {
      if (!modal) return;
      modal.classList.remove('is-on');
      const m = modal;
      modal = null;
      document.documentElement.classList.remove('menu-open');
      setTimeout(() => m.remove(), 350);
      last?.focus();
    };
    const open = (id: string, title: string) => {
      close();
      const m = document.createElement('div');
      m.className = 'md-modal';
      m.setAttribute('role', 'dialog');
      m.setAttribute('aria-modal', 'true');
      m.setAttribute('aria-label', title || '영상');
      const safe = id.replace(/[^\w-]/g, '');
      m.innerHTML = `<div class="md-modal-in"><button type="button" class="md-x" aria-label="닫기"></button><div class="md-frame"><iframe src="https://www.youtube-nocookie.com/embed/${safe}?autoplay=1&rel=0&playsinline=1" title="" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div><p class="md-modal-t"></p></div>`;
      (m.querySelector('iframe') as HTMLIFrameElement).title = title || '유튜브 영상';
      (m.querySelector('.md-modal-t') as HTMLElement).textContent = title;
      m.addEventListener('click', (e) => {
        if (e.target === m || (e.target as HTMLElement).closest('.md-x')) close();
      });
      document.body.appendChild(m);
      document.documentElement.classList.add('menu-open');
      requestAnimationFrame(() => m.classList.add('is-on'));
      (m.querySelector('.md-x') as HTMLElement).focus();
      modal = m;
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const yt = t.closest<HTMLElement>('[data-yt]');
      if (yt) {
        e.preventDefault();
        last = yt;
        open(yt.dataset.yt || '', yt.dataset.title || '');
        return;
      }
      const cp = t.closest<HTMLElement>('[data-copy]');
      if (cp) {
        navigator.clipboard?.writeText(location.origin + location.pathname).then(() => {
          cp.textContent = '링크를 복사했습니다';
          setTimeout(() => (cp.textContent = '링크 복사'), 2200);
        });
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  return null;
}
