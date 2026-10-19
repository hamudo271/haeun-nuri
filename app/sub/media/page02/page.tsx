import type { Metadata } from 'next';
import SubLayout from '@/components/SubLayout';
import SubOutro from '@/components/SubOutro';
import MediaClient from '@/components/MediaClient';

/** 해운누리 미디어 — 화면 틀만 정적으로 만들고, #cms-root 내용은 Cloudflare Functions(functions/sub/media)가 채운다 */
export const metadata: Metadata = { title: '전문칼럼', description: '해운누리한의원 원장님이 직접 쓰는 건강 칼럼입니다.', openGraph: { title: '전문칼럼 | 해운누리한의원', description: '해운누리한의원 원장님이 직접 쓰는 건강 칼럼입니다.' }, alternates: { canonical: '/sub/media/page02/' } };

export default function Page() {
  const href = '/sub/media/page02/';
  return (
    <SubLayout href={href}>
      <div className="wrap md-wrap">
        <div id="cms-root" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: '' }} />
      </div>
      <MediaClient />
      <SubOutro href={href} />
    </SubLayout>
  );
}
