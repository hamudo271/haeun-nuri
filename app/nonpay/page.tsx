import type { Metadata } from 'next';
import SubLayout from '@/components/SubLayout';

/** 비급여 진료비용 — 가격표는 관리자(홈페이지 → 비급여 진료비용)에서 저장하면 서버가 #cms-root 에 채운다 */
export const metadata: Metadata = { title: '비급여 진료비용', alternates: { canonical: '/nonpay/' } };

export default function Page() {
  return (
    <SubLayout href="/nonpay/" title="비급여 진료비용">
      <div className="wrap narrow">
        <div className="blk-head center" data-rv="up">
          <p className="label">( Price )</p>
          <h2 className="blk-title">비급여 진료비용</h2>
        </div>
        <div id="cms-root" className="nonpay" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: '' }} />
      </div>
    </SubLayout>
  );
}
