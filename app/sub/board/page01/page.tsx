import type { Metadata } from 'next';
import SubLayout from '@/components/SubLayout';
import { POSTS } from '@/lib/board';

export const metadata: Metadata = { title: '해운누리 소식', alternates: { canonical: '/sub/board/page01/' } };

export default function Board() {
  return (
    <SubLayout href="/sub/board/page01/">
      <div className="wrap narrow">
        <div className="blk-head center" data-rv="up">
          <p className="label">( Notice )</p>
          <h2 className="blk-title">해운누리 소식</h2>
        </div>
        <ul className="board" data-rv="up">
          {POSTS.map((p, i) => (
            <li key={p.id}>
              <a href={`/sub/board/page01/${p.id}/`}>
                <span className="no">{String(POSTS.length - i).padStart(2, '0')}</span>
                <span className="tt">{p.title}</span>
                <span className="dt">
                  {p.date} · {p.author}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </SubLayout>
  );
}
