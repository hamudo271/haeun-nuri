# 해운누리한의원 홈페이지 리뉴얼 (Next.js)

기존 사이트(haeun-nuri.com)의 **메뉴 구조·페이지 23개·원고는 그대로** 두고, 디자인만 새로 만든 버전입니다.
참고: 더가든피부과(thegardenclinic.co.kr)의 연출 방식(절제된 색, 세리프 영문 라벨, 고정 스크롤, 숫자 카운트, 원형 의료진 컷, 번호 격자, 아치 전환, 알약형 카드, 원근 갤러리, 회전 예약 버튼).
더가든의 사진·문구·로고는 쓰지 않았습니다. 사진은 모두 해운누리 원본 사이트의 사진입니다.

- 작업일: 2026-10-03 · Next.js 16.3.8 / React 19 · 정적 내보내기(`out/`) + Express 서버(`server/`, 2026-10-20~) · 화면에는 외부 라이브러리 없음(움직임은 `components/Motion.tsx` 하나로 처리)

## 실행
```bash
npm install
npm run dev     # http://localhost:3000 (127.0.0.1 말고 localhost) — 화면만
npm run build   # 정적 파일 → out/
npm start       # server/ 가 out/ 과 관리자(/admin)를 함께 내보냄 (아래 '서버·관리자')
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
- 공지사항은 관리자 게시판에서 쓴다(예전 2건은 데이터베이스로 옮김). 첨부 엑셀은 `public/files/`.
- 추적·우클릭 방지 스크립트 없음.

## 다시 만들 때(원고·사진 추출 도구는 상위 폴더)
`../tools/extract_photos.py`(사진 자르기) → `../tools/fix_photos.py`(빠진 사진 보충) → `../tools/renewal_assets.py`(이 프로젝트로 복사, 번호 배지 지움).
검증: `../renew-verify/shoot.js`(PC·모바일 캡처·오류 점검), `../renew-verify/interact.js`(동작 점검).

## 서버·관리자 (Railway, 2026-10-20~) — 얼굴본성형외과와 같은 방식
- 화면은 Next.js 가 정적으로 만든 `out/`, 그것을 `server/`(Express) 가 내보낸다. `npm start` = `node server/server.js`.
- 서버가 하는 일: 게시판 쪽(해운누리 소식·전문칼럼·유튜브)과 비급여 진료비용을 데이터베이스 글로 채움(Next.js 틀의 `#cms-root`), 메인 팝업, 방문 집계(`public/js/track.js`), 광고·분석 코드, `/sitemap.xml`·`/rss.xml` 에 글 주소 추가, 관리자 `/admin`.
- 관리자 `/admin`(빌드 없는 HTML·CSS·JS, `server/admin/`): 대시보드 · 상담 관리 · 예약 일정 · 유입 분석 · 게시판 · 홈페이지(팝업·비급여·광고 코드) · 설정(직원 계정·접속 기록 등). 얼굴본 관리자를 옮겨 와 이름·색·메뉴 주소만 바꿨다.
- 해운누리에는 상담 신청서가 없어(예약은 네이버, 상담은 카톡) 상담 관리는 직원이 직접 등록하는 용도.
- 예전 공지 2건(lib/board.ts)은 처음 켤 때 같은 번호(5, 1)로 데이터베이스에 들어간다 → `/sub/board/page01/5/` 그대로.

### Railway 변수 (haeun-nuri 서비스 → Variables)
| 이름 | 내용 |
|---|---|
| `DATABASE_URL` | 같은 프로젝트의 Postgres 주소 (`${{Postgres.DATABASE_URL}}`) |
| `ADMIN_PASSWORD` | 대표 관리자(아이디 `admin`) 비밀번호 |
| `SITE_URL` | (선택) 대표 주소. 기본값 `https://haeun-nuri.com` — 넣는다면 `lib/site.ts` 의 `ORIGIN` 과 같아야 한다 |
| `NOTIFY_WEBHOOK_URL` / `NOTIFY_EMAIL` + `SMTP_URL` | (선택) 새 상담 알림 |

변수가 없어도 페이지는 모두 열린다(게시판 쪽은 빈 틀). `/healthz` 로 데이터베이스·비밀번호 상태를 확인한다. `*.up.railway.app` 주소는 검색 차단(X-Robots-Tag).

### 로컬에서 돌리기
```bash
npm run build
DATABASE_URL=postgres://… ADMIN_PASSWORD=… PORT=8090 npm start   # http://localhost:8090, 관리자 /admin
```
`npm run dev` 는 화면만(관리자·게시판 글 없음).

- Railway 빌드 명령은 `railway.json` 의 `npm run build:prod`(운영 빌드, robots noindex 메타 없음). `*.up.railway.app` 주소는 서버가 X-Robots-Tag 로 따로 막는다.
- 대표 주소는 `https://haeun-nuri.com`(2026-10-21 www 에서 변경, 네이버 서치어드바이저 등록 주소에 맞춤). `www.haeun-nuri.com/…` → `https://haeun-nuri.com/…` 301(GET 만). 예전 주소 `/default/sub/{그룹}/pageNN.php`·`/default/index.php`·`personal.php`·`service_rull.php` → 같은 새 페이지로 301, 빌더 샘플(`/default/sample|mall|member/…`)은 410 (`server/server.js` 앞부분).
- 검색엔진 제출 주소: 사이트맵 `https://haeun-nuri.com/sitemap.xml`(고정 페이지 + 글·사진, `server/feeds.js`), RSS `https://haeun-nuri.com/rss.xml`(소식·전문칼럼 최근 50건, 본문 전체 포함. 유튜브는 외부 링크라 제외).
- 남은 일(다음 단계): 기존 Cloudflare D1 의 칼럼·영상 옮기기, 칼럼 작성 원장 표시, 직원에게만 보이는 '수정' 버튼, 공지 상단 고정.
- 알아 둘 점: 글 한 편 페이지의 `<title>` 은 서버가 바꿔 보내지만, 브라우저에서 Next.js 가 틀의 제목('전문칼럼 | 해운누리한의원')으로 다시 바꾼다(검색엔진이 받는 HTML 은 글 제목).

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
