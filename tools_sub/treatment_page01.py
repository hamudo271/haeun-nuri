#!/usr/bin/env python3
"""진료안내 > 약침치료(treatment/page01) — 원본 통이미지에서 '디자인 소스'(사진·장식)만 잘라 낸다.

- 글자는 한 글자도 이미지에 남기지 않는다: 갈색 띠의 제목·태그·설명, 띠 아래 흰 판에 걸친 머리글은 지우고(inpaint/흰색),
  사진 속 주사기 눈금 숫자·벽 차트 글씨도 지운다. 화면의 글은 모두 AcuPage.tsx 의 HTML.
- 사진은 원본 1px 테두리가 남지 않게 2px 안쪽으로 자른다.
- 원본에서 흰 동그라미(공정 사진)·링 선(원형 사진)이 사진을 덮는 자리는 HTML 이 같은 자리를 덮으므로
  정확히 덮이는 범위만 주변 픽셀로 메운다.
- 결정적(무작위 없음): 다시 돌려도 같은 결과.

사용: python3 tools_sub/treatment_page01.py   (사본 폴더 어디서든)
결과: public/img/sub/treatment-page01/*.jpg (+ 같은 이름 .webp 는 별도 명령으로)
"""
import os
import cv2
import numpy as np

SRC = '/Users/johyeondo/.openclaw/workspace/deliverables/haeun-nuri/web/public/default/img/_yami/images/sub/sub03'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'img', 'sub', 'treatment-page01')
Q = 90

_cache = {}


def load(name):
    if name not in _cache:
        im = cv2.imread(os.path.join(SRC, name))
        assert im is not None, name
        _cache[name] = im
    return _cache[name].copy()


def save(name, img, q=Q):
    os.makedirs(OUT, exist_ok=True)
    cv2.imwrite(os.path.join(OUT, name), img, [cv2.IMWRITE_JPEG_QUALITY, q, cv2.IMWRITE_JPEG_OPTIMIZE, 1])
    print(name, img.shape[1], 'x', img.shape[0])


def crop(img, x, y, w, h, inset=2):
    """(x,y,w,h) 사진 사각형을 inset 만큼 안쪽으로"""
    return img[y + inset:y + h - inset, x + inset:x + w - inset].copy()


def text_mask(img, boxes, mode='bright', thr=10, k=31, dil=5):
    """boxes 안에서 주변(큰 중앙값 필터)보다 밝은(bright)/어두운(dark) 픽셀 = 글자 획"""
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    med = cv2.medianBlur(g, k).astype(int)
    g = g.astype(int)
    m = np.zeros(g.shape, np.uint8)
    for (x0, y0, x1, y1) in boxes:
        x0, y0 = max(0, x0), max(0, y0)
        a = g[y0:y1, x0:x1]
        b = med[y0:y1, x0:x1]
        hit = (a - b) > thr if mode == 'bright' else (b - a) > thr
        m[y0:y1, x0:x1][hit] = 255
    if dil:
        m = cv2.dilate(m, np.ones((dil, dil), np.uint8))
    return m


def inpaint(img, mask, r=7):
    return cv2.inpaint(img, mask, r, cv2.INPAINT_TELEA)


def disc_mask(shape, cx, cy, r):
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    return (((xx - cx) ** 2 + (yy - cy) ** 2) <= r * r).astype(np.uint8) * 255


# ---------------------------------------------------------------- 갈색 띠(제목 영역 배경 사진)
def band(name, y0, h, text_boxes, dark_boxes=(), panel=None, w=1708):
    """띠 사진: 글자 지우고, 흰 판이 덮는 자리(panel=(x,y))는 흰색으로.
    글자 테두리(안티앨리어스)까지 잡으려고 낮은 문턱+넓은 팽창으로 마스크를 만들고, 메운 뒤에는
    글자 상자 안을 살짝 흐려 잔상을 없앤다(원본 띠 사진 자체가 흐린 사진이라 티가 나지 않는다)."""
    img = load(name)[y0:y0 + h, 0:w].copy()
    tb = [(x0, y0b - y0, x1, y1 - y0) for (x0, y0b, x1, y1) in text_boxes]
    m = text_mask(img, tb, 'bright', 6, dil=7)
    if dark_boxes:
        m |= text_mask(img, [(x0, y0b - y0, x1, y1 - y0) for (x0, y0b, x1, y1) in dark_boxes], 'dark', 5, dil=7)
    if panel:
        px, py = panel
        m[py - y0:, px:] = 0
    img = inpaint(img, m, 9)
    soft = cv2.GaussianBlur(img, (0, 0), 5)
    for (x0, y0b, x1, y1) in tb:
        x0, y0b = max(0, x0), max(0, y0b)
        img[y0b:y1, x0:x1] = soft[y0b:y1, x0:x1]
    if panel:
        px, py = panel
        img[py - y0:, px:] = 255  # 흰 판(HTML)이 덮는 자리: 머리글 글자째 흰색으로
    return img


