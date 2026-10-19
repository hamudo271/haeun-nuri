import { SITE } from '@/lib/site';

/** 오른쪽 고정 퀵패널(PC)과 하단 바(모바일). 성형외과 상위 사이트처럼 한 장의 세로 패널에 아이콘+한글 이름을 묶고,
 *  카톡·네이버는 누구나 알아보는 브랜드 색 원으로, 전화·지도는 가는 선 아이콘으로 둔다. */
export default function QuickDock() {
  return (
    <>
      <aside className="qd" aria-label="빠른 메뉴">
        <ul className="qd-panel">
          <li>
            <a className="qd-item is-book" href={SITE.booking} target="_blank" rel="noopener noreferrer">
              <i className="qd-ico qd-naver" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M7.5 6.5h3l3.1 4.6V6.5h2.9v11h-3l-3.1-4.6v4.6H7.5z" /></svg>
              </i>
              <span>네이버예약</span>
            </a>
          </li>
          <li>
            <a className="qd-item" href={SITE.kakao} target="_blank" rel="noopener noreferrer">
              <i className="qd-ico qd-kakao" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M12 5.2c-4.4 0-8 2.8-8 6.2 0 2.2 1.5 4.1 3.7 5.2l-.8 2.9c-.1.3.2.5.4.3l3.4-2.3c.4 0 .9.1 1.3.1 4.4 0 8-2.8 8-6.2s-3.6-6.2-8-6.2z" /></svg>
              </i>
              <span>카톡상담</span>
            </a>
          </li>
          <li>
            <a className="qd-item" href={`tel:${SITE.tel}`}>
              <i className="qd-ico qd-line" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M7.4 4.5H5.6c-.6 0-1.1.5-1.1 1.1C4.5 13.3 10.7 19.5 18.4 19.5c.6 0 1.1-.5 1.1-1.1v-1.8c0-.5-.3-.9-.8-1l-2.9-.9c-.4-.1-.8 0-1.1.3l-1.3 1.3a12.4 12.4 0 0 1-5.7-5.7L9 9.3c.3-.3.4-.7.3-1.1l-.9-2.9c-.1-.5-.5-.8-1-.8z" /></svg>
              </i>
              <span>전화상담</span>
              <em className="qd-tip">{SITE.tel}</em>
            </a>
          </li>
          <li>
            <a className="qd-item" href="/sub/about/page02/">
              <i className="qd-ico qd-line" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M12 20.5s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0c0 5 6.5 11 6.5 11z" /><circle cx="12" cy="9.5" r="2.3" /></svg>
              </i>
              <span>오시는 길</span>
            </a>
          </li>
        </ul>
        <a className="qd-top" href="#top" aria-label="맨 위로">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14l5-5 5 5" /></svg>
          <span>TOP</span>
        </a>
      </aside>
      <nav className="mbar" aria-label="모바일 빠른 메뉴">
        <a href={`tel:${SITE.tel}`}>전화상담</a>
        <a href={SITE.kakao} target="_blank" rel="noopener noreferrer">카톡상담</a>
        <a href={SITE.booking} target="_blank" rel="noopener noreferrer" className="on">네이버예약</a>
        <a href="/sub/about/page02/">오시는 길</a>
      </nav>
    </>
  );
}
