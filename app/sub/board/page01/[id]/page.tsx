import type { Metadata } from 'next';
import SubLayout from '@/components/SubLayout';
import { POSTS } from '@/lib/board';

export const dynamicParams = false;
export function generateStaticParams() {
  return POSTS.map((p) => ({ id: p.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: POSTS.find((p) => p.id === id)?.title, alternates: { canonical: `/sub/board/page01/${id}/` } };
}

export default async function PostView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const i = POSTS.findIndex((p) => p.id === id);
  const p = POSTS[i];
  const prev = POSTS[i + 1];
  const next = POSTS[i - 1];
  return (
    <SubLayout href="/sub/board/page01/">
      <div className="wrap narrow">
        <div className="post-head" data-rv="up">
          <p className="label">( Notice )</p>
          <h2>{p.title}</h2>
          <p className="post-meta">
            {p.date} · {p.author}
          </p>
        </div>
        <div className="post-body">{p.body}</div>
        {p.file && (
          <div className="post-file">
            <b>첨부파일</b>
            <a href={p.file.href} download={p.file.name}>
              {p.file.name}
            </a>
          </div>
        )}
        <div className="post-nav">
          {prev && (
            <a className="btn btn-line" href={`/sub/board/page01/${prev.id}/`}>
              이전글
            </a>
          )}
          <a className="btn btn-gold" href="/sub/board/page01/">
            목록
          </a>
          {next && (
            <a className="btn btn-line" href={`/sub/board/page01/${next.id}/`}>
              다음글
            </a>
          )}
        </div>
      </div>
    </SubLayout>
  );
}
