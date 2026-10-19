#!/usr/bin/env python3
"""입원실 안내(hospital/page01) — 원본 통이미지에서 '글자 없는' 사진만 잘라 낸다.

원본: web/public/default/img/_yami/images/sub/sub02/sub02-01-01~07.jpg (PC 1920) · m_sub02-01-01~07.jpg (모바일 750)
결과: public/img/sub/hospital-page01/
  intro.jpg / intro-m.jpg      맨 위 입원실 입구 사진. 갈색 설명 박스가 덮는 자리(정확히 그 범위만)는 주변 색으로 메움
  room-01~05.jpg               번호 블록의 둥근(스타디움) 사진. 둥근 밖은 사진 가장자리 색으로 메움 → 모양은 CSS
  room-01a/b ~ 05a/b.jpg       번호 블록 아래 사진 두 장(원본 회색 테두리 없이 2px 안쪽으로)
  banner.jpg / banner-m.jpg    맨 아래 '입원 절차' 배너 사진. 글자·버튼은 지움(화면에서는 HTML 이 같은 자리에)
  사진 속 간판·라벨 글자(입원실 간판, INFORMATION, 샤워실 표지, 제품 라벨 등)도 지움 — 글자 든 이미지 0 원칙.
사용: python3 tools_sub/hospital_page01.py   (다시 돌려도 같은 결과)
"""
import os
import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANDS = [
    os.path.join(ROOT, '..', 'web', 'public', 'default', 'img', '_yami', 'images', 'sub', 'sub02'),
    '/Users/johyeondo/.openclaw/workspace/deliverables/haeun-nuri/web/public/default/img/_yami/images/sub/sub02',
]
SRC = next(p for p in CANDS if os.path.isdir(p))
OUT = os.path.join(ROOT, 'public', 'img', 'sub', 'hospital-page01')
Q = 88


def load(name):
    im = cv2.imread(os.path.join(SRC, name))
    assert im is not None, name
    return im


def save(name, im):
    os.makedirs(OUT, exist_ok=True)
    cv2.imwrite(os.path.join(OUT, name), im, [cv2.IMWRITE_JPEG_QUALITY, Q, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
    print('  ', name, im.shape[1], 'x', im.shape[0])


def fill_rect(im, x0, y0, x1, y1):
    """[x0,x1)x[y0,y1) 를 바깥 주변 픽셀로 메운다(덮이는 범위만, 여백 0)"""
    m = np.zeros(im.shape[:2], np.uint8)
    m[y0:y1, x0:x1] = 255
    return cv2.inpaint(im, m, 15, cv2.INPAINT_TELEA)


def erase(im, boxes, thr=22, grow=5, k=21):
    """사진 속 글자: box 안에서 주변(중앙값)과 뚜렷이 다른 픽셀(밝거나 어두운 획)을 조금 넓혀서 메운다.
    box: (x0,y0,x1,y1) 또는 (x0,y0,x1,y1,{'k':중앙값 크기,'thr':문턱,'grow':넓힘}) — 넓힌 자국은 box 밖으로 안 나감."""
    im = im.copy()
    for b in boxes:
        x0, y0, x1, y1 = b[:4]
        o = b[4] if len(b) > 4 else {}
        kk, tt, gg = o.get('k', k), o.get('thr', thr), o.get('grow', grow)
        gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
        med = cv2.medianBlur(gray, kk).astype(int)
        if 'bright' in o:  # 어두운 사진 위 흰 글자: 밝기로 바로 잡는다(굵은 획 안쪽까지)
            d = (gray > o['bright']).astype(np.uint8)
        else:
            d = (np.abs(gray.astype(int) - med) > tt).astype(np.uint8)
        m = np.zeros(gray.shape, np.uint8)
        m[y0:y1, x0:x1] = 1 if o.get('all') else d[y0:y1, x0:x1]
        m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (gg, gg)))
        keep = np.zeros_like(m)
        keep[y0:y1, x0:x1] = m[y0:y1, x0:x1]
        im = cv2.inpaint(im, keep * 255, o.get('r', 5), cv2.INPAINT_TELEA)
    return im


def stadium(im, x, y, w=550, h=270):
    """스타디움(양끝 반원) 사진: 바운딩 박스를 자르고, 모양 밖(+1.5px 안쪽 띠)은 안쪽 사진 색으로 메움"""
    ph = im[y:y + h, x:x + w].copy()
    r = h / 2
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    cy = (h - 1) / 2
    cxl, cxr = r - 0.5, w - r - 0.5
    dx = np.where(xx < cxl, xx - cxl, np.where(xx > cxr, xx - cxr, 0))
    inside = dx ** 2 + (yy - cy) ** 2 <= (r - 2.5) ** 2
    m = (~inside).astype(np.uint8) * 255
    return cv2.inpaint(ph, m, 6, cv2.INPAINT_TELEA)


