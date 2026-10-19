# 해운누리한의원 홈페이지 리뉴얼 (Next.js)

기존 사이트(haeun-nuri.com)의 **메뉴 구조·페이지 23개·원고는 그대로** 두고, 디자인만 새로 만든 버전입니다.
참고: 더가든피부과(thegardenclinic.co.kr)의 연출 방식(절제된 색, 세리프 영문 라벨, 고정 스크롤, 숫자 카운트, 원형 의료진 컷, 번호 격자, 아치 전환, 알약형 카드, 원근 갤러리, 회전 예약 버튼).
더가든의 사진·문구·로고는 쓰지 않았습니다. 사진은 모두 해운누리 원본 사이트의 사진입니다.

- 작업일: 2026-10-03 · Next.js 16.3.8 / React 19 · 정적 내보내기(`out/`) · 외부 라이브러리 없음(움직임은 `components/Motion.tsx` 하나로 처리)

## 실행
```bash
npm install
npm run dev     # http://localhost:3000 (127.0.0.1 말고 localhost)
npm run build   # 정적 파일 → out/
```

## 구조
```
app/
  layout.tsx              헤더·푸터·빠른메뉴·메타정보(스테이징 빌드만 noindex — NEXT_PUBLIC_SITE_ENV)
  sitemap.ts, robots.ts   /sitemap.xml, /robots.txt (빌드 때 생성, 주소는 운영 도메인 기준)
  not-found.tsx           404 화면
  page.tsx                메인
  sub/[group]/[page]/     원고(content/*.json)로 그리는 서브 15개
  sub/about/page02, page04, sub/board/..., personal, service_rull   별도 페이지
components/               Header, Footer, QuickDock, Motion, Sections(원고 렌더러), TabBar, Coverflow, DoctorTabs, KakaoMap …
content/                  서브페이지 원고(JSON) — 원본 통이미지 글을 텍스트로 옮긴 것
lib/site.ts               전화·주소·진료시간·예약 링크·메뉴 (여기만 고치면 전 페이지 반영)
lib/home.ts               메인 원고
public/img/               원본 사이트 사진(서브 본문 사진은 통이미지에서 잘라 낸 것)
```

## 원고 수정
- 서브페이지 글: `content/sub_*.json` 의 해당 문장을 고치고 `npm run build`.
  `**단어**` = 금색 강조, `\n` = 줄바꿈.
- 진료시간·전화·주소: `lib/site.ts`.

## 원본과 달라진 점(의도)
- 통이미지 → 실제 텍스트(모바일 가독성·검색 노출·수정 용이). 원고 문장은 그대로(원본 오탈자도 그대로 둠).
- 공지사항 2건은 고정 페이지(글쓰기·검색 기능 없음). 첨부 엑셀은 `public/files/`.
- 추적·우클릭 방지 스크립트 없음.

## 다시 만들 때(원고·사진 추출 도구는 상위 폴더)
`../tools/extract_photos.py`(사진 자르기) → `../tools/fix_photos.py`(빠진 사진 보충) → `../tools/renewal_assets.py`(이 프로젝트로 복사, 번호 배지 지움).
검증: `../renew-verify/shoot.js`(PC·모바일 캡처·오류 점검), `../renew-verify/interact.js`(동작 점검).

## 배포 (Railway, 2026-10-19~)
- GitHub `hamudo271/haeun-nuri` main → Railway 가 `npm run build` 뒤 `npm start` 실행.
- `npm start` = `serve` 로 `out/` 정적 파일을 `$PORT` 에서 내보낸다(`next start` 는 정적 내보내기에서 동작하지 않음). 폴더 목록 숨김·끝 슬래시는 `public/serve.json`.
- 아직 Cloudflare 전용인 것: 관리자(`/admin`)·유튜브·전문칼럼(`functions/`, D1)은 Railway 에서 동작하지 않는다(화면 틀만 보임). CMS 이전 예정.

## 배포 (Cloudflare Pages)
- 주소: https://haeun-nuri-renewal.pages.dev (프로젝트 `haeun-nuri-renewal`, 2026-10-03, 검색 차단)
- 다시 올리기(스테이징): `npm run deploy:staging` — 빌드 뒤 `scripts/write-headers.mjs` 가 `out/_headers`(전 페이지 noindex + 캐시)를 쓴다.
- 운영 빌드: `npm run build:prod` — robots 메타를 넣지 않고 `_headers` 는 `/admin/*` 만 noindex. 운영 도메인 전환 때만 쓴다(스테이징 프로젝트에 올리면 noindex 가 풀림).
- 검색 설정: 쪽마다 `alternates.canonical`(끝 슬래시 포함). 전문칼럼 본문은 `functions/sub/media` 가 글 주소로 canonical 을 붙이므로 `sub/media/page02/view` 틀에는 넣지 않는다.
  - 빌드 전에 `python3 ../tools/webp_images.py && python3 ../tools/imgsize.py` 로 WebP 사본과 그림 크기 표를 갱신한다(새 이미지를 넣었을 때). 사진은 `components/Pic.tsx`(`<picture>` WebP 우선 + width/height) 로 넣는다.
  - 글꼴: Pretendard 는 `public/fonts/pretendard/`(92개 동적 서브셋, OFL) + `app/fonts.css` 로 같은 서버에서 내보내고, 영문 Cormorant Garamond 는 `next/font/google`(빌드 때 1회 내려받음 → 빌드는 인터넷 연결 필요) 로 넣는다. 외부 CDN 요청 없음.
  - AI 점검 보고서: `../AI_CHECK_REPORT_2026-10-06.md`
  - 실서비스로 옮길 때는 `npm run build:prod` 결과를 올린다(noindex 메타·헤더가 자동으로 빠짐).

## 진료과목 7쪽 = 코딩 화면 (2026-10-06)
- 자동차사고·척추관절·내과·여성·피부·정신건강·다이어트는 통이미지 조각 대신 HTML/CSS 로 원본 디자인을 그대로 다시 그린다.
  - 화면: `components/clinic/ClinicPage.tsx`(+ `ClinicTabs.tsx`, `clinic.css`), 데이터: `lib/clinic.ts`
  - 글: `content/sub_clinic_pageNN.json`(원본과 글자 단위 대조 완료). 사진: `lib/clinic_photos.json` + `public/img/clinic/pN/`
  - 원본 1920px 시안 좌표를 가운데 1300px 기준 `--u` 단위로 옮겼다. 1023px 이하는 원본 모바일 시안(750px) 비율(`--m`).
- 사진 다시 자르기: `python3 ../tools/clinic_photos.py` → `python3 ../tools/webp_images.py`
  - 갈색 설명 박스·금색 번호 배지를 색으로 찾아 사진 위치를 정한다. 박스·배지가 덮는 모서리는 주변 색으로 메워 둔다.
  - 자동차사고 배경 띠 3개(어혈·치료시기·집중치료)는 원본에서 글자를 지우고 바탕만 복원한 것.
- 그 밖의 서브페이지(진료시간·의료진·입원실·입원절차·치료 4쪽)도 통이미지 없이 코딩: `components/sub/*.tsx`(+ 페이지별 css), 등록은 `components/sub/registry.ts`, 사진 추출 도구는 `../tools/sub/*.py`, 사진은 `public/img/sub/<group>-<page>/`.
- "글로 읽기"(원본 이미지 아래 글 구간)는 2026-10-06 현도 요청으로 되돌렸다(모든 상세가 코딩이라 불필요).
