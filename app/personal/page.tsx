import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import SubLayout from '@/components/SubLayout';
import Policy from '@/components/Policy';

export const metadata: Metadata = pageMeta('/personal/');

export default function Page() {
  return (
    <SubLayout href="/personal/" title="개인정보보호정책">
      <div className="wrap">
        <Policy slug="personal" />
      </div>
    </SubLayout>
  );
}
