# 공유 미리보기 이미지(og:image)

`public/og/*.jpg` (1200×630) — 카카오톡·페이스북·네이버 등에 링크를 붙였을 때 뜨는 그림.
페이지와 이미지 연결은 `lib/seo.ts` 의 `og` 값, 그림의 문구·사진은 `make-og.cjs` 의 `CARDS`.

## 다시 만들기
```bash
npm i --prefix /tmp/pp puppeteer-core@24      # 한 번만(프로젝트 의존성에는 넣지 않음)
NODE_PATH=/tmp/pp/node_modules node scripts/og/make-og.cjs            # 전부
NODE_PATH=/tmp/pp/node_modules node scripts/og/make-og.cjs home       # 하나만
```
Google Chrome 이 설치되어 있어야 한다(맥: /Applications/Google Chrome.app). 글꼴은 Pretendard(public/fonts)와
Google Fonts 의 Noto Serif KR·Cormorant Garamond 를 받아 쓴다(인터넷 필요).

이미지를 바꾼 뒤 카카오톡 미리보기가 그대로면 카카오 공유 디버거(developers.kakao.com/tool/debugger/sharing)에서 캐시를 지운다.
