'use client';

import { useEffect, useRef, useState } from 'react';
import Pic from './Pic';

/** 원근감 있는 사진 넘김(가운데 사진이 크고, 양옆은 비스듬히 물러남). 끌기·화살표·자동 넘김 지원 */
export default function Coverflow({ images, alt, auto = 4500 }: { images: string[]; alt: string; auto?: number }) {
  const [i, setI] = useState(0);
  const n = images.length;
  const drag = useRef<number | null>(null);
  const paused = useRef(false);
  useEffect(() => {
    if (!auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      if (!paused.current) setI((v) => (v + 1) % n);
    }, auto);
    return () => clearInterval(t);
  }, [auto, n]);
  const go = (d: number) => setI((v) => (v + d + n) % n);
  return (
    <div
      className="cf"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onPointerDown={(e) => (drag.current = e.clientX)}
      onPointerUp={(e) => {
        if (drag.current === null) return;
        const dx = e.clientX - drag.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        drag.current = null;
      }}
    >
      <div className="cf-stage">
        {images.map((src, k) => {
          let off = k - i;
          if (off > n / 2) off -= n;
          if (off < -n / 2) off += n;
          const abs = Math.abs(off);
          return (
            <figure
              key={src}
              className={`cf-item ${off === 0 ? 'is-on' : ''}`}
              style={{ ['--o' as string]: off, ['--a' as string]: abs, zIndex: 20 - abs, opacity: abs > 3 ? 0 : 1 }}
              onClick={() => off !== 0 && go(off)}
            >
              <Pic src={src} alt={`${alt} ${k + 1}`} draggable={false} />
            </figure>
          );
        })}
      </div>
      <div className="cf-ctrl">
        <button type="button" onClick={() => go(-1)} aria-label="이전 사진">
          PREV
        </button>
        <span className="cf-count">
          {String(i + 1).padStart(2, '0')} <i>/</i> {String(n).padStart(2, '0')}
        </span>
        <button type="button" onClick={() => go(1)} aria-label="다음 사진">
          NEXT
        </button>
      </div>
    </div>
  );
}
