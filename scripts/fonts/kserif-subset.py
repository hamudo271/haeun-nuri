"""메인 첫 화면 명조체(Noto Serif KR) — 실제로 쓰는 글자만 담은 작은 글꼴(public/fonts/kserif/kserif.woff2) 만들기.

쓰는 곳: 메인 첫 화면 위 작은 글·큰 제목(.hv-kicker/.hv-title), 메인 의료진 문구(.dc-motto). 글자는 lib/home.ts 의
HERO.kicker·HERO.title·DOCTORS[].motto 에서 뽑는다 → 이 문구를 바꾸면 이 스크립트를 다시 돌린다
(안 돌리면 새 글자만 다른 명조체로 보인다).

실행:
  python3 -m venv /tmp/ftv && /tmp/ftv/bin/pip install fonttools brotli
  curl -L -o /tmp/NotoSerifKR-VF.ttf "https://github.com/google/fonts/raw/main/ofl/notoserifkr/NotoSerifKR%5Bwght%5D.ttf"
  /tmp/ftv/bin/python scripts/fonts/kserif-subset.py /tmp/NotoSerifKR-VF.ttf
글꼴 라이선스: SIL Open Font License 1.1 (Noto Serif KR).
"""
import re, sys, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parents[2]
src = (ROOT / 'lib/home.ts').read_text(encoding='utf-8')
hero = src[src.index('export const HERO'):src.index('export const PHILOSOPHY')]
parts = re.findall(r"kicker:\s*'([^']*)'", hero) + re.findall(r"'([^']*)'", re.search(r"title:\s*\[(.*?)\]", hero, re.S).group(1))
parts += re.findall(r"motto:\s*'([^']*)'", src)
text = ''.join(parts).replace('*', '') + '“”‘’.,·!?()0123456789 '
chars = ''.join(sorted(set(text)))
print(len(chars), 'chars:', chars)

font = TTFont(sys.argv[1])
opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_features = ['*']
opts.name_IDs = ['*']
opts.notdef_outline = True
s = subset.Subsetter(opts)
s.populate(text=chars)
s.subset(font)
font = instancer.instantiateVariableFont(font, {'wght': (400, 600)})  # 쓰는 굵기(400·500)만 남긴 가변 글꼴
out = ROOT / 'public/fonts/kserif/kserif.woff2'
out.parent.mkdir(parents=True, exist_ok=True)
font.flavor = 'woff2'
font.save(out)
print(out, out.stat().st_size, 'bytes')
