import type { Detail, Slice } from '@/lib/details';
import DetailAnchors from './DetailAnchors';
import DetailTabs from './DetailTabs';

/**
 * 원본 상세 이미지(디자인 그대로) + 조각마다 스크롤 연출.
 * - band : 갈색 띠 제목 → 왼쪽에서 오른쪽으로 걷히며 등장
 * - photo: 사진 묶음 → 살짝 확대된 상태에서 제자리로
 * - text : 글 단락 → 아래에서 떠오름
 * PC(1920px)와 모바일(750px) 이미지를 따로 쓰고, 보이지 않는 쪽은 내려받지 않는다(loading=lazy).
 */
export function Piece({ s, eager }: { s: Slice; eager?: boolean }) {
  return (
    <figure className={`dt-s k-${s.kind}`} data-rv="dt" style={{ aspectRatio: `${s.w} / ${s.h}` }}>
      <picture>
        <source srcSet={s.src.replace(/\.jpg$/, '.webp')} type="image/webp" />
        <img src={s.src} alt={s.alt} width={s.w} height={s.h} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      </picture>
    </figure>
  );
}

export function Pair({ pc, mo, eager }: { pc: Slice[]; mo: Slice[]; eager?: boolean }) {
  return (
    <>
      <div className="dt-pc">
        {pc.map((s, i) => (
          <Piece key={s.src} s={s} eager={eager && i < 2} />
        ))}
      </div>
      <div className="dt-mo">
        {mo.map((s, i) => (
          <Piece key={s.src} s={s} eager={eager && i < 2} />
        ))}
      </div>
    </>
  );
}

export default function DetailImages({ detail }: { detail: Detail }) {
  return (
    <div className="dt">
      {detail.blocks.map((b, k) => {
        if (b.type === 'img')
          return (
            <section key={k} id={b.anchor ?? undefined} className="dt-block" data-spy={b.anchor ?? undefined}>
              <Pair pc={b.pc} mo={b.mo} eager={k === 0} />
            </section>
          );
        if (b.type === 'anchors') return <DetailAnchors key={k} items={b.items} />;
        return <DetailTabs key={k} tabs={b.tabs} />;
      })}
    </div>
  );
}
