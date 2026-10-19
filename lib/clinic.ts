import photos from './clinic_photos.json';
import { loadPage, type Section } from './content';

/**
 * 진료과목 7쪽(자동차사고·척추관절·내과·여성·피부·정신건강·다이어트)을
 * 통이미지 대신 HTML/CSS 로 그리기 위한 데이터.
 * - 글: content/sub_clinic_pageNN.json (원본 이미지와 글자 단위 대조 완료)
 * - 사진: tools/clinic_photos.py 가 원본에서 다시 잘라 낸 것(lib/clinic_photos.json)
 */
type Pic = { src: string; wh: [number, number] };
type PhotoRec = {
  main?: string;
  box?: number[];
  callout?: number[];
  wh?: number[];
  band?: string;
  bandWh?: number[];
  items?: { src: string; wh: number[]; side?: string }[];
};
const PHOTOS = photos as unknown as Record<string, Record<string, PhotoRec>>;

export type ClinicItem = { num?: string; title?: string; text?: string; photo?: Pic };
export type ClinicSection = Omit<Section, 'items' | 'photo'> & {
  photo?: Pic;
  /** 원본 설명 박스 위치(사진 왼쪽 기준 x, 폭) — 블록마다 조금씩 다르다 */
  co?: { x: number; w: number };
  band?: Pic;
  items: ClinicItem[];
  side?: string[];
};
export type ClinicPage = { slug: string; title: string; sections: ClinicSection[]; tabs: string[] };

export const CLINIC_PAGES = ['page01', 'page02', 'page03', 'page04', 'page05', 'page06', 'page07'];

export function isClinic(group: string, page: string) {
  return group === 'clinic' && CLINIC_PAGES.includes(page);
}

const pic = (src?: string, wh?: number[]): Pic | undefined => (src && wh ? { src, wh: [wh[0], wh[1]] } : undefined);

export function loadClinic(page: string): ClinicPage {
  const slug = `sub_clinic_${page}`;
  const data = loadPage(slug);
  const ph = PHOTOS[slug] ?? {};
  const tabs: string[] = [];
  const sections = data.sections.map((s) => {
    const p = ph[s.id] ?? {};
    if (s.tab && !tabs.includes(s.tab)) tabs.push(s.tab);
    const items = (s.items ?? []).map((it, i) => {
      const ip = p.items?.[i];
      return { num: it.num, title: it.title, text: it.text, photo: pic(ip?.src, ip?.wh) };
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { photo: _p, items: _i, ...rest } = s;
    return {
      ...rest,
      photo: pic(p.main, p.wh),
      co: p.callout && p.box ? { x: p.callout[0] - p.box[0], w: p.callout[2] } : undefined,
      band: pic(p.band, p.bandWh),
      items,
      side: p.items?.map((x) => x.side ?? ''),
    } as ClinicSection;
  });
  return { slug, title: data.title, sections, tabs };
}
