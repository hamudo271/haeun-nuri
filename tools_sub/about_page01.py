#!/usr/bin/env python3
"""진료시간(about/page01) — 원본 통이미지에서 글자 없는 디자인 소스만 뽑는다.

원본: web/public/default/img/_yami/images/sub/sub01/sub01-01-0{1,2}.jpg (+ m_)
- sub01-01-01 은 흰 바탕 + 글자 + 표(선)뿐이라 이미지가 필요 없다(전부 HTML/CSS).
- sub01-01-02(365 띠): 베이지 그라데이션 + 오른쪽 경락 인형 사진 + 육각 무늬
  → 글자·아이콘·구분선·위쪽 갈색 탭을 지운 배경 한 장(PC 1920, 모바일 750)
  → 원형 금색 아이콘 3개(약탕기·침대·자동차)는 선을 따라 그린 SVG(금색 원 + 흰 선)

결과: public/img/sub/about-page01/{bg365.jpg, bg365-m.jpg}(+ .webp), {ic-1,ic-2,ic-3}.svg
사용: python3 tools_sub/about_page01.py   (사본 폴더 어디서든)
"""
import os
import sys
import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgtrace import trace  # noqa: E402

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = '/Users/johyeondo/.openclaw/workspace/deliverables/haeun-nuri/web/public/default/img/_yami/images/sub/sub01'
OUT = os.path.join(HERE, 'public', 'img', 'sub', 'about-page01')
Q = 90


def load(name):
    return cv2.imread(os.path.join(SRC, name))


def text_mask(img, boxes, thr=30, k=51, grow=3):
    """상자 안에서 '주변(큰 중간값 흐림)보다 어두운 픽셀' = 글자 획(육각 무늬의 밝은 선은 남긴다)"""
    bg = cv2.medianBlur(img, k).astype(int)
    d = ((bg - img.astype(int)).sum(2) > thr).astype(np.uint8)
    m = np.zeros(d.shape, np.uint8)
    for x0, y0, x1, y1 in boxes:
        m[y0:y1, x0:x1] = d[y0:y1, x0:x1]
    return cv2.dilate(m, np.ones((2 * grow + 1, 2 * grow + 1), np.uint8))


def lerp_mask(img, x0, y0, x1, y1, thr=14, grow=3):
    """굵은 글자(365 등): 줄마다 상자 양끝 바탕색을 직선으로 이어 바탕으로 보고, 그와 다른 픽셀"""
    a = img.astype(np.float32)
    L = a[y0:y1, x0 - 6:x0 - 1].mean(1)
    R = a[y0:y1, x1 + 1:x1 + 6].mean(1)
    t = np.linspace(0, 1, x1 - x0)[None, :, None]
    bg = L[:, None, :] * (1 - t) + R[:, None, :] * t
    d = (np.abs(a[y0:y1, x0:x1] - bg).sum(2) > thr).astype(np.uint8)
    m = np.zeros(img.shape[:2], np.uint8)
    m[y0:y1, x0:x1] = d
    return cv2.dilate(m, np.ones((2 * grow + 1, 2 * grow + 1), np.uint8))


def fill(img, mask, rows=()):
    """지운 자리를 주변 색으로.
    - rows 상자(바탕이 가로 결의 그라데이션뿐인 곳): 줄마다 지운 구간 양옆 색을 직선으로 이음 → 가로 결이 그대로 이어진다
    - 그 밖(육각 무늬·인형 가까이): Telea(가는 획만 지워서 무늬 선이 이어지게)"""
    out = cv2.inpaint(img, mask, 5, cv2.INPAINT_TELEA).astype(np.float32)
    src = img.astype(np.float32)
    for x0, y0, x1, y1 in rows:
        for y in range(y0, y1):
            mrow = mask[y, x0:x1].astype(bool)
            if not mrow.any():
                continue
            xs = np.arange(x0, x1)
            good = ~mrow
            # 양옆 3px 평균을 기준점으로(잡티 줄이기)
            ref = cv2.blur(src[y:y + 1, x0:x1], (5, 1))[0]
            for c in range(3):
                out[y, x0:x1, c][mrow] = np.interp(xs[mrow], xs[good], ref[good, c])
        # 세로로 살짝 고르게(줄 사이 JPEG 잡티)
        blk = out[y0:y1, x0:x1]
        sm = cv2.GaussianBlur(blk, (1, 0) if False else (0, 0), sigmaX=0.1, sigmaY=1.2)
        mm = mask[y0:y1, x0:x1].astype(bool)
        blk[mm] = sm[mm]
    return np.clip(out, 0, 255).astype(np.uint8)


