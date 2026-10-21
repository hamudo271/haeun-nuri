import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import SubLayout from '@/components/SubLayout';
import Coverflow from '@/components/Coverflow';
import Pic from '@/components/Pic';

export const metadata: Metadata = pageMeta('/sub/about/page04/');

const PHOTOS = ['01', '02', '03', '04', '05', '06', '07'].map((n) => `/img/facility/${n}.jpg`);

export default function Tour() {
  return (
    <SubLayout href="/sub/about/page04/">
      <div className="wrap">
        <div className="blk-head center" data-rv="up">
          <p className="label">( Our Space )</p>
          <h2 className="blk-title">접수처부터 1인실 입원실까지</h2>
        </div>
      </div>
      <div className="light-bg tour-cf" data-rv="up">
        <Coverflow images={PHOTOS} alt="해운누리한의원" />
      </div>
      <div className="wrap">
        <div className="tour-grid">
          {PHOTOS.map((p, i) => (
            <figure key={p} data-rv="up" style={{ ['--d' as string]: `${(i % 3) * 90}ms` }}>
              <Pic src={p} alt={`해운누리한의원 ${i + 1}`} />
              <figcaption>해운누리한의원</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </SubLayout>
  );
}
