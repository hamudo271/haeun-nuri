import type { Metadata } from 'next';
import { ORIGIN, SITE, findNav } from '@/lib/site';
import { DOCTORS } from '@/lib/home';

/**
 * 검색·공유·AI 답변용 페이지 정보 — 페이지마다 하나의 목표 검색어.
 * - title: 검색어를 맨 앞에(뒤에 ' | 해운누리한의원' 이 붙는다). 메인만 전체 제목을 그대로 쓴다.
 * - description: 페이지마다 다르게, 원고에 있는 사실만.
 * - og: 공유 미리보기 이미지(1200×630, public/og/ — 만드는 법은 scripts/og/README.md).
 * - faq: 화면에 보이는 '자주 묻는 질문'과 FAQPage 구조화 데이터가 같은 글을 쓴다(구글 규칙: 보이는 글만).
 * - about: 이 페이지가 다루는 질환(MedicalCondition)·치료(MedicalTherapy).
 * 문구를 고칠 때: 원고(content/*.json)·병원 안내와 다른 사실이나 '최고·완치·100%' 같은 의료광고 금지 표현을 넣지 않는다.
 */
export type Faq = { q: string; a: string };
export type PageSeo = {
  title: string;
  description: string;
  og: string;
  /** 상단 큰 제목 아래 검색어 한 줄(h1 안에 들어간다). 첫 ' · ' 앞부분이 다른 페이지에서 이 페이지로 거는 링크 글자 */
  hero?: string;
  /** 함께 보기(본문 아래 관련 페이지 링크): 검색엔진이 주제 연결을 따라가고, 환자는 다음 페이지를 찾는다 */
  related?: string[];
  /** 이미지 사이트맵에 넣을 이 페이지의 실제 사진(병원·시술 사진. 글자 들어간 공유 이미지는 넣지 않는다) */
  images?: string[];
  faq?: Faq[];
  about?: { type: 'MedicalCondition' | 'MedicalTherapy'; names: string[] };
};

const TEL = SITE.tel;
const ADDR = '부산 해운대구 세실로 48 해운대삼정코아주상복합 2층';