def circle_mask(shape, cx, cy, r):
    m = np.zeros(shape[:2], np.uint8)
    cv2.circle(m, (int(round(cx)), int(round(cy))), int(round(r)), 1, -1)
    return m


def save_jpg(img, name):
    p = os.path.join(OUT, name)
    Image.fromarray(img[:, :, ::-1]).save(p, 'JPEG', quality=Q, optimize=True, progressive=True)
    Image.fromarray(img[:, :, ::-1]).save(p.rsplit('.', 1)[0] + '.webp', 'WEBP', quality=80, method=6)
    return p


def icon_svg(img, cx, cy, r, name):
    """원형 금색 아이콘 → SVG(금색 원 + 흰 선 그림을 윤곽선으로 따라 그림). 래스터보다 선명하고 어느 배율에서나 깨끗하다."""
    R = 32
    x0, y0 = int(round(cx)) - R, int(round(cy)) - R
    sq = img[y0:y0 + 2 * R, x0:x0 + 2 * R, ::-1].astype(np.float32)
    L = sq @ np.array([0.299, 0.587, 0.114], np.float32)
    yy, xx = np.mgrid[0:2 * R, 0:2 * R]
    inside = ((xx + 0.5 - (cx - x0)) ** 2 + (yy + 0.5 - (cy - y0)) ** 2) <= (r - 2.5) ** 2
    gold = sq[inside & (L < 175)].mean(0)
    gL = float(gold @ np.array([0.299, 0.587, 0.114]))
    cover = np.clip((L - gL) / (255 - gL), 0, 1) * inside
    d, _, _ = trace(cover, eps=0.5, min_area=0.6, thr=0.6)
    col = '#%02x%02x%02x' % tuple(int(round(v)) for v in gold)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {2 * R} {2 * R}">'
           f'<circle cx="{cx - x0:.2f}" cy="{cy - y0:.2f}" r="{r:.2f}" fill="{col}"/>'
           f'<path fill="#fff" fill-rule="evenodd" d="{d}"/></svg>')
    open(os.path.join(OUT, name), 'w').write(svg)
    return col


def main():
    os.makedirs(OUT, exist_ok=True)

    # ---------------- PC 365 띠: 위 4px 흰 줄 제외(y 4~560)
    pc = load('sub01-01-02.jpg')
    icons = [(971.9, 209.3), (971.7, 288.3), (971.5, 368.4)]
    for i, (cx, cy) in enumerate(icons, 1):
        icon_svg(pc, cx, cy, 30.4, f'ic-{i}.svg')
    T = 4  # 위 흰 줄을 먼저 잘라 내고(채울 때 흰색이 섞이지 않게) 좌표를 T 만큼 올린다
    pc = pc[T:560].copy()
    m = text_mask(pc, [(300, 120 - T, 790, 470 - T)])
    m |= text_mask(pc, [(1010, 185 - T, 1440, 395 - T)], thr=20, grow=1)  # 육각 무늬와 겹치는 줄: 획만 얇게
    m |= lerp_mask(pc, 296, 120 - T, 796, 470 - T)
    m[0:26 - T, 300:520] = 1  # 위쪽 갈색 탭(CSS 로 다시 그림)
    m[372 - T:381 - T, 300:790] = 1  # 구분선
    for cx, cy in icons:
        m |= circle_mask(pc.shape, cx, cy - T, 34)
    save_jpg(fill(pc, m, rows=[(292, 0, 800, 480 - T)]), 'bg365.jpg')

    # ---------------- 모바일 365 띠: 위 14px 흰 줄 제외(y 14~844)
    T = 14
    mo = load('m_sub01-01-02.jpg')[T:844].copy()
    mm = text_mask(mo, [(20, 130 - T, 520, 480 - T), (95, 510 - T, 520, 750 - T)], k=41)
    mm |= lerp_mask(mo, 18, 130 - T, 514, 264 - T)
    mm |= lerp_mask(mo, 18, 268 - T, 500, 476 - T)
    mm[0:40 - T, 20:240] = 1
    mm[382 - T:391 - T, 20:510] = 1
    for cx, cy in [(58.9, 553.2), (58.7, 632.3), (58.5, 712.4)]:
        mm |= circle_mask(mo.shape, cx, cy - T, 34)
    save_jpg(fill(mo, mm, rows=[(14, 0, 518, 480 - T), (14, 480 - T, 505, 760 - T)]), 'bg365-m.jpg')
    print('ok', OUT)


if __name__ == '__main__':
    main()
