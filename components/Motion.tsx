'use client';

import { useEffect } from 'react';

/**
 * 페이지 전체의 스크롤·마우스 연출을 한곳에서 처리한다(별도 라이브러리 없음).
 * 스크롤
 * - [data-rv]        : 화면에 들어오면 .is-in 을 붙인다 → CSS 가 떠오르기·걷히기·확대 등을 처리
 * - [data-count]     : 화면에 들어오면 0부터 그 숫자까지 올라간다
 * - [data-parallax]  : 스크롤에 따라 살짝 다른 속도로 움직인다(값 = 속도 비율)
 * - [data-pin]       : 고정 스크롤 구간. 진행률(0~1)을 CSS 변수 --p 로 넘긴다
 * - [data-prog]      : 화면 아래에서 들어와 위로 오를 때까지의 진행률을 --p 로 넘긴다(아치 열림)
 * - [data-flow]      : 스크롤에 따라 옆으로 흐르는 큰 글자(--fx)
 * - .progress        : 맨 위 읽은 정도 막대(--sp)
 * 마우스(정밀 포인터에서만)
 * - [data-mouse] 안의 [data-depth] : 마우스 반대·같은 방향으로 깊이만큼 움직임(--mx, --my)
 * - [data-magnet]    : 버튼이 마우스 쪽으로 살짝 끌려옴(--gx, --gy)
 * - [data-tilt]      : 카드 안에서 사진과 글이 서로 반대로 움직임(--tx, --ty)
 * - [data-ind]       : 메뉴 밑줄이 마우스를 올린 항목으로 미끄러져 이동
 * 움직임 줄이기 설정을 켠 사용자에게는 모두 바로 보이게 한다.
 */
export default function Motion() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const root = document.documentElement;
    root.classList.add('js');

    const rv = Array.from(document.querySelectorAll<HTMLElement>('[data-rv]'));
    const counts = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));

    const countUp = (el: HTMLElement) => {
      const end = Number(el.dataset.count);
      if (reduce) {
        el.textContent = String(end);
        return;
      }
      const dur = 1600;
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        el.textContent = String(Math.round(end * e));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (reduce) {
      rv.forEach((el) => el.classList.add('is-in'));
      counts.forEach(countUp);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target as HTMLElement;
          if (el.dataset.count !== undefined) countUp(el);
          else el.classList.add('is-in');
          io.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    );
    if (!reduce) {
      rv.forEach((el) => io.observe(el));
      counts.forEach((el) => io.observe(el));
    }

    const par = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
    const pins = Array.from(document.querySelectorAll<HTMLElement>('[data-pin]'));
    const progs = Array.from(document.querySelectorAll<HTMLElement>('[data-prog]'));
    const flows = Array.from(document.querySelectorAll<HTMLElement>('[data-flow]'));
    const bar = document.querySelector<HTMLElement>('.progress');
    let raf = 0;
    const frame = () => {
      raf = 0;
      const vh = window.innerHeight;
      if (!reduce) {
        par.forEach((el) => {
          const r = el.getBoundingClientRect();
          const mid = r.top + r.height / 2 - vh / 2;
          el.style.setProperty('--py', `${(-mid * Number(el.dataset.parallax || 0.1)).toFixed(1)}px`);
        });
        flows.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          const k = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
          const p = el.firstElementChild as HTMLElement | null;
          const span = p ? p.scrollWidth - el.clientWidth : 0;
          el.style.setProperty('--fx', `${(-k * span).toFixed(1)}px`);
        });
      }
      pins.forEach((el) => {
        const r = el.getBoundingClientRect();
        const total = r.height - vh;
        const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
        el.style.setProperty('--p', reduce ? '1' : p.toFixed(4));
      });
      progs.forEach((el) => {
        const r = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.85)));
        el.style.setProperty('--p', reduce ? '1' : p.toFixed(4));
      });
      if (bar) {
        const max = document.documentElement.scrollHeight - vh;
        bar.style.setProperty('--sp', (max > 0 ? window.scrollY / max : 0).toFixed(4));
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    frame();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    /* ---------- 마우스 ---------- */
    const off: (() => void)[] = [];
    const on = (el: EventTarget, ev: string, fn: EventListener) => {
      el.addEventListener(ev, fn, { passive: true });
      off.push(() => el.removeEventListener(ev, fn));
    };
    if (fine && !reduce) {
      document.querySelectorAll<HTMLElement>('[data-mouse]').forEach((box) => {
        const layers = Array.from(box.querySelectorAll<HTMLElement>('[data-depth]'));
        on(box, 'mousemove', ((e: MouseEvent) => {
          const r = box.getBoundingClientRect();
          const rx = (e.clientX - r.left) / r.width - 0.5;
          const ry = (e.clientY - r.top) / r.height - 0.5;
          layers.forEach((l) => {
            const d = Number(l.dataset.depth || 0);
            l.style.setProperty('--mx', `${(rx * d).toFixed(1)}px`);
            l.style.setProperty('--my', `${(ry * d).toFixed(1)}px`);
          });
        }) as EventListener);
        on(box, 'mouseleave', () => layers.forEach((l) => (l.style.setProperty('--mx', '0px'), l.style.setProperty('--my', '0px'))));
      });
      document.querySelectorAll<HTMLElement>('[data-magnet]').forEach((el) => {
        on(el, 'mousemove', ((e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--gx', `${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px`);
          el.style.setProperty('--gy', `${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px`);
        }) as EventListener);
        on(el, 'mouseleave', () => (el.style.setProperty('--gx', '0px'), el.style.setProperty('--gy', '0px')));
      });
      document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
        on(el, 'mousemove', ((e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--tx', `${(((e.clientX - r.left) / r.width - 0.5) * 28).toFixed(1)}px`);
          el.style.setProperty('--ty', `${(((e.clientY - r.top) / r.height - 0.5) * 20).toFixed(1)}px`);
        }) as EventListener);
        on(el, 'mouseleave', () => (el.style.setProperty('--tx', '0px'), el.style.setProperty('--ty', '0px')));
      });
    }

    /* 메뉴 밑줄: 현재 항목에 두고, 마우스를 올린 항목으로 미끄러진다 */
    document.querySelectorAll<HTMLElement>('[data-ind]').forEach((ul) => {
      // 목록(ul) 안에는 li 만 두어야 하므로 밑줄도 보조 li 로 넣는다
      const ind = document.createElement('li');
      ind.className = 'ind';
      ind.setAttribute('role', 'presentation');
      ind.setAttribute('aria-hidden', 'true');
      ul.appendChild(ind);
      const cur = ul.querySelector<HTMLElement>('a.is-on');
      const place = (a: HTMLElement | null) => {
        if (!a) {
          ind.style.opacity = '0';
          return;
        }
        ind.style.opacity = '1';
        ind.style.width = `${Math.max(0, a.offsetWidth - 44)}px`;
        ind.style.transform = `translateX(${a.offsetLeft + 22}px)`;
      };
      place(cur);
      if (cur) ul.scrollLeft = Math.max(0, cur.offsetLeft - 24);
      ul.querySelectorAll<HTMLElement>('a').forEach((a) => on(a, 'mouseenter', () => place(a)));
      on(ul, 'mouseleave', () => place(cur));
      on(window, 'resize', () => place(cur));
    });

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      off.forEach((f) => f());
    };
  }, []);

  return null;
}