export const SEO: Record<string, PageSeo> = {
  '/': {
    title: '해운누리한의원 | 해운대 장산역 1번 출구 · 365일 진료',
    images: ['/img/facility/01.jpg', '/img/facility/04.jpg', '/img/main/img-02.jpg'],
    description:
      '부산 해운대구 좌동 장산역 1번 출구 앞 해운누리한의원. 한의사 3인 협진, 1년 365일 진료(평일 오전 9시~오후 9시, 주말·공휴일 오전 9시~오후 5시)와 전 병실 1인실 입원실을 운영합니다.',
    og: '/og/home.jpg',
  },
  '/sub/about/page01/': {
    title: '해운대 일요일·공휴일 한의원 | 365일 야간진료',
    hero: '해운대 일요일·공휴일 진료 한의원',
    related: ['/sub/about/page02/', '/sub/hospital/page01/'],
    images: ['/img/facility/01.jpg'],
    description:
      '해운누리한의원은 일요일·공휴일을 포함해 1년 365일 진료합니다. 평일 오전 9시~오후 9시, 토·일요일·공휴일 오전 9시~오후 5시, 점심시간 오후 1시~2시. 장산역 1번 출구 앞.',
    og: '/og/about-hours.jpg',
    faq: [
      { q: '일요일과 공휴일에도 진료하나요?', a: '네. 해운누리한의원은 토·일요일과 공휴일을 포함해 1년 365일 연중무휴로 진료합니다. 주말과 공휴일 진료시간은 오전 9시부터 오후 5시까지입니다.' },
      { q: '평일 진료시간은 어떻게 되나요?', a: '평일은 오전 9시부터 오후 9시까지 야간진료를 해서 출근 전이나 퇴근 후에도 내원하실 수 있습니다. 점심시간은 오후 1시부터 2시까지입니다.' },
      { q: '진료 예약은 어떻게 하나요?', a: `네이버 예약이나 전화(${TEL})로 예약하실 수 있습니다.` },
      { q: '입원도 365일 가능한가요?', a: '네. 1년 365일 상시 입원이 가능하며, 입원에 필요한 물품이 갖춰져 있어 당일 바로 입원하실 수 있습니다.' },
    ],
  },
  '/sub/about/page02/': {
    title: '장산역·좌동 한의원 오시는 길',
    hero: '장산역 1번 출구 앞 · 해운대구 좌동',
    related: ['/sub/about/page01/', '/sub/about/page04/'],
    images: ['/img/facility/06.jpg'],
    description: `장산역 1번 출구 앞, ${ADDR}. 해운대구 좌동 해운누리한의원 위치와 찾아오는 길, 진료시간 안내. 전화 ${TEL}.`,
    og: '/og/about-location.jpg',
    faq: [
      { q: '해운누리한의원은 어디에 있나요?', a: `부산 해운대구 좌동, 지하철 2호선 장산역 1번 출구 앞에 있습니다. 주소는 ${ADDR}입니다.` },
      { q: '내비게이션으로 찾아가려면 무엇을 검색하나요?', a: '내비게이션에서 ‘해운누리한의원’을 검색하시면 됩니다.' },
      { q: '전화번호와 진료시간을 알려 주세요.', a: `전화는 ${TEL}입니다. 평일 오전 9시~오후 9시, 토·일요일과 공휴일 오전 9시~오후 5시에 진료하며 점심시간은 오후 1시~2시입니다.` },
    ],
  },
  '/sub/about/page03/': {
    title: '의료진 소개 | 한의사 3인 협진',
    hero: '해운대 한의원 한의사 3인 협진',
    related: ['/sub/clinic/page01/', '/sub/treatment/page02/'],
    images: ['/img/doctors/img-13.jpg', '/img/doctors/img-16.jpg', '/img/doctors/img-15.png'],
    description: `해운누리한의원 의료진 — ${DOCTORS.map((d) => `${d.name} ${d.role}`).join(', ')}. 한의사 3인이 협진하며 처음 진단부터 치료까지 환자 중심으로 진료합니다.`,
    og: '/og/about-doctors.jpg',
  },
  '/sub/about/page04/': {
    title: '해운대 좌동 한의원 둘러보기 | 진료실·1인실 입원실',
    hero: '해운대 좌동 한의원 진료실·입원실',
    related: ['/sub/hospital/page01/'],
    images: ['/img/facility/01.jpg', '/img/facility/02.jpg', '/img/facility/03.jpg', '/img/facility/04.jpg', '/img/facility/05.jpg', '/img/facility/06.jpg', '/img/facility/07.jpg'],
    description: '해운누리한의원 접수처, 진료실, 치료실, 1인실 입원실의 실제 모습. 장산역 1번 출구 앞 해운대 좌동 한의원의 공간을 사진으로 둘러보세요.',
    og: '/og/about-tour.jpg',
  },
  '/sub/hospital/page01/': {
    title: '해운대 한의원 입원 | 전 병실 1인실 입원실',
    hero: '해운대 한의원 입원 · 전 병실 1인실',
    related: ['/sub/hospital/page02/', '/sub/clinic/page01/', '/sub/about/page01/'],
    images: ['/img/facility/04.jpg', '/img/space/02.jpg', '/img/space/03.jpg'],
    description:
      '해운누리한의원 입원실은 전 병실 1인실입니다. 모션 베드, 개별 공기청정·환기, 개별 냉난방을 갖췄고 365일 당일 입원이 가능합니다. 자동차보험·건강보험 적용.',
    og: '/og/hospital-ward.jpg',
    faq: [
      { q: '한의원에서도 입원할 수 있나요?', a: '네. 해운누리한의원은 입원실을 운영하며 모든 병실이 1인실입니다. 1년 365일 상시 입원과 당일 입원이 가능합니다.' },
      { q: '입원할 때 준비물이 필요한가요?', a: '입원 생활에 필요한 물품과 개인 수건·세면도구가 갖춰져 있어 따로 준비물 없이 입원하실 수 있습니다. 보호자 동반 시 보조베드, 아기와 함께 입원하실 때는 아기매트를 드립니다.' },
      { q: '입원 치료도 보험이 적용되나요?', a: '교통사고 입원은 자동차보험, 그 밖의 입원은 건강보험이 적용됩니다. 실비보험에 가입하셨다면 본인부담금을 줄일 수 있으며, 보장 범위는 보험사와 계약 내용에 따라 다릅니다.' },
      { q: '입원하면 어떤 치료를 받나요?', a: '체질과 상태에 맞춘 1:1 집중 치료로 약침, 봉침, 추나, 부항, 뜸 등 한방 치료와 물리치료를 받으실 수 있습니다.' },
    ],
  },
  '/sub/hospital/page02/': {
    title: '한의원 입원 절차 | 당일 입원·보험 서류 대행',
    hero: '365일 당일 입원 · 보험 서류 대행',
    related: ['/sub/hospital/page01/', '/sub/clinic/page01/'],
    images: ['/img/facility/03.jpg'],
    description:
      '준비물 없이 당일 입원. 교통사고라면 보험사 담당자 연락처와 사고접수번호만 알려주세요. 나머지 서류는 해운누리한의원이 처리합니다. 접수부터 입원 생활까지 절차 안내.',
    og: '/og/hospital-admission.jpg',
  },
  '/sub/treatment/page01/': {
    title: '해운대 약침 치료 | 경근약침',
    hero: '해운대 약침 치료',
    related: ['/sub/clinic/page02/', '/sub/clinic/page01/', '/sub/clinic/page03/'],
    images: ['/img/main/img-07.jpg'],
    description:
      '한약재로 만든 약액을 통증 부위와 경혈에 주입하는 약침 치료. 해운누리한의원은 통증의 증상과 원인에 맞춰 약침을 처방합니다. 목·허리 통증, 디스크, 척추관협착증.',
    og: '/og/treatment-acu.jpg',
    about: { type: 'MedicalTherapy', names: ['약침'] },
  },
  '/sub/treatment/page02/': {
    title: '해운대 추나요법 | 건강보험 적용 추나',
    hero: '해운대 추나요법 · 건강보험 적용',
    related: ['/sub/clinic/page02/', '/sub/clinic/page01/', '/sub/hospital/page01/'],
    images: ['/img/main/img-02.jpg'],
    description:
      '한의사가 손으로 뼈·관절·근육·인대를 바로잡는 수기 치료, 추나요법. 2019년 4월부터 건강보험이 적용되어 본인부담률 50~80%. 거북목, 허리디스크, 골반 통증.',
    og: '/og/treatment-chuna.jpg',
    about: { type: 'MedicalTherapy', names: ['추나요법'] },
    faq: [
      { q: '추나요법은 어떤 치료인가요?', a: '한의사가 손이나 보조기구로 뼈, 관절, 근육, 인대를 밀고 당겨 바른 위치로 바로잡는 한의 수기 치료입니다. 절개나 마취 없이 진행하는 비수술 치료입니다.' },
      { q: '추나요법도 건강보험이 되나요?', a: '네. 2019년 4월부터 건강보험이 적용되어 본인부담률은 50~80%입니다.' },
      { q: '어떤 증상에 추나요법을 받나요?', a: '일자목·거북목, 어깨 통증, 굽은 등, 척추측만, 허리디스크, 척추관 협착증, 무릎 통증, 틀어진 골반, 교통사고 후유증 등에 추나요법을 적용합니다.' },
      { q: '연령 제한이 있나요?', a: '추나요법은 전 연령대가 받을 수 있습니다. 한의사가 진찰 후 상태에 맞게 진행합니다.' },
    ],
  },
  '/sub/treatment/page03/': {
    title: '해운대 매선 치료 | 통증매선',
    hero: '해운대 매선 치료',
    related: ['/sub/clinic/page02/', '/sub/clinic/page01/'],
    images: ['/img/main/img-03.jpg'],
    description:
      '녹는 의료용 실(PDO)을 피부 아래 경혈에 넣어 3~6개월 동안 서서히 녹으며 자극하는 통증매선. 마취나 절개 없이 시술하고 시술 후 바로 일상생활이 가능합니다.',
    og: '/og/treatment-thread.jpg',
    about: { type: 'MedicalTherapy', names: ['매선'] },
  },
  '/sub/treatment/page04/': {
    title: '해운대 한약 치료 | 체질 맞춤 한약',
    hero: '해운대 체질 맞춤 한약',
    related: ['/sub/clinic/page03/', '/sub/clinic/page04/', '/sub/clinic/page07/', '/sub/clinic/page05/'],
    images: ['/img/sub/treatment-page04/decoction-m.jpg'],
    description:
      '나이·체질·체형에 따라 1:1 상담 후 처방하는 해운누리한의원 맞춤 한약. 만성피로, 수술·산후 회복, 갱년기, 척추관절 건강이 필요한 어르신까지.',
    og: '/og/treatment-herb.jpg',
    about: { type: 'MedicalTherapy', names: ['한약'] },
  },
  '/sub/clinic/page01/': {
    title: '해운대 교통사고 한의원 | 후유증 치료·1인실 입원',
    hero: '해운대 교통사고 한의원',
    related: ['/sub/hospital/page01/', '/sub/hospital/page02/', '/sub/treatment/page02/', '/sub/treatment/page01/', '/sub/about/page01/'],
    images: ['/img/clinic/p1/intro.jpg'],
    description:
      '접수 시 ‘자동차보험 진료’라고 말씀해 주시면 본인부담금 없이 치료받을 수 있습니다. 한약·추나·약침·침·물리치료와 1인실 입원 집중치료, 365일 진료. 장산역 1번 출구 앞.',
    og: '/og/clinic-accident.jpg',
    about: { type: 'MedicalCondition', names: ['교통사고 후유증'] },
    faq: [
      { q: '교통사고 치료비는 제가 내야 하나요?', a: '진료 접수 때 ‘자동차보험 진료’라고 말씀해 주시면 본인부담금 없이 치료받으실 수 있습니다. 진료비는 한의원이 보험사에 직접 청구합니다.' },
      { q: '교통사고 진료는 어떤 순서로 받나요?', a: '접수할 때 자동차보험 치료 대상자임을 알리고 보험사와 담당자 연락처를 알려 주세요. 개인정보 수집 동의서와 문진표를 작성하면, 한의원이 보험사에서 지불보증을 받은 뒤 진료를 시작합니다.' },
      { q: '사고 직후 아프지 않아도 진료를 받아야 하나요?', a: '교통사고 후 증상은 다음 날이나 2~3일 뒤, 길게는 몇 달 뒤에 나타나기도 합니다. X-ray나 CT에서 이상이 없어도 근육·신경 통증이나 불면, 불안 같은 증상이 생길 수 있어 진찰을 받아 보시는 것이 좋습니다.' },
      { q: '교통사고로 입원할 수 있나요?', a: '네. 전 병실 1인실 입원실에서 입원 집중 치료를 받으실 수 있습니다. 보험사 담당자 연락처와 사고접수번호만 알려 주시면 입원 서류는 한의원에서 처리합니다.' },
      { q: '어떤 치료를 받나요?', a: '어혈을 풀어 주는 한약, 추나요법, 약침, 침·뜸, 물리치료(간섭저주파·적외선·부항)와 입원 집중 치료 중에서 증상과 체질에 맞춰 진행합니다.' },
    ],
  },
  '/sub/clinic/page02/': {
    title: '해운대 척추관절 한의원 | 목·허리 디스크·관절 통증',
    hero: '해운대 척추관절 한의원 · 목·허리 디스크',
    related: ['/sub/treatment/page02/', '/sub/treatment/page01/', '/sub/treatment/page03/', '/sub/hospital/page01/'],
    images: ['/img/clinic/p2/intro.jpg'],
    description:
      '목디스크, 허리디스크, 척추관협착증, 오십견, 회전근개파열, 무릎·발목·손목 통증까지. 해운누리한의원은 한약·추나·약침·침 치료로 몸의 기초를 바로잡는 치료를 합니다.',
    og: '/og/clinic-spine.jpg',
    about: {
      type: 'MedicalCondition',
      names: ['목디스크', '거북목·일자목', '허리디스크', '척추관협착증', '척추전방전위증', '척추측만증', '좌골신경통', '회전근개파열', '어깨충돌증후군', '오십견', '석회화건염', '반월상연골손상'],
    },
  },
  '/sub/clinic/page03/': {
    title: '해운대 소화불량 한의원 | 담적·위염·역류성식도염',
    hero: '해운대 소화불량 한의원 · 담적·위염',
    related: ['/sub/treatment/page04/', '/sub/treatment/page01/'],
    images: ['/img/clinic/p3/intro.jpg'],
    description:
      '담적, 위염, 역류성식도염, 신경성·만성 소화불량, 과민성 대장증후군, 만성장염, 변비·설사. 생활·식습관 교정과 한방 치료를 함께하는 해운누리한의원 내과 진료.',
    og: '/og/clinic-digestive.jpg',
    about: { type: 'MedicalCondition', names: ['담적', '위염', '역류성식도염', '신경성 소화불량', '만성 소화불량', '과민성 대장증후군', '만성장염', '변비', '설사'] },
  },
  '/sub/clinic/page04/': {
    title: '해운대 여성질환 한의원 | 생리통·난임·갱년기',
    hero: '해운대 여성질환 한의원',
    related: ['/sub/treatment/page04/', '/sub/treatment/page01/'],
    images: ['/img/clinic/p4/intro.jpg'],
    description:
      '생리통, 다낭성난소증후군, 자궁내막증, 질염, 갱년기장애, 산후·유산 후 조리, 난임. 몸 전체의 균형과 생활 패턴까지 살피는 해운누리한의원 여성질환 진료.',
    og: '/og/clinic-women.jpg',
    about: { type: 'MedicalCondition', names: ['생리통', '다낭성난소증후군', '자궁내막증', '질염', '갱년기장애', '난임'] },
  },
  '/sub/clinic/page05/': {
    title: '해운대 피부질환 한의원 | 여드름·습진·건선',
    hero: '해운대 피부질환 한의원',
    related: ['/sub/treatment/page04/', '/sub/treatment/page01/'],
    images: ['/img/clinic/p5/intro.jpg'],
    description: '두드러기, 여드름, 건선, 습진, 지루성피부염. 원인과 유형을 진단해 체질에 맞춰 치료하는 해운누리한의원 피부질환 진료.',
    og: '/og/clinic-skin.jpg',
    about: { type: 'MedicalCondition', names: ['두드러기', '여드름', '건선', '습진', '지루성피부염'] },
  },
  '/sub/clinic/page06/': {
    title: '해운대 불면증·공황장애 한의원 | 정신건강 진료',
    hero: '해운대 불면증·공황장애 한의원',
    related: ['/sub/treatment/page04/', '/sub/treatment/page01/'],
    images: ['/img/clinic/p6/intro.jpg'],
    description: '공황장애, 불면증, 화병, 스트레스증후군. 몸과 마음을 함께 살피는 해운누리한의원 정신건강 한방 진료.',
    og: '/og/clinic-mind.jpg',
    about: { type: 'MedicalCondition', names: ['공황장애', '불면증', '화병', '스트레스증후군'] },
  },
  '/sub/clinic/page07/': {
    title: '해운대 한방 다이어트 | 체질별 맞춤',
    hero: '해운대 한방 다이어트',
    related: ['/sub/treatment/page04/', '/sub/treatment/page01/'],
    images: ['/img/clinic/p7/intro.jpg'],
    description: '여성·남성·체질별 한방 다이어트. 체중 감량과 함께 몸의 균형을 회복하고 건강한 체질로 바꾸는 것을 목표로 하는 해운누리한의원 다이어트 진료.',
    og: '/og/clinic-diet.jpg',
    about: { type: 'MedicalCondition', names: ['비만'] },
  },
  '/sub/media/page01/': {
    title: '유튜브 | 원장님이 설명하는 건강 영상',
    hero: '해운누리한의원 건강 영상',
    related: ['/sub/media/page02/'],
    images: ['/img/facility/07.jpg'],
    description: '해운누리한의원 원장님이 직접 설명하는 질환·치료 이야기를 영상으로 만나 보세요.',
    og: '/og/media-video.jpg',
  },
  '/sub/media/page02/': {
    title: '전문칼럼 | 원장님이 직접 쓰는 건강 이야기',
    hero: '해운대 한의원 건강 칼럼',
    related: ['/sub/media/page01/'],
    images: ['/img/main/img-04.jpg'],
    description: '해운누리한의원 원장님이 직접 쓰는 건강 칼럼입니다. 질환과 한방 치료, 생활 관리 이야기를 전합니다.',
    og: '/og/media-column.jpg',
  },
  '/sub/board/page01/': {
    title: '소식·공지사항',
    hero: '해운누리한의원 공지사항',
    images: ['/img/facility/06.jpg'],
    description: '해운누리한의원의 공지사항과 소식. 진료 일정과 병원 안내를 전합니다.',
    og: '/og/board-news.jpg',
  },
  '/nonpay/': {
    title: '비급여 진료비용',
    hero: '의료법에 따른 비급여 항목·금액 고지',
    images: ['/img/facility/01.jpg'],
    description: '해운누리한의원 비급여 진료비용 안내. 의료법에 따라 비급여 항목과 금액을 알려 드립니다.',
    og: '/og/nonpay.jpg',
  },
  '/service_rull/': {
    title: '이용안내',
    description: '해운누리한의원 홈페이지 이용안내.',
    og: '/og/home.jpg',
  },
  '/personal/': {
    title: '개인정보보호정책',
    description: '해운누리한의원 홈페이지 개인정보보호정책.',
    og: '/og/home.jpg',
  },
};

