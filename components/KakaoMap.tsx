'use client';

import { useEffect, useRef } from 'react';

/**
 * 카카오 약도(원본 사이트와 같은 퍼가기 키). 로더가 document.write 로 다음 스크립트를 부르기 때문에
 * 그 호출만 가로채서 순서대로 불러온 뒤 지도를 그린다.
 */
type Lander = { render: () => void };
type Daum = { roughmap: { Lander: new (o: Record<string, string>) => Lander } };

/** 원본에서 쓰던 두 개의 약도 키: 푸터용, 오시는 길 페이지용 (같은 키를 한 화면에 두 번 쓰면 충돌) */
const MAPS = { footer: { ts: '1704946265363', key: '2hn6y' }, page: { ts: '1704763948315', key: '2hkkx' } };
let loading: Promise<void> | null = null;

function load(src: string) {
  return new Promise<void>((res) => {
    const s = document.createElement('script');
    s.src = src;
    s.charset = 'UTF-8';
    s.onload = () => res();
    s.onerror = () => res();
    document.head.appendChild(s);
  });
}

function loadKakao() {
  if (loading) return loading;
  loading = (async () => {
    const written: string[] = [];
    const orig = document.write;
    document.write = (...h: string[]) => {
      written.push(h.join(''));
    };
    await load('https://ssl.daumcdn.net/dmaps/map_js_init/roughmapLoader.js');
    for (const html of written) {
      const css = html.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (css) {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = css[1];
        document.head.appendChild(l);
      }
      const re = /<script[^>]*src=["']([^"']+)["']/gi;
      let m;
      while ((m = re.exec(html))) await load(m[1]);
    }
    document.write = orig;
  })();
  return loading;
}

export default function KakaoMap({ height = 360, which = 'footer' }: { height?: number; which?: keyof typeof MAPS }) {
  const { ts: TIMESTAMP, key: KEY } = MAPS[which];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    const el = ref.current;
    if (!el) return;
    const draw = () =>
      loadKakao().then(() => {
        const daum = (window as unknown as { daum?: Daum }).daum;
        if (!alive || !daum?.roughmap || !ref.current || ref.current.childElementCount) return;
        new daum.roughmap.Lander({ timestamp: TIMESTAMP, key: KEY, mapWidth: '100%', mapHeight: String(height) }).render();
      });
    // 지도는 화면 가까이 왔을 때만 불러온다(첫 화면 속도)
    if (!('IntersectionObserver' in window)) {
      draw();
      return () => {
        alive = false;
      };
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect();
          draw();
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, [height, TIMESTAMP, KEY]);
  return (
    <div className="kmap">
      <div ref={ref} id={`daumRoughmapContainer${TIMESTAMP}`} className="root_daum_roughmap root_daum_roughmap_landing" />
    </div>
  );
}
