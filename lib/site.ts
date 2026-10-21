/** 해운누리한의원 기본 정보 — 원본 사이트(haeun-nuri.com)에 적힌 값 그대로 */

/** 대표 주소(검색엔진·공유·사이트맵 기준). www.haeun-nuri.com 은 서버가 여기로 301 보낸다(server/site.js FALLBACK 과 같게) */
export const ORIGIN = 'https://haeun-nuri.com';

export const SITE = {
  name: '해운누리한의원',
  nameEn: 'Haeun-Nuri Oriental Clinic',
  tel: '051-715-4723',
  address: '부산시 해운대구 세실로 48, 해운대삼정코아주상복합 제2층',
  bizNo: '660-96-01503',
  ceo: '구가현',
  booking: 'https://m.booking.naver.com/booking/13/bizes/973835#',
  kakao: 'http://pf.kakao.com/_xgeTlG',
  naverMap:
    'https://map.naver.com/p/entry/place/1413333643?placePath=%252Fhome%253Fentry%253Dplt&searchType=place&lng=129.1781289&lat=35.1701529&c=15.00,0,0,0,dh',
  hours: [
    { label: '평일', time: '오전 9:00 ~ 오후 9:00' },
    { label: '주말(토·일), 공휴일', time: '오전 9:00 ~ 오후 5:00' },
    { label: '점심시간', time: '오후 1:00 ~ 오후 2:00' },
  ],
  copyright: 'COPYRIGHT © 2024 Haeun-nuri. ALL RIGHTS RESERVED.',
};

export type NavItem = { label: string; href: string };
export type NavGroup = { key: string; label: string; en: string; hero: string; items: NavItem[] };

/** 원본 상단 메뉴 구조 그대로 */
export const NAV: NavGroup[] = [
  {
    key: 'about',
    label: '해운누리한의원',
    en: 'About Haeun-Nuri',
    hero: '/img/hero/subtitle-1.jpg',
    items: [
      { label: '진료시간', href: '/sub/about/page01/' },
      { label: '오시는 길', href: '/sub/about/page02/' },
      { label: '의료진 소개', href: '/sub/about/page03/' },
      { label: '둘러보기', href: '/sub/about/page04/' },
    ],
  },
  {
    key: 'hospital',
    label: '해운누리 입원실',
    en: 'Inpatient Care',
    hero: '/img/hero/subtitle-2.jpg',
    items: [
      { label: '입원실 안내', href: '/sub/hospital/page01/' },
      { label: '입원절차 안내', href: '/sub/hospital/page02/' },
    ],
  },
  {
    key: 'treatment',
    label: '해운누리 치료',
    en: 'Treatment',
    hero: '/img/hero/subtitle-3.jpg',
    items: [
      { label: '약침치료', href: '/sub/treatment/page01/' },
      { label: '추나요법', href: '/sub/treatment/page02/' },
      { label: '통증매선', href: '/sub/treatment/page03/' },
      { label: '한약치료', href: '/sub/treatment/page04/' },
    ],
  },
  {
    key: 'clinic',
    label: '해운누리 진료과목',
    en: 'Clinical Departments',
    hero: '/img/hero/subtitle-4.jpg',
    items: [
      { label: '자동차사고', href: '/sub/clinic/page01/' },
      { label: '척추관절', href: '/sub/clinic/page02/' },
      { label: '내과질환', href: '/sub/clinic/page03/' },
      { label: '여성질환', href: '/sub/clinic/page04/' },
      { label: '피부질환', href: '/sub/clinic/page05/' },
      { label: '정신건강', href: '/sub/clinic/page06/' },
      { label: '다이어트', href: '/sub/clinic/page07/' },
    ],
  },
  {
    key: 'media',
    label: '해운누리 미디어',
    en: 'Media',
    hero: '/img/hero/subtitle-2.jpg',
    items: [
      { label: '유튜브', href: '/sub/media/page01/' },
      { label: '전문칼럼', href: '/sub/media/page02/' },
    ],
  },
  {
    key: 'board',
    label: '공지사항',
    en: 'Notice',
    hero: '/img/hero/subtitle-1.jpg',
    items: [{ label: '해운누리 소식', href: '/sub/board/page01/' }],
  },
];

export function findNav(href: string) {
  for (const g of NAV) {
    const item = g.items.find((i) => i.href === href);
    if (item) return { group: g, item };
  }
  return null;
}