/** 페이지 메타정보: 제목·설명·canonical·og(url·이미지)·트위터 카드를 한 번에. openGraph 는 레이아웃 값을 통째로 덮으므로 여기서 전부 채운다 */
export function pageMeta(path: string): Metadata {
  const s = SEO[path];
  if (!s) return { alternates: { canonical: path } };
  const full = path === '/' ? s.title : `${s.title} | ${SITE.name}`;
  // 제목은 2026-10-22 에 한 번 정리한 뒤 고정 — 네이버는 노출 목적으로 제목을 자주 바꾸는 사이트에 불이익을 준다
  const image = { url: s.og, width: 1200, height: 630, alt: full };
  return {
    title: path === '/' ? { absolute: s.title } : s.title,
    description: s.description,
    alternates: { canonical: path },
    openGraph: { type: 'website', locale: 'ko_KR', siteName: SITE.name, url: path, title: full, description: s.description, images: [image] },
    twitter: { card: 'summary_large_image', title: full, description: s.description, images: [s.og] },
  };
}

/* ---------- 구조화 데이터(JSON-LD) ---------- */
export const CLINIC_ID = `${ORIGIN}/#clinic`;

/** 병원 자체: 모든 페이지 공통(레이아웃) */
export function clinicGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MedicalClinic',
        '@id': CLINIC_ID,
        name: SITE.name,
        alternateName: SITE.nameEn,
        description: SEO['/'].description,
        url: `${ORIGIN}/`,
        logo: `${ORIGIN}/img/brand/logo-brown.png`,
        image: [`${ORIGIN}/og/home.jpg`, `${ORIGIN}/img/facility/01.jpg`, `${ORIGIN}/img/facility/04.jpg`],
        telephone: '+82-51-715-4723',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '세실로 48 해운대삼정코아주상복합 2층',
          addressLocality: '해운대구',
          addressRegion: '부산광역시',
          addressCountry: 'KR',
        },
        geo: { '@type': 'GeoCoordinates', latitude: 35.1705593, longitude: 129.1783854 },
        hasMap: SITE.naverMap,
        areaServed: ['부산 해운대구', '좌동', '장산역'],
        openingHoursSpecification: [
          { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '21:00' },
          { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday', 'Sunday', 'PublicHolidays'], opens: '09:00', closes: '17:00' },
        ],
        amenityFeature: [
          { '@type': 'LocationFeatureSpecification', name: '1인실 입원실', value: true },
          { '@type': 'LocationFeatureSpecification', name: '365일 진료', value: true },
          { '@type': 'LocationFeatureSpecification', name: '야간 진료(평일 오후 9시까지)', value: true },
        ],
        availableService: (['/sub/treatment/page01/', '/sub/treatment/page02/', '/sub/treatment/page03/', '/sub/treatment/page04/'] as const).map((p) => ({
          '@type': 'MedicalTherapy',
          name: SEO[p].about!.names[0],
          url: `${ORIGIN}${p}`,
        })),
        employee: DOCTORS.map((d) => ({ '@id': `${ORIGIN}/sub/about/page03/#${d.name}` })),
        sameAs: [SITE.booking.replace(/#$/, ''), SITE.kakao],
      },
      {
        '@type': 'WebSite',
        '@id': `${ORIGIN}/#website`,
        url: `${ORIGIN}/`,
        name: SITE.name,
        inLanguage: 'ko-KR',
        publisher: { '@id': CLINIC_ID },
      },
    ],
  };
}

