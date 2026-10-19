import type { Metadata } from 'next';
import SubLayout from '@/components/SubLayout';
import Policy from '@/components/Policy';

export const metadata: Metadata = { title: '이용안내', alternates: { canonical: '/service_rull/' } };

export default function Page() {
  return (
    <SubLayout href="/service_rull/" title="이용안내">
      <div className="wrap">
        <Policy slug="service_rull" />
      </div>
    </SubLayout>
  );
}
