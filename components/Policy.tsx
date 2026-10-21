import fs from 'node:fs';
import path from 'node:path';

/** 이용안내·개인정보보호정책 — 원본 페이지 문구 그대로 */
export default function Policy({ slug }: { slug: 'personal' | 'service_rull' }) {
  const blocks: { tag: string; text: string }[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', `${slug}.json`), 'utf8'));
  return (
    <article className="prose" data-rv="up">
      {blocks.map((b, i) =>
        // 원고의 h4/h5 는 페이지 h1 바로 아래 단계로(h2/h3) — 제목 단계를 건너뛰지 않게
        b.tag === 'h4' ? <h2 key={i}>{b.text}</h2> : b.tag === 'h5' ? <h3 key={i}>{b.text}</h3> : <p key={i}>{b.text}</p>,
      )}
    </article>
  );
}
