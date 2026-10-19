import { preload } from 'react-dom';
import { NAV, findNav } from '@/lib/site';
import { webpOf } from './Pic';

/**
 * 서브페이지 상단: 큰 사진 제목 + 같은 메뉴 그룹의 페이지 이동 탭
 * - 사진: 스크롤 패럴랙스 + 마우스를 따라 반대로 움직임(형통 메인 비주얼 방식)
 * - 제목: 글자 하나씩 아래에서 올라옴
 * - 탭: 마우스를 올린 메뉴로 밑줄이 미끄러져 이동
 */
export default function SubLayout({
  href,
  title,
  detail,
  crumb,
  children,
}: {
  href: string;
  title?: string;
  detail?: boolean;
  /** 메뉴에 없는 페이지의 상단 경로·영문 표기(기본: 이용안내 / Policy) */
  crumb?: { label: string; en: string };
  children: React.ReactNode;
}) {
  const found = findNav(href);
  const group = found?.group ?? { ...NAV[0], label: crumb?.label ?? '이용안내', en: crumb?.en ?? 'Policy', items: [] };
  const label = title ?? found?.item.label ?? '';
  const hero = webpOf(group.hero);
  preload(hero, { as: 'image' }); // 첫 화면 큰 사진을 먼저 받게(LCP)
  return (
    <>
      <section className="sub-hero" data-mouse>
        <div className="sub-hero-bg" style={{ backgroundImage: `url(${hero})` }} data-parallax="0.15" data-depth="-26" />
        <div className="wrap sub-hero-in" data-depth="14">
          <p className="crumb">
            <a href="/">HOME</a> <i>/</i> {group.label} <i>/</i> {label}
          </p>
          <p className="en">{group.en}</p>
          <h1 className="split" aria-label={label}>
            {Array.from(label).map((c, k) => (
              <span key={k} aria-hidden="true" style={{ ['--i' as string]: k }}>
                {c === ' ' ? ' ' : c}
              </span>
            ))}
          </h1>
        </div>
        <span className="sub-hero-scroll" aria-hidden="true" />
      </section>
      {group.items.length > 1 && (
        <nav className="sub-nav" aria-label={`${group.label} 메뉴`}>
          <ul data-ind>
            {group.items.map((i) => (
              <li key={i.href}>
                <a href={i.href} className={i.href === href ? 'is-on' : ''} aria-current={i.href === href ? 'page' : undefined}>
                  {i.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className={detail ? 'sub-body sub-body--img' : 'sub-body'}>{children}</div>
    </>
  );
}