/** 한 페이지: 경로(브레드크럼)·페이지·다루는 질환/치료·자주 묻는 질문·의료진 */
export function pageGraph(path: string) {
  const s = SEO[path];
  if (!s) return null;
  const url = `${ORIGIN}${path}`;
  const nav = findNav(path);
  const name = nav?.item.label ?? s.title;
  const graph: Record<string, unknown>[] = [
    {
      '@type': s.about ? 'MedicalWebPage' : 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: path === '/' ? s.title : `${s.title} | ${SITE.name}`,
      description: s.description,
      inLanguage: 'ko-KR',
      isPartOf: { '@id': `${ORIGIN}/#website` },
      about: s.about ? s.about.names.map((n) => ({ '@type': s.about!.type, name: n })) : { '@id': CLINIC_ID },
      primaryImageOfPage: { '@type': 'ImageObject', url: `${ORIGIN}${s.og}`, width: 1200, height: 630 },
      ...(path !== '/' ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
      ...(s.about ? { audience: { '@type': 'Patient' }, provider: { '@id': CLINIC_ID } } : {}),
    },
  ];
  if (path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name, item: url },
      ],
    });
  }
  if (s.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: s.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  if (path === '/sub/about/page03/') {
    for (const d of DOCTORS) {
      const school = d.edu.find((e) => /대학/.test(e) && /졸업/.test(e));
      graph.push({
        '@type': 'Person',
        '@id': `${url}#${d.name}`,
        name: d.name,
        jobTitle: `${d.role} (한의사)`,
        description: d.motto,
        image: `${ORIGIN}${d.img}`,
        worksFor: { '@id': CLINIC_ID },
        ...(school ? { alumniOf: { '@type': 'CollegeOrUniversity', name: school.replace(/\s*졸업$/, '') } } : {}),
        memberOf: d.edu.filter((e) => /회원$/.test(e)).map((e) => ({ '@type': 'Organization', name: e.replace(/\s*회원$/, '') })),
      });
    }
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** <script type="application/ld+json"> 안에 넣을 문자열('</script>' 이 끊기지 않게) */
export const ld = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
