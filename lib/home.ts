/** 메인 페이지 원고 — 원본 메인(haeun-nuri.com) 문구 그대로 */

export const HERO = {
  en: 'Haeun-Nuri Oriental Clinic',
  kicker: '장산역 1번 출구 앞,',
  title: ['**부산 해운대 일대**를 아우르는', '**해운누리**가 있습니다.'],
  text: ['해운누리는 3인의 한의사가 협진합니다.', '자신있는 치료만 정직하게 진행하겠습니다.'],
  // 밝은 접수처 → 입원실 → 치료실 복도(어두운 img-04 대신 같은 장면의 밝은 사진)
  // m: 세로 화면(모바일)에서 보여줄 가로 위치 — 접수처 간판·입원실 침대·복도 소실점
  slides: [
    { src: '/img/facility/01.jpg', m: '74% center' },
    { src: '/img/facility/04.jpg', m: '30% center' },
    { src: '/img/facility/06.jpg', m: '60% center' },
  ],
};

/** 원본 메인 01 + 갈색 띠 이미지(img-12)에 들어 있던 문구 */
export const PHILOSOPHY = {
  eyebrow: 'haeun nuri',
  title: ['**사람이 우선**인 한의원.', '시설,장비,재료에 **타협**은 없습니다.'],
  cta: { label: '의료진 소개 바로가기', href: '/sub/about/page03/' },
  bandEyebrow: '해운대 대표 한의원',
  bandTitle: ['**자신있는 치료**만', '권해드립니다.'],
  bandText: [
    ['눈에 보이는 현상이 아닌, 원인을 치료합니다.', '3명의 한의사가 가능한 모든 것을 활용하여', '제일 나은 결과를 얻어내려고 합니다.'],
    ['처음 진단부터 치료까지 환자를 중심으로 진행됩니다.', '해운누리에서 나에게 딱 맞는 진료 서비스를 경험해 보세요.'],
  ],
};

export const SIGNATURE = [
  { en: 'acupuncture', ko: '약침 치료', href: '/sub/treatment/page01/', img: '/img/main/img-07.jpg' },
  { en: 'Chuna therapy', ko: '추나요법', href: '/sub/treatment/page02/', img: '/img/main/img-02.jpg' },
  { en: 'insert pdo', ko: '통증매선', href: '/sub/treatment/page03/', img: '/img/main/img-03.jpg' },
];

export const DIFFERENT = {
  eyebrow: '실력있는 한의원 고르는 비법',
  title: ['해운누리한의원,', '**어떻게 다른가요?**'],
  stats: [
    { num: [365], unit: '', text: ['평일, 주말, 공휴일 연중무휴 진료중입니다.', '편하신 시간에 내원하세요.'] },
    { num: [3], unit: '명', text: ['3명의 원장님이  더 좋은 치료 방법이 없을까', '항상 끊임없이 의논하고 소통합니다.'] },
    { num: [9, 21], unit: '', text: ['오전 진료와 야간 진료 시행으로', '출근 전과 퇴근 후에도 많이 내원해주고 계십니다.'] },
  ],
};

/** cut = 배경을 지운 누끼(PNG, macOS Vision) — 메인 의료진 아치 위에 얹는다 */
export type Doctor = { name: string; role: string; motto: string; img: string; cut: string; career: string[]; edu: string[] };

/** 원본 메인 의료진 탭 내용 그대로 (경력 = 첫 줄 묶음, 학력·학회 = 둘째 묶음) */
export const DOCTORS: Doctor[] = [
  {
    name: '구가현',
    role: '대표원장',
    motto: '공감과 소통이 있는 마음 편한 진료',
    img: '/img/doctors/img-13.jpg',
    cut: '/img/doctors/cut-13.png',
    // 원본 메인에는 '현) 해운누리한의원 대표원장'이 두 번 들어 있어 한 줄로 줄임.
    career: [
      '현) 해운누리한의원 대표원장',
      '전) 광덕안정한의원 해운대장산점 대표원장',
      '전) 광덕안정한의원 부산중구점 원장',
      '전) 광덕안정한의원 일산주엽점 원장',
      '전) 지곡부부한의원 진료원장',
      '전) 홍제한의원 진료원장',
    ],
    edu: ['가천대학교 한의과대학 졸업', '한의임상피부과학회 회원', '대한한방부인과학회 회원', '한방비만학회 회원', '사단법인 약침학회 회원', '대한침구의학회 회원', '대한한방내과학회 회원'],
  },
  {
    // 원본 메인에는 '윤다은'으로 남아 있었으나, 원본 의료진 소개 페이지(sub01-03-03.jpg)와
    // 외부 병원정보(모두닥, 2026)에는 '김민성'으로 되어 있어 의료진 소개 페이지 기준으로 맞춤.
    name: '김민성',
    role: '진료원장',
    motto: '믿고 찾아와 주시는 분들께 정성껏 보답하는 진료',
    img: '/img/doctors/img-16.jpg',
    cut: '/img/doctors/cut-16.png',
    career: ['현) 해운누리한의원 진료원장'],
    edu: ['동의대학교 한의과대학 졸업', '제33기 동의대학교 한의과대학 졸업준비위원장', '대한한의학회선정 미래우수예비한의사 선발', '대한침구의학회 회원', '척추신경추나학회 회원', '사단법인 약침학회 회원'],
  },
  {
    name: '이근서',
    role: '진료원장',
    motto: '한 분 한 분 소중히 생각하며 진실되고 거짓없는 진료',
    img: '/img/doctors/img-15.png',
    cut: '/img/doctors/cut-15.png',
    career: ['현) 해운누리한의원 진료원장', '전) 다이트한의원 진료원장', '전) 마디움한의원 진료원장', '전) 광덕안정한의원 진료원장'],
    edu: ['동의대학교 한의과대학 졸업', '한방비만전문가 과정 수료', '대한한의학회 회원', '대한스포츠한의학회 회원', '한방재활의학과학회 회원'],
  },
];

/** 원본 입원절차 페이지의 4가지 특징 카드 문구 */
export const STAY = {
  eyebrow: '당일 입원/상시 입원 가능',
  title: ['해운누리한의원에서', '**편안한 진료** 받으시길 바랍니다.'],
  features: [
    { title: '자동차/실비보험 적용', text: '본인부담금 없이 쾌적한 1인용 입원 시설에서 한방진료를 받을 수 있습니다.' },
    { title: '별도 개인 준비물 불필요', text: '입원 시 필요한 물품들이 구비되어 있어 당일 즉시 입원이 가능합니다.' },
    { title: '1:1 개별 맞춤 케어', text: '각각 체질과 환경을 고려하여 맞춤 한방 치료를 실시합니다.' },
    { title: '쾌적하고 안락한 1인실', text: '편안한 침구류와 개별 공기청정 시스템으로 치료에 집중이 가능합니다' },
  ],
  gallery: Array.from({ length: 16 }, (_, i) => `/img/space/${String(i + 1).padStart(2, '0')}.jpg`),
};
