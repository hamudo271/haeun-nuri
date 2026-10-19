import type { Metadata, Viewport } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import QuickDock from '@/components/QuickDock';
import Motion from '@/components/Motion';
import { Cormorant_Garamond, Noto_Serif_KR } from 'next/font/google';
import { SITE } from '@/lib/site';
import './fonts.css';
import './globals.css';
import './hero-v2.css';

/* 영문 세리프: 빌드 때 받아 같은 서버에서 내보낸다(외부 CSS 요청·차단 없음) */
const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: false, // 장식용 영문 글꼴이라 본문 CSS 보다 먼저 받지 않는다(첫 화면 속도)
  variable: '--font-serif',
});

/* 한글 세리프: 메인 첫 화면 제목에만 쓴다(레퍼런스 파시아의원 NotoSerifKR). 쓰는 글자 조각만 받는다 */
const kserif = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  preload: false,
  variable: '--font-kserif',
});

const DESCRIPTION = '부산 장산역 1번 출구, 해운대 일대를 아우르는 해운누리한의원 | 원인을 치료하는 환자 중심 서비스';

/** 운영 빌드만 검색 수집을 연다: NEXT_PUBLIC_SITE_ENV=production npm run build (빌드 시점에 결정) */
const IS_PROD = process.env.NEXT_PUBLIC_SITE_ENV === 'production';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.haeun-nuri.com'),
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: DESCRIPTION,
  keywords:
    '해운누리한의원,해운대한의원,해운대야간진료,좌동야간진료,장산역야간진료,해운대주말진료,해운대365진료,좌동주말진료,해운대공휴일진료,좌동공휴일진료,장산역공휴일진료,장산역한의원,해운대주말한의원,해운대물리치료,좌동물리치료,장산역물리치료,부산야간진료',
  formatDetection: { telephone: false },
  icons: { icon: '/img/brand/favicon-16.png' },
  openGraph: { type: 'website', title: SITE.name, description: DESCRIPTION, siteName: SITE.name, url: 'https://www.haeun-nuri.com' },
  // 스테이징은 수집 차단. 운영은 robots 메타를 아예 넣지 않는다(기본값이 index·follow 이고,
  // 404 에는 Next 가 noindex 를 자동으로 한 번 넣으므로 레이아웃 값과 겹치지 않게)
  ...(IS_PROD ? {} : { robots: { index: false, follow: false } }),
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#2b2019' };

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': ['Physician', 'LocalBusiness', 'MedicalBusiness'],
  name: SITE.name,
  url: 'https://www.haeun-nuri.com',
  telephone: SITE.tel,
  address: {
    '@type': 'PostalAddress',
    addressLocality: '부산광역시 해운대구 좌동',
    streetAddress: '세실로 48 해운대삼정코아주상복합 2층',
    addressRegion: '부산광역시',
    addressCountry: 'KR',
  },
  geo: { '@type': 'GeoCoordinates', latitude: '35.1705593', longitude: '129.1783854' },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '21:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday', 'Sunday', 'PublicHolidays'], opens: '09:00', closes: '17:00' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${serif.variable} ${kserif.variable}`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      </head>
      <body id="top">
        <div className="progress" aria-hidden="true">
          <i />
        </div>
        <Header />
        <main>{children}</main>
        <Footer />
        <QuickDock />
        <Motion />
      </body>
    </html>
  );
}
