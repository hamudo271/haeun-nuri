import type { Metadata } from 'next';
import SubLayout from '@/components/SubLayout';
import SubOutro from '@/components/SubOutro';
import HoursPage from '@/components/sub/HoursPage';
import { pageMeta } from '@/lib/seo';

/**
 * 진료시간 — 코딩으로 다시 그린 화면(components/sub/HoursPage).
 * 공통 [group]/[page] 가 아니라 제 경로를 두는 이유: 그 페이지의 CSS 만 받게. 공통 경로에서 코딩 화면 8개를 모두 불러오면
 * 서브 페이지마다 렌더링을 막는 CSS 가 7개(약 330KB)씩 붙는다.
 */
const HREF = '/sub/about/page01/';
export const metadata: Metadata = pageMeta(HREF);

export default function Page() {
  return (
    <SubLayout href={HREF} detail>
      <HoursPage />
      <SubOutro href={HREF} />
    </SubLayout>
  );
}
