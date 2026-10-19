import type { Metadata } from 'next';
import SubLayout from '@/components/SubLayout';

/* 404 에는 Next 가 noindex 를 자동으로 한 번 넣는다 → 스테이징 레이아웃의 noindex 를 지워 한 번만 남긴다 */
export const metadata: Metadata = { title: '페이지를 찾을 수 없습니다', robots: null };

export default function NotFound() {
  return (
    <SubLayout href="/404/" title="페이지를 찾을 수 없습니다" crumb={{ label: '안내', en: 'Not Found' }}>
      <div className="wrap narrow">
        <div className="blk-head center" data-rv="up">
          <p className="label">( 404 )</p>
          <h2 className="blk-title">요청하신 페이지가 없습니다</h2>
          <p>주소가 바뀌었거나 삭제된 페이지입니다. 홈에서 원하시는 메뉴를 찾아 주세요.</p>
          <p style={{ marginTop: 32 }}>
            <a className="btn btn-line" href="/">
              홈으로 가기 <span className="arr" />
            </a>
          </p>
        </div>
      </div>
    </SubLayout>
  );
}
