import type { Metadata } from 'next';
import SubLayout from '@/components/SubLayout';
import SectionView from '@/components/Sections';
import TabBar from '@/components/TabBar';
import DetailImages from '@/components/DetailImages';
import SubOutro from '@/components/SubOutro';
import { contentSlugs, loadPage } from '@/lib/content';
import { detailFor } from '@/lib/details';
import ClinicPage from '@/components/clinic/ClinicPage';
import { isClinic, loadClinic } from '@/lib/clinic';
import { findNav } from '@/lib/site';
import { SEO, pageMeta } from '@/lib/seo';

/**
 * 서브페이지 — 진료과목 7쪽(코딩 화면)과, 원본 상세 이미지가 있으면 그 디자인을 그대로 쓰고(조각별 스크롤 연출),
 * 없으면 원고(content/*.json)로 그린다.
 * 코딩으로 다시 그린 소개·입원·치료 8쪽은 제 경로(app/sub/<group>/<page>/page.tsx)에 있다 — 그 페이지의 CSS 만 받게.
 */
const OWN_ROUTE = new Set(['about/page01', 'about/page03', 'hospital/page01', 'hospital/page02', 'treatment/page01', 'treatment/page02', 'treatment/page03', 'treatment/page04']);

type Params = { group: string; page: string };
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return contentSlugs()
    .map((s) => {
      const [, group, page] = s.split('_');
      return { group, page };
    })
    .filter((p) => !OWN_ROUTE.has(`${p.group}/${p.page}`));
}

/** 검색 결과용 설명: 원고의 첫 머리글·요약에서 150자 안팎으로 */
function describe(slug: string) {
  try {
    const data = loadPage(slug);
    const first = data.sections[0];
    const raw = [first?.lead, ...(first?.body ?? []), data.sections[1]?.lead].filter(Boolean).join(' ');
    const plain = raw.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    if (!plain) return undefined;
    return plain.length > 150 ? plain.slice(0, 147).trimEnd() + '…' : plain;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { group, page } = await params;
  if (SEO[`/sub/${group}/${page}/`]) return pageMeta(`/sub/${group}/${page}/`);
  const nav = findNav(`/sub/${group}/${page}/`);
  const label = nav?.item.label;
  const description = describe(`sub_${group}_${page}`);
  return {
    title: label,
    description: description ? `해운누리한의원 ${label} — ${description}` : undefined,
    alternates: { canonical: `/sub/${group}/${page}/` },
  };
}

export default async function SubPage({ params }: { params: Promise<Params> }) {
  const { group, page } = await params;
  const href = `/sub/${group}/${page}/`;
  // 진료과목 7쪽: 통이미지 대신 HTML/CSS 로 다시 그린 화면
  if (isClinic(group, page)) {
    return (
      <SubLayout href={href} detail>
        <ClinicPage page={loadClinic(page)} />
        <SubOutro href={href} />
      </SubLayout>
    );
  }
  const detail = detailFor(group, page);
  if (detail) {
    return (
      <SubLayout href={href} detail>
        <DetailImages detail={detail} />
        <SubOutro href={href} />
      </SubLayout>
    );
  }
  const data = loadPage(`sub_${group}_${page}`);
  const tabs: { label: string; id: string }[] = [];
  for (const s of data.sections) {
    if (s.tab && !tabs.some((t) => t.label === s.tab)) tabs.push({ label: s.tab, id: s.id });
  }
  return (
    <SubLayout href={href}>
      {tabs.length > 1 && <TabBar tabs={tabs} />}
      <div className="wrap">
        {data.sections.map((s, i) => (
          <SectionView key={s.id} s={s} index={i} />
        ))}
      </div>
    </SubLayout>
  );
}