def bands():
    # PC: 원본 1918 폭 기준, 띠는 x 0~1707, 오른쪽 위 둥근 모서리(r≈100)는 CSS 로 자른다
    save('band-1.jpg', band('sub03-01-02.jpg', 0, 442,
                            [(298, 88, 548, 150), (300, 160, 525, 212), (818, 95, 1150, 140), (818, 155, 1592, 252)],
                            dark_boxes=[(725, 78, 842, 205)], panel=(308, 316)))
    save('band-2.jpg', band('sub03-01-05.jpg', 25, 442,
                            [(300, 112, 595, 172), (302, 185, 527, 236), (820, 118, 1512, 168), (820, 180, 1572, 278)],
                            panel=(310, 341)))
    save('band-3.jpg', band('sub03-01-08.jpg', 17, 442,
                            [(298, 105, 590, 165), (300, 177, 540, 228), (818, 112, 1552, 158), (818, 172, 1585, 270)],
                            panel=(308, 333)))
    # 모바일(750 시안): x 0~719, 둥근 모서리 r≈100
    save('m-band-1.jpg', band('m_sub03-01-02.jpg', 30, 473,
                              [(22, 88, 278, 150), (22, 160, 330, 225), (22, 250, 372, 296), (22, 306, 680, 446)],
                              dark_boxes=[(398, 160, 462, 224)], w=720))
    save('m-band-2.jpg', band('m_sub03-01-05.jpg', 25, 511,
                              [(22, 83, 320, 144), (22, 155, 330, 220), (22, 246, 526, 330), (22, 338, 660, 478)], w=720))
    save('m-band-3.jpg', band('m_sub03-01-08.jpg', 46, 508,
                              [(22, 104, 320, 165), (22, 176, 355, 241), (22, 267, 517, 352), (22, 360, 680, 500)],
                              dark_boxes=[(400, 195, 464, 258)], w=720))


