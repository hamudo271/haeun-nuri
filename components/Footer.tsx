import { NAV, SITE } from '@/lib/site';
import KakaoMap from './KakaoMap';
import Pic from './Pic';

/** 하단: 예약·연락 블록 + 사이트맵 + 사업자 정보 (원본 푸터 내용 그대로) */
export default function Footer() {
  return (
    <footer className="ft">
      <section className="ft-contact">
        <div className="wrap ft-grid">
          <div className="ft-info" data-rv="up">
            <p className="label">( Contact Us )</p>
            <h2 className="ft-title">진료상담 및 진료예약안내</h2>
            <a className="ft-tel" href={`tel:${SITE.tel}`}>
              {SITE.tel}
            </a>
            <dl className="ft-hours">
              <dt>진료시간</dt>
              {SITE.hours.map((h) => (
                <dd key={h.label}>
                  <span>- {h.label}</span>
                  <b>{h.time}</b>
                </dd>
              ))}
            </dl>
            <div className="ft-btns">
              <a className="btn btn-gold" href={SITE.booking} target="_blank" rel="noopener noreferrer">
                진료예약 하기 <span className="arr" aria-hidden="true" />
              </a>
              <a className="btn btn-line" href={SITE.kakao} target="_blank" rel="noopener noreferrer">
                카카오톡 상담
              </a>
            </div>
          </div>
          <div className="ft-map" data-rv="up" style={{ ['--d' as string]: '120ms' }}>
            <p className="ft-addr-label">주소</p>
            <p className="ft-addr">{SITE.address}</p>
            <KakaoMap height={320} />
          </div>
        </div>
      </section>
      <section className="ft-bottom">
        <div className="wrap">
          <div className="ft-top">
            <Pic src="/img/brand/logo-white.png" alt={SITE.name} className="ft-logo" />
            <nav className="ft-sitemap" aria-label="사이트맵">
              {NAV.map((g) => (
                <div key={g.key}>
                  <p>{g.label}</p>
                  {g.items.map((i) => (
                    <a key={i.href} href={i.href}>
                      {i.label}
                    </a>
                  ))}
                </div>
              ))}
            </nav>
          </div>
          <div className="ft-legal">
            <p className="links">
              <a href="/service_rull/">이용안내</a>
              <a href="/personal/">개인정보보호정책</a>
            </p>
            <p>
              {SITE.address}
              <br />
              전화 : {SITE.tel} <i>/</i> 사업자 등록번호 : {SITE.bizNo} <i>/</i> 대표 : {SITE.ceo}
            </p>
            <p className="copy">{SITE.copyright}</p>
          </div>
        </div>
      </section>
    </footer>
  );
}
