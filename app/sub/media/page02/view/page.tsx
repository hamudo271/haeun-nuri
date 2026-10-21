import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import SubLayout from '@/components/SubLayout';
import SubOutro from '@/components/SubOutro';
import MediaClient from '@/components/MediaClient';

/** 해운누리 미디어 — 화면 틀만 정적으로 만들고, #cms-root 내용은 Cloudflare Functions(functions/sub/media)가 채운다 */
// 글 한 편의 틀: 목록 페이지의 og 이미지를 기본값으로 두고, 제목·설명·주소·사진은 서버(postHead)가 글 것으로 바꾼다
export const metadata: Metadata = pageMeta('/sub/media/page02/');

export default function Page() {
  const href = '/sub/media/page02/';
  return (
    <SubLayout href={href} ld={false}>
      <div className="wrap md-wrap">
        <div id="cms-root" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: '' }} />
      </div>
      <MediaClient />
      <SubOutro href={href} />
    </SubLayout>
  );
}