# ---------------------------------------------------------------- 사진
def photos():
    a = load('sub03-01-01.jpg')
    save('intro.jpg', crop(a, 308, 114, 586, 392))
    m = load('m_sub03-01-01.jpg')
    save('m-intro.jpg', crop(m, 31, 176, 689, 392))

    # 01 경근약침 카드 6장(396x208)
    b = load('sub03-01-02.jpg')
    xs = [382, 797, 1212]
    for i, (x, y) in enumerate([(xs[0], 481), (xs[1], 481), (xs[2], 481), (xs[0], 788), (xs[1], 788), (xs[2], 788)]):
        ph = crop(b, x, y, 396, 208)
        if i == 0:  # 주사기 눈금 숫자
            ph = inpaint(ph, text_mask(ph, [(132, 112, 172, 150)], 'dark', 35, k=9, dil=2), 3)
        save(f'card1-{i + 1}.jpg', ph)

    # 원형 사진(노하우): 사진 원 지름 467(중심 569.5,336). 원 위를 지나는 링 선은 CSS 로 다시 그리므로 지운다
    c = load('sub03-01-03.jpg')
    x0, y0, d = 336, 103, 467
    sq = c[y0:y0 + d, x0:x0 + d].copy()
    rcx, rcy, rr = 542.6 - x0, 321.7 - y0, 232.8
    yy, xx = np.mgrid[0:d, 0:d]
    dist = np.sqrt((xx - rcx) ** 2 + (yy - rcy) ** 2)
    ring = (np.abs(dist - rr) <= 2.2).astype(np.uint8) * 255
    sq = inpaint(sq, ring, 4)
    save('knowhow.jpg', sq[2:-2, 2:-2])

    # 공정 사진 4장(597x277): 흰 동그라미(지름 46)가 사진 가장자리를 덮는다 → 그 자리만 메움
    p = load('sub03-01-04.jpg')
    steps = [(384, 176, (981, 315)), (1011, 454, (1010.5, 593)), (384, 731, (981, 870)), (1011, 1009, (1010.5, 1148))]
    for i, (x, y, (cx, cy)) in enumerate(steps):
        ph = p[y:y + 277, x:x + 597].copy()
        mk = disc_mask(ph.shape, cx - x, cy - y, 23)
        if i == 2:  # 벽 차트의 작은 글씨
            mk |= text_mask(ph, [(150, 2, 175, 20)], 'dark', 10, k=15, dil=3)
            mk[76:90, 398:436] = 255  # 차트 아래 작은 이름표 두 개(흐림)
            mk[76:90, 474:508] = 255
        if i == 3:  # 주사기 눈금 숫자
            mk |= text_mask(ph, [(255, 108, 300, 160)], 'dark', 35, k=9, dil=2)
        ph = inpaint(ph, mk, 5)
        save(f'step-{i + 1}.jpg', ph[2:-2, 2:-2])

    # 02 고농도봉침 카드 2장(597x277, 원본 1920 폭)
    e = load('sub03-01-05.jpg')
    save('bee-1.jpg', crop(e, 386, 505, 597, 277))
    ph = crop(e, 1014, 505, 597, 277)
    ph = inpaint(ph, text_mask(ph, [(130, 100, 255, 205)], 'dark', 35, k=9, dil=2), 3)
    save('bee-2.jpg', ph)
    # 모바일은 더 넓게 잡힌 사진(690x276)
    me = load('m_sub03-01-05.jpg')
    mb = bee_mobile_rects(me)
    save('m-bee-1.jpg', crop(me, *mb[0]))
    ph = crop(me, *mb[1])
    ph = inpaint(ph, text_mask(ph, [(225, 95, 350, 205)], 'dark', 35, k=9, dil=2), 3)
    save('m-bee-2.jpg', ph)

    # 03 자하거약침 카드 6장(396x208)
    h = load('sub03-01-08.jpg')
    for i, (x, y) in enumerate([(xs[0], 493), (xs[1], 493), (xs[2], 493), (xs[0], 848), (xs[1], 848), (xs[2], 848)]):
        save(f'card3-{i + 1}.jpg', crop(h, x, y, 396, 208))


def bee_mobile_rects(img):
    """모바일 봉침 사진 두 장의 사각형(흰 바탕과 다른 영역)"""
    g = np.abs(img.astype(int) - 255).max(2) > 6
    out = []
    for (ya, yb) in [(760, 1080), (1250, 1570)]:
        rows = np.where(g[ya:yb, 100:650].mean(1) > 0.5)[0]
        cols = np.where(g[ya + rows[0]:ya + rows[-1], :].mean(0) > 0.5)[0]
        out.append((int(cols[0]), int(ya + rows[0]), int(cols[-1] - cols[0] + 1), int(rows[-1] - rows[0] + 1)))
    return out


# ---------------------------------------------------------------- 장식 배경
def ink(img, bg, thr):
    """바탕색(bg, BGR)과 thr 이상 다른 픽셀"""
    return (np.abs(img.astype(int) - np.array(bg)).max(2) > thr)


def fill_soft(img, mask, r=5, sigma=40):
    """mask 자리를 주변(마스크 밖) 픽셀의 넓은 가중 평균으로 메운다(정규화 합성곱, 넓은 자리는 더 큰 반경으로).
    cv2.inpaint 는 넓은 자리를 메울 때 바탕보다 밝게 떠서(#fcfefe) 얼룩이 생기므로 쓰지 않는다."""
    keep = (mask == 0).astype(np.float32)
    out = img.astype(np.float32).copy()
    todo = mask > 0
    for sg in (sigma, sigma * 3, sigma * 10):
        num = cv2.GaussianBlur(img.astype(np.float32) * keep[..., None], (0, 0), sg)
        den = cv2.GaussianBlur(keep, (0, 0), sg)
        ok = todo & (den > 0.02)
        out[ok] = (num / (den[..., None] + 1e-9))[ok]
        todo &= ~ok
        if not todo.any():
            break
    return out.round().clip(0, 255).astype(np.uint8)


