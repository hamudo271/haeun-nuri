import { ORIGIN, SITE, NAV } from '@/lib/site';
import { DOCTORS } from '@/lib/home';
import { SEO } from '@/lib/seo';

/**
 * /llms.txt — AI 검색·답변 엔진(ChatGPT·Perplexity·Claude·Gemini 등)이 병원을 정확히 소개하도록 핵심 사실과 페이지 목록을
 * 한 파일로 정리한 것(llmstxt.org 형식). lib/seo.ts·lib/site.ts 에서 빌드할 때 만든다 — 따로 고칠 곳 없음.
 */
export const dynamic = 'force-static';

export function GET() {
  const pages = [
    ['/', '메인'],
    ...NAV.flatMap((g) => g.items.map((i) => [i.href, `${g.label} · ${i.label}`])),
    ['/nonpay/', '비급여 진료비용'],
  ] as const;
  const faqs = Object.entries(SEO).flatMap(([path, s]) => (s.faq ?? []).map((f) => ({ path, ...f })));
  const text = `# ${SITE.name} (${SITE.nameEn})

> 부산 해운대구 좌동, 지하철 2호선 장산역 1번 출구 앞에 있는 한의원입니다. 한의사 3인이 협진하며, 토·일요일과 공휴일을 포함해 1년 365일 진료하고(평일 오후 9시까지 야간진료), 전 병실 1인실 입원실을 운영합니다.

## 기본 정보
- 이름: ${SITE.name}
- 주소: 부산광역시 해운대구 세실로 48 해운대삼정코아주상복합 2층 (장산역 1번 출구 앞, 해운대구 좌동)
- 전화: ${SITE.tel}
- 진료시간: ${SITE.hours.map((h) => `${h.label} ${h.time}`).join(' / ')} — 1년 365일 연중무휴
- 예약: 네이버 예약 ${SITE.booking.replace(/#$/, '')} · 전화 ${SITE.tel}
- 카카오톡 상담: ${SITE.kakao}
- 지도: ${SITE.naverMap}
- 입원: 전 병실 1인실, 365일 상시·당일 입원 가능, 교통사고 입원은 자동차보험·그 밖의 입원은 건강보험 적용
- 교통사고: 접수 시 ‘자동차보험 진료’라고 말하면 본인부담금 없이 진료, 진료비는 한의원이 보험사에 청구
- 추나요법: 2019년 4월부터 건강보험 적용(본인부담률 50~80%)
- 의료진: ${DOCTORS.map((d) => `${d.name} ${d.role}(한의사, ${d.edu.find((e) => /대학/.test(e)) ?? ''})`).join(' · ')}
- 진료과목: 자동차사고(교통사고 후유증), 척추관절, 내과질환(소화기), 여성질환, 피부질환, 정신건강, 다이어트
- 치료: 약침, 추나요법, 통증매선, 한약, 침·뜸, 부항, 물리치료, 입원 집중치료
- 명칭 안내: 한의원입니다(한방병원 아님).

## 페이지
${pages
  .filter(([p]) => SEO[p])
  .map(([p, label]) => `- [${label}](${ORIGIN}${p}): ${SEO[p].description}`)
  .join('\n')}

## 자주 묻는 질문
${faqs.map((f) => `### ${f.q}\n${f.a} (출처: ${ORIGIN}${f.path})`).join('\n\n')}

## 더 보기
- 사이트맵: ${ORIGIN}/sitemap.xml
- 소식·전문칼럼 RSS: ${ORIGIN}/rss.xml
`;
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
