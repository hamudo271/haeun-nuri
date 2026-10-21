import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import SubLayout from '@/components/SubLayout';
import Policy from '@/components/Policy';

export const metadata: Metadata = pageMeta('/service_rull/');

export default function Page() {
  return (
    <SubLayout href="/service_rull/" title="이용안내">
      <div className="wrap">
        <Policy slug="service_rull" />
      </div>
    </SubLayout>
  );
}
