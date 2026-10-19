import data from './details.json';

/** 원본 통이미지 상세페이지를 디자인 단위로 자른 조각(tools/slice_details.py 가 만든다) */
export type Slice = { src: string; w: number; h: number; kind: 'band' | 'photo' | 'text'; alt: string; first: boolean; img: number };
export type Block =
  | { type: 'img'; anchor: string | null; pc: Slice[]; mo: Slice[] }
  | { type: 'anchors'; items: { id: string; label: string }[] }
  | { type: 'tabs'; tabs: { label: string; pc: Slice[]; mo: Slice[] }[] };
export type Detail = { blocks: Block[] };

const ALL = data as unknown as Record<string, Detail>;

export function detailFor(group: string, page: string): Detail | undefined {
  return ALL[`${group}/${page}`];
}