def rounded_fill(im, rad):
    """둥근 모서리 밖(배경색)을 사진 색으로 메운다"""
    h, w = im.shape[:2]
    m = np.zeros((h, w), np.uint8)
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    for cx, cy in [(rad, rad), (w - 1 - rad, rad), (rad, h - 1 - rad), (w - 1 - rad, h - 1 - rad)]:
        q = (np.abs(xx - cx) <= rad + 1) & (np.abs(yy - cy) <= rad + 1)
        corner = ((xx < rad) | (xx > w - 1 - rad)) & ((yy < rad) | (yy > h - 1 - rad))
        out = corner & (((xx - cx) ** 2 + (yy - cy) ** 2) > (rad - 2) ** 2) & q
        m[out] = 255
    return cv2.inpaint(im, m, 5, cv2.INPAINT_TELEA)


# ------------------------------------------------------------------ 위치(원본 좌표)
# 번호 블록: (원본 파일, 스타디움 사진 왼쪽 위, 아래 사진 두 장의 위쪽 y)
ROOMS = [
    ('sub02-01-02.jpg', (1055, 74), 410),
    ('sub02-01-03.jpg', (315, 73), 409),
    ('sub02-01-04.jpg', (1055, 174), 510),
    ('sub02-01-05.jpg', (315, 79), 458),
    ('sub02-01-06.jpg', (1055, 117), 453),
]
RECT_X = (310, 982)
RECT_W, RECT_H = 628, 328

# 사진 속 글자(간판·표지·라벨) 지울 자리 — 자른 사진 좌표
ERASE = {
    'intro': [
        (328, 93, 446, 151),  # 둥근 간판 '해운누리 한의원 입원실'(엠블럼은 남김)
        (114, 138, 158, 167, {'all': True, 'grow': 1, 'r': 9}),  # 문 표지 'STAFF ONLY' → 표지째 문 색으로
        (438, 350, 594, 405),  # 데스크 'INFORMATION'
        (600, 281, 641, 305),  # 세움 표지 '냉방중'
        (812, 176, 966, 216),  # 유리문에 비친 글자
        (256, 260, 306, 302),  # 벽 안내문(작은 글씨)
        (655, 208, 760, 305),  # 데스크 위 안내문 두 장(작은 글씨)
    ],
    'intro-m': [
        (198, 96, 295, 154),  # 둥근 간판
        (33, 136, 70, 161, {'all': True, 'grow': 1, 'r': 9}),  # 'STAFF ONLY' 표지째
        (580, 165, 683, 210, {'thr': 14, 'grow': 7, 'r': 8}),  # 유리에 비친 글자
        (140, 232, 186, 268),  # 벽 안내문
        (455, 192, 545, 262),  # 데스크 위 안내문
        (398, 248, 452, 262),  # '냉방중'
    ],
    # 사진 속 표지·라벨·안내문 글자(자른 사진 좌표)
    'room-01': [(92, 92, 140, 150, {'k': 11, 'thr': 20, 'grow': 3})],  # 벽 안내문
    'room-01a': [
        (236, 30, 262, 84, {'bright': 150, 'grow': 3, 'r': 4}),  # 검은 표지 '샤워실'(흰 글자만)
        (124, 146, 152, 164, {'bright': 150, 'grow': 2, 'r': 3}),  # 픽토그램 표지 아래 작은 글자
        (203, 140, 220, 152, {'bright': 150, 'grow': 2, 'r': 3}),
        (298, 112, 314, 142, {'bright': 150, 'grow': 2, 'r': 3}),
    ],
    'room-01b': [
        (242, 116, 280, 140, {'k': 11, 'thr': 18, 'grow': 3}), (316, 120, 344, 144, {'k': 11, 'thr': 18, 'grow': 3}),  # 냉장고 스티커
        (552, 0, 624, 72, {'k': 11, 'thr': 18, 'grow': 3}),  # 벽 안내문
    ],
    'room-03a': [
        (240, 46, 282, 92, {'k': 11, 'thr': 18, 'grow': 3}),  # 벽 안내문
        (546, 146, 596, 212, {'k': 9, 'thr': 18, 'grow': 3}),  # 병 라벨
    ],
    'room-04': [
        (188, 62, 244, 94, {'k': 11, 'thr': 20, 'grow': 3}),  # 와이파이 표지 글자
        (254, 106, 284, 126, {'k': 9, 'thr': 20, 'grow': 3}),  # 'LG'
        (256, 14, 348, 70, {'k': 9, 'thr': 24, 'grow': 2, 'r': 3}),  # 온도조절기 화면 글자
        (300, 84, 348, 128, {'k': 9, 'thr': 28, 'grow': 2, 'r': 3}),  # 버튼 글자
    ],
    'room-04a': [
        (320, 110, 360, 152, {'k': 11, 'thr': 18, 'grow': 3}),  # 공기청정기 라벨
        (380, 203, 402, 227, {'k': 9, 'thr': 18, 'grow': 3}),  # 벽 표지
    ],
    'room-05a': [
        (148, 18, 208, 102, {'k': 11, 'thr': 20, 'grow': 3}),  # 아크릴 안내판 글자
        (286, 104, 352, 122, {'k': 9, 'thr': 20, 'grow': 3}),  # 'Cafe Damda'
        (452, 6, 508, 26, {'k': 9, 'thr': 20, 'grow': 3}),  # 'SK magic'
        (90, 270, 152, 304, {'k': 11, 'thr': 22, 'grow': 3}),  # 전자레인지 스티커
        (418, 176, 452, 200, {'k': 9, 'thr': 20, 'grow': 3}), (408, 283, 448, 320, {'k': 9, 'thr': 20, 'grow': 3}),  # 정수기 스티커
    ],
    'banner': [
        (88, 58, 262, 282, {'k': 21, 'thr': 16, 'grow': 5, 'r': 7}),  # 벽 안내문 두 장(글자 잔상)
        (890, 345, 930, 380, {'k': 9, 'thr': 20, 'grow': 3}),  # 침대 라벨
    ],
    'banner-m': [
        (578, 216, 634, 240, {'k': 9, 'thr': 18, 'grow': 3}),  # 스위치 옆 라벨
        (536, 570, 572, 612, {'k': 9, 'thr': 20, 'grow': 3}),  # 침대 라벨
    ],
    'room-05b': [
        # 어메니티 병 라벨(병 가장자리는 남기게 라벨 안쪽만)
        (278, 8, 330, 120, {'k': 11, 'thr': 26, 'grow': 3}), (334, 25, 390, 138, {'k': 11, 'thr': 22, 'grow': 3}),
        (380, 42, 440, 160, {'k': 11, 'thr': 22, 'grow': 3}), (422, 64, 487, 198, {'k': 11, 'thr': 22, 'grow': 3}),
        # 치약 상자: 글자 획만(작은 중앙값)
        (130, 103, 212, 170, {'k': 9, 'thr': 40, 'grow': 3, 'r': 3}), (106, 160, 200, 202, {'k': 9, 'thr': 40, 'grow': 3, 'r': 3}),
        (190, 150, 300, 240, {'k': 11, 'thr': 24, 'grow': 3}), (325, 200, 420, 295, {'k': 11, 'thr': 24, 'grow': 3}),  # 샤워타월 포장 글자
        (430, 268, 530, 324, {'k': 11, 'thr': 24, 'grow': 3}),  # 작은 포장 글자
    ],
}


