import { NAV, SITE, findNav } from '@/lib/site';
import { loadPage, photoSrc, contentSlugs } from '@/lib/content';
import { webpOf } from './Pic';
import Faq from './Faq';
import { SEO } from '@/lib/seo';

/**
 * 상세페이지 끝맺음 — 형통 리뉴얼·더가든 연출
 * 1) 스크롤에 따라 옆으로 흐르는 큰 영문 글자(형통 flow-txt)
 * 2) 아치로 열리는 짙은 예약 구간(더가든 Private Room) + 원이 번지는 예약 버튼(형통 btn-circle-ani)·마우스 자석
 * 3) 이전·다음 진료 카드: 마우스 기울기 + 사진 확대
 */
const SLUGS = new Set(contentSlugs());

/** 코딩으로 다시 그린 페이지의 대표 사진(글자 없는 사진) — 이전·다음 카드 배경 */
const CARD_PHOTO: Record<string, string> = {
  '/sub/clinic/page01/': '/img/clinic/p1/intro.jpg',
  '/sub/clinic/page02/': '/img/clinic/p2/intro.jpg',
  '/sub/clinic/page03/': '/img/clinic/p3/intro.jpg',
  '/sub/clinic/page04/': '/img/clinic/p4/intro.jpg',
  '/sub/clinic/page05/': '/img/clinic/p5/intro.jpg',
  '/sub/clinic/page06/': '/img/clinic/p6/intro.jpg',
  '/sub/clinic/page07/': '/img/clinic/p7/intro.jpg',
};

function cardPhoto(href: string, fallback: string) {
  if (CARD_PHOTO[href]) return CARD_PHOTO[href];
  const m = href.match(/^\/sub\/([^/]+)\/([^/]+)\//);
  if (m && SLUGS.has(`sub_${m[1]}_${m[2]}`)) {
    const p = loadPage(`sub_${m[1]}_${m[2]}`);
    for (const s of p.sections) {
      const ph = s.photo || s.photos?.[0] || s.items?.find((i) => i.photo)?.photo;
      if (ph) return photoSrc(ph) as string;
    }
  }
  return fallback;
}

/** 함께 보기: lib/seo.ts related — 링크 글자는 그 페이지의 검색어(hero 첫 토막), 작은 글자는 메뉴 이름 */
export function Related({ href }: { href: string }) {
  const list = (SEO[href]?.related ?? []).map((p) => ({ href: p, nav: findNav(p)?.item.label, kw: SEO[p]?.hero?.split(' · ')[0] })).filter((r) => r.nav);
  if (!list.length) return null;
  return (
    <section className="rel" aria-labelledby="rel-title">
      <div className="wrap">
        <div className="rel-head" data-rv="up">
          <p className="label">( Related )</p>
          <h2 className="blk-title" id="rel-title">
            함께 보기
          </h2>
        </div>
        <ul className="rel-list" data-rv="up">
          {list.map((r) => (
            <li key={r.href}>
              <a href={r.href}>
                <small>{r.nav}</small>
                <span>{r.kw ?? r.nav}</span>
                <i className="rel-arr" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function SubOutro({ href }: { href: string }) {
  const found = findNav(href);
  const group = found?.group ?? NAV[0];
  const items = group.items;
  const i = items.findIndex((it) => it.href === href);
  const prev = items.length > 1 ? items[(i - 1 + items.length) % items.length] : null;
  const next = items.length > 1 ? items[(i + 1) % items.length] : null;
  return (
    <>
      <Faq path={href} />
      <Related href={href} />
      <div className="flow" data-flow aria-hidden="true">
        <p>
          Haeun-Nuri Oriental Clinic <i>·</i> Haeun-Nuri Oriental Clinic <i>·</i> Haeun-Nuri Oriental Clinic <i>·</i>
        </p>
      </div>
      <section className="outro" data-prog>
        <div className="outro-arch" aria-hidden="true" />
        <div className="wrap outro-in">
          <p className="label light">( Reservation )</p>
          <p className="outro-title">
            해운누리한의원에서
            <br />
            <em>편안한 진료</em> 받으시길 바랍니다.
          </p>
          <ul className="outro-hours">
            {SITE.hours.map((h) => (
              <li key={h.label}>
                <span>{h.label}</span>
                {h.time}
              </li>
            ))}
          </ul>
          <div className="outro-btns">
            <a className="cbtn" href={`tel:${SITE.tel}`} data-magnet>
              <i aria-hidden="true" />
              <span>
                <small>전화 상담</small>
                {SITE.tel}
              </span>
            </a>
            <a className="cbtn" href={SITE.booking} target="_blank" rel="noopener" data-magnet>
              <i aria-hidden="true" />
              <span>
                <small>Naver</small>네이버 예약
              </span>
            </a>
            <a className="cbtn" href={SITE.kakao} target="_blank" rel="noopener" data-magnet>
              <i aria-hidden="true" />
              <span>
                <small>Kakao</small>카카오톡 상담
              </span>
            </a>
          </div>
        </div>
      </section>
      {prev && next && (
        <nav className={`pn${prev === next ? ' pn--one' : ''}`} aria-label="다른 메뉴 보기">
          {(prev === next
            ? [{ it: next, dir: 'Next', ko: '함께 보기' }]
            : [
                { it: prev, dir: 'Prev', ko: '이전' },
                { it: next, dir: 'Next', ko: '다음' },
              ]
          ).map(({ it, dir, ko }) => (
            <a key={dir} className={`pn-card pn-${dir.toLowerCase()}`} href={it.href} data-tilt>
              <span className="pn-img" style={{ backgroundImage: `url(${webpOf(cardPhoto(it.href, group.hero))})` }} />
              <span className="pn-txt">
                <span className="en">{dir}</span>
                <small>
                  {ko} {group.label}
                </small>
                <strong>{it.label}</strong>
              </span>
              <span className="pn-arr" aria-hidden="true" />
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
