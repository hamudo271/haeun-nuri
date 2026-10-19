#!/usr/bin/env python3
"""의료진 소개(about/page03) — 원본 통이미지에서 '글자 없는' 디자인 소스만 잘라 낸다.

원본: web/public/default/img/_yami/images/sub/sub01/sub01-03-01~04.jpg (PC 1920) · m_sub01-03-01~04.jpg (모바일 750)
결과: public/img/sub/about-page03/
  quote-bg.jpg / quote-bg-m.jpg   맨 위 어둡게 처리한 접수대 사진. 글자·밑줄·세로선·원 장식은 지움(cv2.inpaint)
                                  → 화면에서는 같은 자리에 HTML 글자·CSS 장식이 올라간다.
  doc-koo|kim|lee(-m).jpg         아치 안 원장 사진. 아치 밖(원본의 흰 바탕)은 아치 색(#f4efe9)으로 채운 직사각형
                                  → 아치 모양(위쪽 반원)은 CSS border-radius 로 그린다.
                                  모바일 원본은 로고 무늬가 아치 위에 겹쳐 있어 그 부분도 아치 색으로 지운다.
  hex.svg                         배경의 육각 로고 무늬(모바일 원본에서 윤곽을 따서 벡터로). 색·투명도는 CSS.
사용: python3 tools_sub/about_page03.py   (사본 폴더 어디서든). 다시 돌려도 같은 결과.
"""
import os
import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANDS = [
    os.path.join(ROOT, '..', 'web', 'public', 'default', 'img', '_yami', 'images', 'sub', 'sub01'),
    '/Users/johyeondo/.openclaw/workspace/deliverables/haeun-nuri/web/public/default/img/_yami/images/sub/sub01',
]
SRC = next(p for p in CANDS if os.path.isdir(p))
OUT = os.path.join(ROOT, 'public', 'img', 'sub', 'about-page03')
Q = 90
ARCH = np.array([233, 239, 244], np.uint8)  # BGR = #f4efe9


def load(name):
    im = cv2.imread(os.path.join(SRC, name))
    assert im is not None, name
    return im


