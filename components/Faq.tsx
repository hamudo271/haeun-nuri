import { SEO } from '@/lib/seo';

/**
 * 자주 묻는 질문 — lib/seo.ts 의 faq 를 화면에 그린다(같은 글이 FAQPage 구조화 데이터로도 나간다).
 * <details> 라 닫혀 있어도 글이 HTML 안에 있어 검색엔진·AI 가 읽는다.
 */
export default function Faq({ path }: { path: string }) {
  const faq = SEO[path]?.faq;
  if (!faq?.length) return null;
  return (
    <section className="faq" aria-labelledby="faq-title">
      <div className="wrap narrow">
        <div className="blk-head center" data-rv="up">
          <p className="label">( FAQ )</p>
          <h2 className="blk-title" id="faq-title">
            자주 묻는 질문
          </h2>
        </div>
        <div className="faq-list" data-rv="up">
          {faq.map((f, i) => (
            <details key={f.q} className="faq-item" open={i === 0}>
              <summary>
                <span className="faq-mark" aria-hidden="true">
                  Q
                </span>
                <span className="faq-q">{f.q}</span>
                <i className="faq-ico" aria-hidden="true" />
              </summary>
              <div className="faq-a">
                <span className="faq-mark" aria-hidden="true">
                  A
                </span>
                <p>{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