def main():
    print('hospital/page01 →', OUT)
    # 1) 맨 위 사진: 원본 사진 x310~1279, y7~415 → 2px 안쪽. 갈색 박스(x1076~, y262~)가 덮는 자리는 메움
    im = load('sub02-01-01.jpg')[9:414, 312:1278]
    im = fill_rect(im, 1076 - 312, 262 - 9, im.shape[1], im.shape[0])
    save('intro.jpg', erase(im, ERASE.get('intro', [])))
    mo = load('m_sub02-01-01.jpg')[4:389, 0:683]  # 모바일 사진 x0~684, y2~390
    mo = fill_rect(mo, 209, 264 - 4, mo.shape[1], mo.shape[0])
    save('intro-m.jpg', erase(mo, ERASE.get('intro-m', [])))
    # 2) 번호 블록 사진
    for i, (f, (sx, sy), ry) in enumerate(ROOMS, 1):
        src = load(f)
        save(f'room-0{i}.jpg', erase(stadium(src, sx, sy), ERASE.get(f'room-0{i}', [])))
        for k, rx in zip('ab', RECT_X):
            ph = src[ry + 2:ry + RECT_H - 2, rx + 2:rx + RECT_W - 2]
            save(f'room-0{i}{k}.jpg', erase(ph, ERASE.get(f'room-0{i}{k}', [])))
    # 3) 배너: PC 둥근 사각형 x310~1609, y99~553 / 모바일 전체
    b = load('sub02-01-07.jpg')[99:554, 310:1610]
    b = rounded_fill(b, 20)
    b = fill_pill(b, 402 - 310, 393 - 99, 528 - 310 + 1, 435 - 99 + 1)
    W = {'bright': 185, 'grow': 6, 'r': 6}  # 흰 글자만(대리석·거울 밝은 면은 남김)
    save('banner.jpg', erase(b, [(82, 96, 352, 124, W), (82, 141, 354, 191, W), (82, 196, 514, 246, W)] + ERASE.get('banner', [])))
    bm = load('m_sub02-01-07.jpg')
    bm = fill_pill(bm, 33, 352, 244, 409)
    save('banner-m.jpg', erase(bm, [(26, 108, 384, 144, W), (26, 160, 364, 222, W), (26, 229, 562, 290, W)] + ERASE.get('banner-m', [])))


def fill_pill(im, x0, y0, x1, y1):
    """버튼(알약 모양) 자리 — 화면에서 HTML 버튼이 정확히 덮는 범위만 주변 색으로"""
    m = np.zeros(im.shape[:2], np.uint8)
    h = y1 - y0
    r = h // 2
    cv2.rectangle(m, (x0 + r, y0), (x1 - r - 1, y1 - 1), 255, -1)
    cv2.circle(m, (x0 + r, y0 + r), r, 255, -1)
    cv2.circle(m, (x1 - r - 1, y0 + r), r, 255, -1)
    return cv2.inpaint(im, m, 15, cv2.INPAINT_TELEA)


if __name__ == '__main__':
    main()
