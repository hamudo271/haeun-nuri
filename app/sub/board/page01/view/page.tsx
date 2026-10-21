import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import SubLayout from '@/components/SubLayout';

/** 해운누리 소식 글 한 편의 틀 — 서버가 /sub/board/page01/:id/ 로 열 때 이 틀에 글을 채운다 */
// 글 한 편의 틀: 목록 페이지의 og 이미지를 기본값으로 두고, 제목·설명·주소·사진은 서버(postHead)가 글 것으로 바꾼다
export const metadata: Metadata = pageMeta('/sub/board/page01/');

export default function PostView() {
  return (
    <SubLayout href="/sub/board/page01/" ld={false}>
      <div className="wrap narrow">
        <div id="cms-root" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: '' }} />
      </div>
    </SubLayout>
  );
}
