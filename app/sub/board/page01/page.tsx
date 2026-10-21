import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import SubLayout from '@/components/SubLayout';

/** 해운누리 소식 — 화면 틀만 정적으로 만들고, #cms-root 내용은 서버(server/server.js)가 데이터베이스 글로 채운다 */
export const metadata: Metadata = pageMeta('/sub/board/page01/');

export default function Board() {
  return (
    <SubLayout href="/sub/board/page01/">
      <div className="wrap narrow">
        <div id="cms-root" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: '' }} />
      </div>
    </SubLayout>
  );
}
