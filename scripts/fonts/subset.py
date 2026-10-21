"""사이트에서 실제로 쓰는 글자만 담은 글꼴 만들기 — 구글 폰트(next/font/google) 대신 자체 파일.

왜: 구글 폰트로 넣은 Noto Serif KR 은 @font-face 가 124~248개(CSS 77~154KB, 렌더링을 막음) + 조각 파일 여러 개를 받는다.
    이 사이트에서 그 글꼴로 그려지는 글자는 명조 117자, 송명 21자, 몬세라트 3자뿐이라 작은 파일 하나면 된다.
    글꼴은 같은 것(Noto Serif KR·Song Myung·Montserrat, 모두 OFL)이라 화면은 그대로다.

글자 목록: scripts/fonts/chars/*.txt
  - noto-serif-kr.txt · song-myung.txt · montserrat.txt: collect-chars.cjs 가 실제 화면(computed font-family)에서 모은 것
  - 메인 첫 화면 제목·의료진 문구(lib/home.ts)는 이 스크립트가 직접 읽는다
  → 그 글꼴로 그려지는 문구를 바꾸면 collect-chars.cjs 를 다시 돌리고(또는 chars/*.txt 에 글자를 보태고) 이 스크립트를 다시 실행.
    빠진 글자는 폴백 글꼴(시스템 명조)로 보인다.

실행:
  python3 -m venv /tmp/ftv && /tmp/ftv/bin/pip install fonttools brotli
  curl -L -o /tmp/NotoSerifKR-VF.ttf "https://github.com/google/fonts/raw/main/ofl/notoserifkr/NotoSerifKR%5Bwght%5D.ttf"
  curl -L -o /tmp/SongMyung-Regular.ttf "https://github.com/google/fonts/raw/main/ofl/songmyung/SongMyung-Regular.ttf"
  curl -L -o /tmp/Montserrat-VF.ttf "https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf"
  /tmp/ftv/bin/python scripts/fonts/subset.py /tmp
"""
import re, sys, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp')
CHARS = ROOT / 'scripts/fonts/chars'
BASIC = ' .,·!?()0123456789%:-~/“”‘’'


def home_chars():
    src = (ROOT / 'lib/home.ts').read_text(encoding='utf-8')
    hero = src[src.index('export const HERO'):src.index('export const PHILOSOPHY')]
    parts = re.findall(r"kicker:\s*'([^']*)'", hero) + re.findall(r"'([^']*)'", re.search(r"title:\s*\[(.*?)\]", hero, re.S).group(1))
    parts += re.findall(r"motto:\s*'([^']*)'", src)
    return ''.join(parts).replace('*', '')


def make(src_file, chars, out, wght=None):
    font = TTFont(SRC / src_file)
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    s = subset.Subsetter(opts)
    s.populate(text=''.join(sorted(set(chars + BASIC))))
    s.subset(font)
    if wght and 'fvar' in font:
        font = instancer.instantiateVariableFont(font, {'wght': wght})
    out = ROOT / 'public/fonts' / out
    out.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = 'woff2'
    font.save(out)
    print(f'{out.relative_to(ROOT)}  {len(set(chars))} chars  {out.stat().st_size // 1024}KB')


make('NotoSerifKR-VF.ttf', home_chars() + (CHARS / 'noto-serif-kr.txt').read_text(encoding='utf-8'), 'kserif/kserif.woff2', wght=(400, 700))
make('SongMyung-Regular.ttf', (CHARS / 'song-myung.txt').read_text(encoding='utf-8'), 'song/song-myung.woff2')
make('Montserrat-VF.ttf', (CHARS / 'montserrat.txt').read_text(encoding='utf-8'), 'mont/montserrat-800.woff2', wght=800)
