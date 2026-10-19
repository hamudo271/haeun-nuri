/** 공지사항(해운누리 소식) — 원본 게시판 글 2건 그대로 */
export type Post = { id: string; title: string; date: string; author: string; body: string; file?: { name: string; href: string } };

export const POSTS: Post[] = [
  {
    id: '5',
    title: '해운누리한의원 비급여 진료비용입니다.',
    date: '2024-06-03',
    author: '관리자',
    body: '해운누리한의원 비급여 진료비용입니다.',
    file: { name: '비급여 진료비용(해운누리)_240603.xlsx', href: '/files/비급여 진료비용(해운누리)_240603.xlsx' },
  },
  {
    id: '1',
    title: '해운누리한의원 홈페이지가 리뉴얼되었습니다.',
    date: '2024-01-09',
    author: '관리자',
    body: '해운누리한의원 홈페이지가 리뉴얼되었습니다.',
  },
];
