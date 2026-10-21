import { preload } from 'react-dom';
import { NAV, findNav } from '@/lib/site';
import { webpOf } from './Pic';
import JsonLd from './JsonLd';
import { pageGraph, SEO } from '@/lib/seo';

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
  ld = true,
  h1 = true,
  children,
}: {
  href: string;
  title?: string;
  detail?: boolean;
  /** 메뉴에 없는 페이지의 상단 경로·영문 표기(기본: 이용안내 / Policy) */
  crumb?: { label: string; en: string };
  /** 이 페이지의 구조화 데이터(경로·FAQ 등)를 넣을지 — 글 보기 틀은 서버가 글 정보를 따로 넣으므로 false */
  ld?: boolean;
  /** 상단 큰 제목을 h1 으로 — 글 보기 틀은 글 제목이 h1 이어야 하므로 false(같은 모양의 p) */
  h1?: boolean;
  children: React.ReactNode;
}) {
  const found = findNav(href);
  const group = found?.group ?? { ...NAV[0], label: crumb?.label ?? '이용안내', en: crumb?.en ?? 'Policy', items: [] };
  const label = title ?? found?.item.label ?? '';
  const hero = webpOf(group.hero);
  const Title = h1 ? 'h1' : 'p';
  // 큰 제목 아래 검색어 한 줄(예: '해운대 교통사고 한의원') — h1 안에 들어가 검색엔진이 페이지 주제를 바로 읽는다
  const tag = h1 ? SEO[href]?.hero : undefined;
  // 모바일은 사진의 가운데만 보이므로 가운데를 잘라 둔 작은 파일(-m, scripts/hero-mobile.mjs)을 받는다 — 보이는 모습은 같다
  const heroM = hero.replace(/\.webp$/, '-m.webp');
  // 첫 화면 큰 사진을 먼저 받게(LCP). 404 틀은 Next 가 모든 페이지에 함께 그려 두므로 미리받기를 걸지 않는다
  // (걸면 메인·서브 어디서나 404 배경 사진을 먼저 받는다)
  if (href !== '/404/') {
    preload(hero, { as: 'image', media: '(min-width: 768px)' });
    preload(heroM, { as: 'image', media: '(max-width: 767px)' });
  }
  return (
    <>
      {ld && <JsonLd data={pageGraph(href)} />}
      <section className="sub-hero" data-mouse>
        <div className="sub-hero-bg" style={{ ['--hero' as string]: `url(${hero})`, ['--hero-m' as string]: `url(${heroM})` }} data-parallax="0.15" data-depth="-26" />
        <div className="wrap sub-hero-in" data-depth="14">
          <p className="crumb">
            <a href="/">HOME</a> <i>/</i> {group.label} <i>/</i> {label}
          </p>
          <p className="en">{group.en}</p>
          <Title className="sub-hero-title">
            {/* 읽히는 글은 숨김 텍스트 하나, 글자 하나씩 올라오는 연출은 보조기기에서 통째로 숨김(span 에 aria-label 은 규칙 위반) */}
            <span className="sr-only">{label}</span>
            <span className="split" aria-hidden="true">
              {Array.from(label).map((c, k) => (
                <span key={k} style={{ ['--i' as string]: k }}>
                  {c === ' ' ? '\u00a0' : c}
                </span>
              ))}
            </span>
            {tag && (
              <>
                {' '}
                <span className="sub-hero-tag">{tag}</span>
              </>
            )}
          </Title>
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
