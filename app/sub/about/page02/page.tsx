import type { Metadata } from 'next';
import SubLayout from '@/components/SubLayout';
import KakaoMap from '@/components/KakaoMap';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: '오시는 길', alternates: { canonical: '/sub/about/page02/' } };

export default function Location() {
  return (
    <SubLayout href="/sub/about/page02/">
      <div className="wrap">
        <div className="blk-head center" data-rv="up">
          <p className="label">( Location )</p>
          <h2 className="blk-title">오시는 길</h2>
        </div>
        <div className="loc">
          <div className="loc-map" data-rv="up">
            <KakaoMap height={460} which="page" />
          </div>
          <dl className="loc-card" data-rv="up" style={{ ['--d' as string]: '120ms' }}>
            <dt>Address</dt>
            <dd>{SITE.address} 해운누리한의원</dd>
            <dt>Navigation</dt>
            <dd>
              내비게이션 검색시 <b>‘해운누리한의원’</b> 검색
            </dd>
            <dt>TEL</dt>
            <dd>
              <a href={`tel:${SITE.tel}`} className="loc-tel">
                {SITE.tel}
              </a>
            </dd>
            <dt>Hours</dt>
            <dd>
              <ul className="loc-hours">
                {SITE.hours.map((h) => (
                  <li key={h.label}>
                    <span>{h.label}</span> {h.time}
                  </li>
                ))}
              </ul>
            </dd>
            <div className="loc-btns">
              <a className="btn btn-line" href={SITE.naverMap} target="_blank" rel="noopener noreferrer">
                네이버지도 <span className="arr" aria-hidden="true" />
              </a>
              <a className="btn btn-gold" href={SITE.booking} target="_blank" rel="noopener noreferrer">
                진료예약 하기 <span className="arr" aria-hidden="true" />
              </a>
            </div>
          </dl>
        </div>
      </div>
    </SubLayout>
  );
}
