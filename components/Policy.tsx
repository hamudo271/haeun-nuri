import fs from 'node:fs';
import path from 'node:path';

/** 이용안내·개인정보보호정책 — 원본 페이지 문구 그대로 */
export default function Policy({ slug }: { slug: 'personal' | 'service_rull' }) {
  const blocks: { tag: string; text: string }[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', `${slug}.json`), 'utf8'));
  return (
    <article className="prose" data-rv="up">
      {blocks.map((b, i) =>
        b.tag === 'h4' ? <h4 key={i}>{b.text}</h4> : b.tag === 'h5' ? <h5 key={i}>{b.text}</h5> : <p key={i}>{b.text}</p>,
      )}
    </article>
  );
}
