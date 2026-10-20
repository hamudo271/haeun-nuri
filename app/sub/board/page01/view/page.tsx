import type { Metadata } from 'next';
import SubLayout from '@/components/SubLayout';

/** 해운누리 소식 글 한 편의 틀 — 서버가 /sub/board/page01/:id/ 로 열 때 이 틀에 글을 채운다 */
export const metadata: Metadata = { title: '해운누리 소식' };

export default function PostView() {
  return (
    <SubLayout href="/sub/board/page01/">
      <div className="wrap narrow">
        <div id="cms-root" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: '' }} />
      </div>
    </SubLayout>
  );
}