def hex_zone(shape, cx, cy):
    """육각형(채움 R108 + 링 R126 + 꼭짓점 점 + 위아래 점선) 자리"""
    z = np.zeros(shape[:2], np.uint8)
    cv2.fillPoly(z, [hexagon(cx, cy, 134)], 1)
    z[cy - 200:cy - 100, cx - 9:cx + 10] = 1   # 위 점선
    z[cy + 100:cy + 200, cx - 9:cx + 10] = 1   # 아래 점선
    return z > 0


def deco():
    """06 봉침 효과(벌집 무늬·해바라기) / 09 자하거 안전(흐린 사진) 배경.
    글자·선·상자(그림자 포함)·육각형(링·점선 포함)을 모두 지운다. 상자·육각형·그림자는 HTML/CSS 로 다시 그린다.
    PC 는 섹션 전체 폭 배경, 모바일은 배치가 달라 조각(벌집·해바라기·손)만 쓴다."""
    f = load('sub03-01-06.jpg')
    bg6 = (242, 246, 247)  # BGR #f7f6f2
    H, W = f.shape[:2]
    m = np.zeros((H, W), np.uint8)
    hd = np.zeros((H, W), bool)
    hd[95:170, 380:1330] = True                       # 머리글(소제목+제목) — 글자 획만
    m[hd & ink(f, bg6, 20)] = 255
    m[180:188, 376:1616] = 255                        # 가는 선
    boxes6 = [(664, 211, 361, 100), (1272, 211, 421, 100), (367, 675, 321, 100), (978, 675, 371, 100)]
    for (x, y, w, h) in boxes6:
        m[y - 22:y + h + 30, x - 24:x + w + 24] = 255 # 상자 + 그림자
    for cx in (526, 844, 1162, 1480):
        m[hex_zone(f.shape, cx, 493)] = 255
    m = cv2.dilate(m, np.ones((7, 7), np.uint8))
    clean = fill_soft(f, m)
    save('hexbg.jpg', clean[25:866, :].copy(), 92)
    # 모바일 조각: 벌집 무늬(왼쪽 위), 해바라기(오른쪽 아래) — 가장자리는 바탕색으로 부드럽게
    def fade_to_bg(piece, keep):
        a = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 12)[..., None]
        return (piece * a + np.array(bg6, np.float32) * (1 - a)).round().astype(np.uint8)
    honey = clean[25:500, 0:780].astype(np.float32)
    keep = np.ones(honey.shape[:2], np.float32)
    keep[:, 700:] = 0
    keep[400:, :] = 0
    save('honey.jpg', fade_to_bg(honey, keep), 92)
    sun = clean[580:866, 1340:1918].astype(np.float32)
    keep = np.ones(sun.shape[:2], np.float32)
    keep[:40, :] = 0
    keep[:, :60] = 0
    save('sunflower.jpg', fade_to_bg(sun, keep), 92)

    s9 = load('sub03-01-09.jpg')
    bg9 = (247, 247, 247)
    H, W = s9.shape[:2]
    m = np.zeros((H, W), np.uint8)
    hd = np.zeros((H, W), bool)
    hd[125:200, 380:1100] = True
    m[hd & ink(s9, bg9, 20)] = 255
    m[209:217, 376:1616] = 255
    rows9 = (258, 348, 439, 529, 619)
    for y in rows9:
        m[y - 8:y + 70 + 12, 503:1444] = 255          # 금색 띠 + 흰 상자 + 그림자
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))
    clean = fill_soft(s9, m, 5, 30)
    save('safety-bg.jpg', clean[39:786, :].copy(), 90)
    # 모바일: 오른쪽 손·침 부분(상자 밖)
    save('m-safety-hand.jpg', clean[200:786, 1460:1918].copy(), 90)


def marks():
    """글자 없는 로고 무늬: 소개 오른쪽의 큰 육각 마크(흰 바탕), 자하거 안전 상자의 작은 마크(흰 바탕)"""
    a = load('sub03-01-01.jpg')
    save('intro-mark.jpg', a[66:293, 1451:1712].copy(), 92)
    s9 = load('sub03-01-09.jpg')
    save('safety-icon.jpg', s9[273:313, 535:579].copy(), 92)


def hexagon(cx, cy, R):
    pts = [(cx - R, cy), (cx - R / 2, cy - R * 0.866), (cx + R / 2, cy - R * 0.866), (cx + R, cy), (cx + R / 2, cy + R * 0.866), (cx - R / 2, cy + R * 0.866)]
    return np.array(pts, np.int32)


if __name__ == '__main__':
    bands()
    photos()
    deco()
    marks()