def save(name, im):
    os.makedirs(OUT, exist_ok=True)
    cv2.imwrite(os.path.join(OUT, name), im, [cv2.IMWRITE_JPEG_QUALITY, Q, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
    print('  ', name, im.shape[1], 'x', im.shape[0])


# ------------------------------------------------------------------ 1. 맨 위 사진(글자 지우기)
def erase_text(im, boxes, shapes, signs=()):
    """boxes 안에서 주변보다 밝은 픽셀(글자·선) + shapes(원·세로선)를 지운다.
    signs: 사진 속 간판 글자 — 빛 번짐까지 넓게 잡아 지운다(간판 바탕색으로 메워짐)"""
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    g = gray.astype(int)
    med = cv2.medianBlur(gray, 31).astype(int)
    bright = (g - med) > 9
    mask = np.zeros(g.shape, np.uint8)
    for x0, y0, x1, y1 in boxes:
        mask[y0:y1, x0:x1] |= bright[y0:y1, x0:x1].astype(np.uint8)
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    if signs:
        med2 = cv2.medianBlur(gray, 75).astype(int)
        sm = np.zeros(g.shape, np.uint8)
        for x0, y0, x1, y1 in signs:
            sm[y0:y1, x0:x1] = ((g - med2) > 3)[y0:y1, x0:x1]
        sm = cv2.dilate(sm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
        for x0, y0, x1, y1 in signs:
            mask[y0:y1, x0:x1] |= sm[y0:y1, x0:x1]
    for kind, *v in shapes:
        if kind == 'circle':
            cx, cy, r = v
            cv2.circle(mask, (cx, cy), r, 1, -1)
        else:  # rect
            x0, y0, x1, y1 = v
            mask[y0:y1, x0:x1] = 1
    return cv2.inpaint(im, mask * 255, 9, cv2.INPAINT_TELEA)


def quote_bg():
    pc = load('sub01-03-01.jpg')[0:529]  # 어두운 사진: y 0~528 (아래 42px 은 흰 여백)
    pc = erase_text(
        pc,
        boxes=[(944, 72, 974, 98), (798, 104, 1128, 140), (804, 144, 1122, 180), (706, 310, 1220, 358), (596, 364, 1330, 400), (654, 400, 1272, 432)],
        shapes=[
            ('rect', 957, 190, 964, 262), ('circle', 960, 277, 24),
            ('rect', 1538, 72, 1650, 124),  # 오른쪽 유리 안 간판 글자(어두운 배경이라 통째로 메움)
            ('rect', 1552, 262, 1610, 372),  # 오른쪽 세로 큰 글자
        ],
        signs=[
            (344, 14, 668, 110),  # 사진 속 간판 글자(해운누리한의원)
            (1430, 370, 1535, 398),  # 데스크 'INFORMATION'
            (1125, 95, 1230, 210),  # TV 화면 글자
        ],
    )
    save('quote-bg.jpg', pc)
    mo = load('m_sub01-03-01.jpg')[0:668]  # 모바일: y 0~667
    mo = erase_text(
        mo,
        boxes=[(358, 58, 392, 88), (152, 100, 598, 145), (162, 154, 590, 199), (30, 350, 720, 408), (104, 422, 640, 463), (142, 465, 608, 502), (146, 506, 598, 543), (180, 548, 572, 585)],
        shapes=[('rect', 371, 185, 379, 276), ('circle', 374, 300, 32)],
        signs=[(16, 6, 340, 110)],  # 사진 속 간판 글자
    )
    save('quote-bg-m.jpg', mo)


# ------------------------------------------------------------------ 2. 원장 사진(아치 안)
def arch_photo(im, x0, y0, w=513, h=565, clear=None):
    """아치(위쪽 반원 + 아래 직사각형) 바운딩 박스를 자르고, 아치 밖은 아치 색으로 채운다"""
    ph = im[y0:y0 + h, x0:x0 + w].copy()
    r = w / 2
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = (w - 1) / 2, r - 0.5
    outside = (yy < cy) & (((xx - cx) ** 2 + (yy - cy) ** 2) > (r - 1.5) ** 2)
    ph[outside] = ARCH
    if clear is not None:  # 모바일: 아치 위에 겹친 로고 무늬 → 아치 색(사람과 떨어진 오른쪽 위만)
        cx0, cy0, cx1, cy1 = clear
        reg = ph[cy0:cy1, cx0:cx1].astype(int)
        # 아치색이거나 아치색에 로고색이 곱해진 색(약 #e9dfd3)인 픽셀만
        d1 = np.abs(reg - ARCH.astype(int)).max(2)
        d2 = np.abs(reg - np.array([211, 223, 233])).max(2)
        m = (d1 < 16) | (d2 < 16)
        reg[m] = ARCH
        ph[cy0:cy1, cx0:cx1] = reg.astype(np.uint8)
    return ph


DOCS = [
    # id, PC 파일, PC 아치 왼쪽 위, 모바일 파일, 모바일 아치 왼쪽 위
    ('koo', 'sub01-03-02.jpg', (310, 80), 'm_sub01-03-02.jpg', (119, 127)),
    ('kim', 'sub01-03-03.jpg', (1096, 67), 'm_sub01-03-03.jpg', (119, 108)),
    ('lee', 'sub01-03-04.jpg', (310, 36), 'm_sub01-03-04.jpg', (119, 104)),
]


def erase_marks(ph, box):
    """가운 팔의 자수 글자('해운누리')만 지운다. box 안에서 진한 픽셀 덩어리 중 box 위로 삐져나가지 않는 것(=글자)만.
    위쪽 육각 엠블럼은 box 위까지 이어진 덩어리라 남는다."""
    x0, y0, x1, y1 = box
    Y0 = max(0, y0 - 40)
    g = cv2.cvtColor(ph[Y0:y1, x0:x1], cv2.COLOR_BGR2GRAY).astype(int)
    loc = cv2.medianBlur(cv2.cvtColor(ph[Y0:y1, x0:x1], cv2.COLOR_BGR2GRAY), 15).astype(int)
    dark = ((loc - g) > 28).astype(np.uint8)
    dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(dark, connectivity=8)
    m = np.zeros(ph.shape[:2], np.uint8)
    for i in range(1, n):
        if st[i, 1] >= (y0 - Y0) and st[i, 4] >= 3:
            m[Y0:y1, x0:x1][lab == i] = 255
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    return cv2.inpaint(ph, m, 5, cv2.INPAINT_TELEA)


# 가운 자수 글자 위치(아치 사진 좌표) — PC / 모바일
MARKS = {
    'koo': ((402, 386, 434, 412), (402, 396, 434, 422)),
    'kim': ((326, 418, 384, 458), (331, 430, 388, 470)),
    'lee': ((284, 372, 351, 422), (277, 373, 343, 422)),
}
# 가슴의 이름 자수(파란 실) — PC / 모바일. 구가현은 없음
CHEST = {
    'kim': ((248, 402, 300, 428), (255, 413, 308, 440)),
    'lee': ((220, 368, 268, 392), (216, 368, 264, 392)),
}


def erase_box(ph, box, thr=16):
    """box 안에서 주변(중앙값)보다 어두운 획(자수 실)만 메운다. 자국은 box 밖으로 안 나감"""
    x0, y0, x1, y1 = box
    g = cv2.cvtColor(ph, cv2.COLOR_BGR2GRAY)
    loc = cv2.medianBlur(g, 21).astype(int)
    d = ((loc - g.astype(int)) > thr).astype(np.uint8)
    m = np.zeros_like(d)
    m[y0:y1, x0:x1] = d[y0:y1, x0:x1]
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    keep = np.zeros_like(m)
    keep[y0:y1, x0:x1] = m[y0:y1, x0:x1]
    return cv2.inpaint(ph, keep * 255, 4, cv2.INPAINT_TELEA)


def doctors():
    for did, pf, (px, py), mf, (mx, my) in DOCS:
        bp, bm = MARKS[did]
        pc = erase_marks(arch_photo(load(pf), px, py), bp)
        # 모바일: 로고 무늬가 아치 오른쪽 위(x 480~ , 아치 top-45 ~ +200)에 겹침 → 아치 좌표로 x 352~, y ~200
        mo = erase_marks(arch_photo(load(mf), mx, my, clear=(352, 0, 513, 200)), bm)
        if did in CHEST:
            cp, cm = CHEST[did]
            pc, mo = erase_box(pc, cp), erase_box(mo, cm)
        save(f'doc-{did}.jpg', pc)
        save(f'doc-{did}-m.jpg', mo)


# ------------------------------------------------------------------ 3. 육각 로고 무늬 → SVG
def hex_svg():
    """모바일 원본: 로고는 아치색(#f4efe9)을 '곱하기'로 얹은 것 → 흰 바탕/아치 바탕 각각에서 알파를 거꾸로 구한다"""
    a = load('m_sub01-03-02.jpg').astype(float)[:, :, ::-1]
    H, W, _ = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy, r = 375.0, 383.0, 256.5
    inarch = ((xx >= 119) & (xx <= 631) & (yy >= cy)) | (((xx - cx) ** 2 + (yy - cy) ** 2) <= r * r)
    bg = np.where(inarch[..., None], np.array([244, 239, 233.]), 255.)
    L = a * 255 / bg
    al = ((255 - L) / (255 - np.array([244, 239, 233.]))).mean(2)
    X0, Y0, X1, Y1 = 478, 80, 711, 281  # 로고 바운딩 박스(여유 2px)
    reg = np.clip(al[Y0:Y1, X0:X1], 0, 1).astype(np.float32)
    S = 8
    big = cv2.resize(reg, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
    big = cv2.GaussianBlur(big, (0, 0), S * 0.45)
    m = (big > 0.5).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (S + 1, S + 1)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] > 200 * S:  # 아치 가장자리 잔선 같은 작은 조각 버림
            keep[lab == i] = 1
    cs, hier = cv2.findContours(keep, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    ys, xs = np.where(keep)
    ox, oy = xs.min() / S, ys.min() / S
    w, h = (xs.max() - xs.min() + 1) / S, (ys.max() - ys.min() + 1) / S
    parts = []
    for c in cs:
        if cv2.contourArea(c) < 30 * S:
            continue
        c = cv2.approxPolyDP(c, S * 0.18, True).reshape(-1, 2)
        pts = [f'{(x / S - ox):.1f} {(y / S - oy):.1f}' for x, y in c]
        parts.append('M' + 'L'.join(pts) + 'Z')
    d = ''.join(parts).replace('.0 ', ' ').replace('.0L', 'L').replace('.0Z', 'Z')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} {h:.1f}" width="{w:.0f}" height="{h:.0f}">'
           f'<path fill="#f4efe9" fill-rule="evenodd" d="{d}"/></svg>\n')
    with open(os.path.join(OUT, 'hex.svg'), 'w') as f:
        f.write(svg)
    print('   hex.svg', f'{w:.1f}x{h:.1f}', len(svg), 'bytes', '(원본 위치 x', X0 + ox, 'y', Y0 + oy, ')')


if __name__ == '__main__':
    print('about/page03 →', OUT)
    quote_bg()
    doctors()
    hex_svg()
