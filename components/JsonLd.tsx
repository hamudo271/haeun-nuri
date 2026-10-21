import { ld } from '@/lib/seo';

/** 구조화 데이터 한 덩어리(schema.org JSON-LD) */
export default function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(data) }} />;
}
