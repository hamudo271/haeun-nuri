#!/usr/bin/env python3
"""한약치료(treatment/page04) — 원본 통이미지에서 글자 없는 디자인 소스만 뽑는다.

원본: web/public/default/img/_yami/images/sub/sub03/sub03-04-01~05.jpg (PC 1920) + m_ (모바일 750)
결과: public/img/sub/treatment-page04/
  intro.jpg / intro-m.jpg      소개 사진(한약 그릇·약첩) — PC·모바일 시안의 자르기가 달라 따로
  band.jpg / band-m.jpg        '나이/체질/체형' 갈색 띠 배경(제목·설명 글자를 지우고, PC 는 흰 상자에 덮이는 아랫부분을 위 결로 이어 채움)
  adv-1~4.jpg / adv-1~4-m.jpg  장점 01~04 사진(연결 점의 흰 원이 사진을 덮는 자리만 주변 색으로 메움)
  decoction.jpg / decoction-m.jpg  '꼼꼼하고 깨끗하게' 띠 배경(글자·흰 막대 지움)
  mark.svg                     해운누리 육각 무늬(소개 오른쪽·효능 띠 오른쪽 장식) — 원본 무늬를 따라 그린 벡터
  (+ 각 jpg 의 .webp)
사용: python3 tools_sub/treatment_page04.py   (재실행하면 같은 결과)
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgtrace import trace  # noqa: E402

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = '/Users/johyeondo/.openclaw/workspace/deliverables/haeun-nuri/web/public/default/img/_yami/images/sub/sub03'
OUT = os.path.join(HERE, 'public', 'img', 'sub', 'treatment-page04')
Q = 90


def load(name):
    return cv2.imread(os.path.join(SRC, name))


def save_jpg(img, name):
    p = os.path.join(OUT, name)
    rgb = Image.fromarray(np.ascontiguousarray(img[:, :, ::-1]))
    rgb.save(p, 'JPEG', quality=Q, optimize=True, progressive=True)
    rgb.save(p.rsplit('.', 1)[0] + '.webp', 'WEBP', quality=80, method=6)
    return img.shape[1], img.shape[0]


def bright_text(img, boxes, thr=28, grow=2, k=31):
    """사진 위 밝은 글자(흰색·금색): 주변(중간값 흐림)보다 밝은 픽셀"""
    bg = cv2.medianBlur(img, k).astype(int)
    lum = lambda a: a[..., 0] * 0.114 + a[..., 1] * 0.587 + a[..., 2] * 0.299  # noqa: E731
    d = ((lum(img.astype(int)) - lum(bg)) > thr).astype(np.uint8)
    m = np.zeros(d.shape, np.uint8)
    for x0, y0, x1, y1 in boxes:
        m[y0:y1, x0:x1] = d[y0:y1, x0:x1]
    return cv2.dilate(m, np.ones((2 * grow + 1, 2 * grow + 1), np.uint8))


def soft_fill(img, mask, iters=60):
    """흐린 사진 위 글자 자리 메우기: 지운 영역 안을 테두리 색으로 '매끈하게 잇는'(조화 보간, 라플라스) 채움.
    여러 해상도로(거친 단계 → 고운 단계) 풀어서 큰 구멍도 평평한 얼룩 없이 테두리 색이 자연스럽게 이어진다."""
    f = img.astype(np.float32)
    m = (mask > 0).astype(np.float32)

    def solve(f, m):
        h, w = m.shape
        if min(h, w) > 24:
            fs = cv2.resize(f, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
            ms = (cv2.resize(m, (w // 2, h // 2), interpolation=cv2.INTER_AREA) > 0.01).astype(np.float32)
            coarse = cv2.resize(solve(fs, ms), (w, h), interpolation=cv2.INTER_LINEAR)
            g = np.where(m[..., None] > 0, coarse, f)
        else:
            g = np.where(m[..., None] > 0, f[m == 0].mean(0) if (m == 0).any() else f.mean((0, 1)), f)
        k = np.array([[0, .25, 0], [.25, 0, .25], [0, .25, 0]], np.float32)
        for _ in range(iters):
            g = np.where(m[..., None] > 0, cv2.filter2D(g, -1, k, borderType=cv2.BORDER_REPLICATE), f)
        return g

    out = solve(f, m)
    # 사진의 아주 옅은 결(노이즈)을 되살려 매끈한 얼룩처럼 보이지 않게
    rng = np.random.default_rng(7)
    out = np.where(m[..., None] > 0, out + rng.normal(0, 1.0, out.shape).astype(np.float32), out)
    return np.clip(out, 0, 255).astype(np.uint8)


def ring_fill(photo, cx, cy, r):
    """사진 가장자리를 덮는 흰 원 자리(사진 좌표)를 주변 색으로 — 원 안쪽만(화면에서 같은 원이 덮는다)"""
    m = np.zeros(photo.shape[:2], np.uint8)
    cv2.circle(m, (int(round(cx * 4)), int(round(cy * 4))), int(round(r * 4)), 1, -1, shift=2)
    return cv2.inpaint(photo, m, 6, cv2.INPAINT_TELEA)


def mark_svg():
    """소개 오른쪽의 아주 옅은 육각 무늬(흰 바탕 위 #f8f7f3)를 대비를 키워 따라 그린다 → 색은 CSS 가 정한다(mask)"""
    im = load('sub03-04-01.jpg')
    x0, y0, x1, y1 = 1446, 64, 1720, 300
    L = cv2.cvtColor(im[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY).astype(np.float32)
    L = cv2.GaussianBlur(L, (0, 0), 0.6)
    cover = np.clip((255 - L - 2.5) / 5.0, 0, 1)
    d, w, h = trace(cover, scale=8, eps=0.5, min_area=6, thr=0.5)
    # 실제 무늬 경계(여백 없이)로 viewBox 를 맞춘다
    ys, xs = np.where(cover > 0.5)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{bx0} {by0} {bx1 - bx0} {by1 - by0}">'
           f'<path fill="#000" fill-rule="evenodd" d="{d}"/></svg>')
    open(os.path.join(OUT, 'mark.svg'), 'w').write(svg)
    return (int(x0 + bx0), int(y0 + by0), int(bx1 - bx0), int(by1 - by0))


def main():
    os.makedirs(OUT, exist_ok=True)
    info = {}

    # ---------------------------------------------------------------- 1. 소개 사진
    pc1 = load('sub03-04-01.jpg')
    info['intro'] = save_jpg(pc1[116:508, 310:896], 'intro.jpg')  # 586x392(테두리 없음)
    mo1 = load('m_sub03-04-01.jpg')
    info['intro-m'] = save_jpg(mo1[177:569, 31:720], 'intro-m.jpg')  # 689x392
    info['mark'] = mark_svg()

    # ---------------------------------------------------------------- 2. 갈색 띠
    pc2 = load('sub03-04-02.jpg')[0:389].copy()
    m = bright_text(pc2, [(600, 90, 1320, 228)], thr=18, k=61, grow=5)
    band = soft_fill(pc2, m)
    # 흰 상자(x 310~1609, y 304~)에 덮인 아랫부분: 바로 위 85줄을 뒤집어 붙여 결을 잇는다(화면에서는 흰 상자가 덮음)
    H = 389 - 304
    band[304:389, 310:1610] = band[304 - H:304, 310:1610][::-1]
    info['band'] = save_jpg(band, 'band.jpg')
    mo2 = load('m_sub03-04-02.jpg')[29:418].copy()  # 750x389
    mm = bright_text(mo2, [(60, 100, 700, 300)], thr=18, k=61, grow=10)
    info['band-m'] = save_jpg(soft_fill(mo2, mm), 'band-m.jpg')

    # ---------------------------------------------------------------- 3. 장점 사진 4장
    pc3 = load('sub03-04-03.jpg')
    boxes = [(386, 182), (1013, 460), (386, 737), (1013, 1013)]
    dots = [(983.5, 320.5), (1011.8, 598.8), (983.5, 875.8), (1011.8, 1151.8)]
    for i, ((x, y), (cx, cy)) in enumerate(zip(boxes, dots), 1):
        ph = pc3[y:y + 277, x:x + 597].copy()
        info[f'adv-{i}'] = save_jpg(ring_fill(ph, cx - x, cy - y, 24.5), f'adv-{i}.jpg')
    mo3 = load('m_sub03-04-03.jpg')
    mboxes = [(30, 205), (420, 588), (30, 996), (420, 1449)]
    mdots = [(332.3, 343.7), (418.8, 726.6), (332.2, 1134.5), (419.0, 1587.5)]
    for i, ((x, y), (cx, cy)) in enumerate(zip(mboxes, mdots), 1):
        ph = mo3[y:y + 276, x:x + 300].copy()
        info[f'adv-{i}-m'] = save_jpg(ring_fill(ph, cx - x, cy - y, 24), f'adv-{i}-m.jpg')

    # ---------------------------------------------------------------- 5. 탕전 띠
    pc5 = load('sub03-04-05.jpg').copy()
    m5 = bright_text(pc5, [(830, 104, 1090, 140), (690, 150, 1230, 205), (750, 268, 1170, 340)], thr=22, k=61, grow=11)
    m5[229:241, 936:984] = 1  # 흰 막대
    info['decoction'] = save_jpg(soft_fill(pc5, m5), 'decoction.jpg')
    mo5 = load('m_sub03-04-05.jpg').copy()
    m5m = bright_text(mo5, [(230, 128, 520, 168), (80, 178, 670, 240), (130, 296, 620, 392), (345, 257, 405, 290)], thr=22, k=61, grow=11)
    info['decoction-m'] = save_jpg(soft_fill(mo5, m5m), 'decoction-m.jpg')

    for k, v in info.items():
        print(k, v)


if __name__ == '__main__':
    main()
