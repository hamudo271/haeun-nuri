'use client';

import { useEffect, useState } from 'react';
import { NAV, SITE } from '@/lib/site';
import Pic from './Pic';

/**
 * 상단 헤더
 * - 처음에는 사진 위에 투명하게 얹히고, 조금 내리면 아이보리 바탕으로 바뀐다.
 * - 아래로 내릴 때는 숨고, 위로 올리면 다시 나온다(더가든 방식).
 * - PC: 로고를 가운데 두고 메뉴를 좌우로 나눈다. 메뉴에 올리면 그 항목 아래에만
 *   작은 어두운 카드가 내려온다(더가든피부과 실측: 반투명 검정 카드·라운드 8px·14px 글자).
 *   오른쪽 "Menu" 는 전체 메뉴 판을 연다(골든디아망: 아이보리 판, 한글 제목 + 금색 이탤릭 영문).
 * - 모바일: 전체 화면 아코디언 메뉴.
 */
// 왼쪽 4 · 오른쪽 2(+예약·Menu)로 나눠야 로고 양옆 무게가 맞는다
const LEFT = NAV.slice(0, 4);
const RIGHT = NAV.slice(4);
// 전체 메뉴 판의 세 칸(항목 수가 비슷하게 나뉘도록 묶는다)
const COLS = [NAV.slice(0, 2), NAV.slice(2, 4), NAV.slice(4)];

// 드롭다운 카드 왼쪽에 붙는 공간 사진(메뉴마다 다르게)
const DROP_PIC: Record<string, string> = {
  about: '/img/facility/01.jpg',
  hospital: '/img/facility/03.jpg',
  treatment: '/img/main/img-03.jpg',
  clinic: '/img/main/img-02.jpg',
  media: '/img/facility/07.jpg',
  board: '/img/space/16.jpg',
};

function Gnb({ groups }: { groups: typeof NAV }) {
  return (
    <ul className="hd-gnb">
      {groups.map((g) => (
        <li key={g.key}>
          <a href={g.items[0].href}>{g.label}</a>
          <div className="hd-drop">
            <div className="hd-drop-pic">
              <Pic src={DROP_PIC[g.key] ?? g.hero} alt="" ariaHidden />
              <em className="en">{g.en}</em>
            </div>
            <ul>
              {g.items.map((i, k) => (
                <li key={i.href} style={{ ['--i' as string]: k }}>
                  <a href={i.href}>
                    <span className="no en">{String(k + 1).padStart(2, '0')}</span>
                    {i.label}
                    <span className="arr" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Header() {
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [acc, setAcc] = useState<string | null>(null);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 60);
      setHidden(y > 420 && y > last + 2);
      if (y < last - 2) setHidden(false);
      last = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const cls = ['hd', solid ? 'is-solid' : '', hidden && !open ? 'is-hidden' : '', open ? 'is-open' : ''].filter(Boolean).join(' ');

  return (
    <>
      <header className={cls}>
        <div className="hd-bar">
          <nav className="hd-side hd-left" aria-label="주 메뉴">
            <Gnb groups={LEFT} />
          </nav>
          <a className="hd-logo" href="/" aria-label={SITE.name}>
            <Pic className="logo-w" src="/img/brand/logo-white.png" alt={SITE.name} eager />
            <Pic className="logo-b" src="/img/brand/logo-brown.png" alt="" eager ariaHidden />
          </a>
          <div className="hd-side hd-right">
            <nav aria-label="주 메뉴 2">
              <Gnb groups={RIGHT} />
            </nav>
            <a className="hd-book" href={SITE.booking} target="_blank" rel="noopener noreferrer">
              <span className="en">Reservation</span>
              <span className="ko">예약</span>
            </a>
            <button className="hd-burger" type="button" aria-label={open ? '메뉴 닫기' : '전체 메뉴 열기'} aria-expanded={open} onClick={() => setOpen(!open)}>
              <span className="en">Menu</span>
              <span className="lines">
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>

        {/* 모바일 전체 화면 메뉴 */}
        <div className="hd-mob" aria-hidden={!open}>
          <ul className="hd-mob-list">
            {NAV.map((g) => (
              <li key={g.key} className={acc === g.key ? 'is-on' : ''}>
                <button type="button" onClick={() => setAcc(acc === g.key ? null : g.key)}>
                  <span>{g.label}</span>
                  <small className="en">{g.en}</small>
                </button>
                <ul>
                  {g.items.map((i) => (
                    <li key={i.href}>
                      <a href={i.href}>{i.label}</a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="hd-mob-foot">
            <a href={`tel:${SITE.tel}`} className="tel">
              {SITE.tel}
            </a>
            <ul className="hours">
              {SITE.hours.map((h) => (
                <li key={h.label}>
                  <span>{h.label}</span> {h.time}
                </li>
              ))}
            </ul>
            <a className="btn btn-gold" href={SITE.booking} target="_blank" rel="noopener noreferrer">
              네이버 예약하기
            </a>
          </div>
        </div>
      </header>

      {/* PC 전체 메뉴 판 — 헤더(backdrop-filter)가 fixed 기준이 되지 않도록 헤더 밖에 둔다 */}
      <div className={`hd-full ${open ? 'is-on' : ''}`} aria-hidden={!open} inert={!open}>
        <div className="hd-full-top">
          <a className="hd-full-logo" href="/" aria-label={SITE.name}>
            <Pic src="/img/brand/logo-brown.png" alt={SITE.name} />
          </a>
          <button className="hd-full-close" type="button" onClick={() => setOpen(false)}>
            닫기 <span aria-hidden="true" />
          </button>
        </div>
        <div className="hd-full-body">
          {COLS.map((col, c) => (
            <div key={c} className="hd-full-col">
              {col.map((g) => (
                <div key={g.key} className="hd-full-group">
                  <p className="hd-full-h">
                    {g.label}
                    <em className="en">{g.en}</em>
                  </p>
                  <ul>
                    {g.items.map((i) => (
                      <li key={i.href}>
                        <a href={i.href}>{i.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
          <div className="hd-full-info">
            <p className="hd-full-h">
              진료 안내<em className="en">Contact</em>
            </p>
            <a className="tel" href={`tel:${SITE.tel}`}>
              {SITE.tel}
            </a>
            <ul className="hours">
              {SITE.hours.map((h) => (
                <li key={h.label}>
                  <span>{h.label}</span>
                  {h.time}
                </li>
              ))}
            </ul>
            <a className="btn btn-gold" href={SITE.booking} target="_blank" rel="noopener noreferrer">
              네이버 예약하기
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
