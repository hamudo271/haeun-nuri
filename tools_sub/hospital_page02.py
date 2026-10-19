#!/usr/bin/env python3
"""
입원절차 안내(hospital/page02) — 원본 이미지에서 '디자인 소스'만 뽑는다.

  python3 tools_sub/hospital_page02.py

결과: public/img/sub/hospital-page02/
  room-1..4.jpg   검은 띠 카드 사진(원본 sub02-02-07~10, 글자 없음 → 그대로)
  care-1..4.jpg   치료 카드 사진(sub02-02-11~14)
  step-1..6.jpg   STEP 탭 사진(sub02-02-15~20)
  band.jpg        보험 안내 띠 배경(PC, sub02-02-04) — 제목 글자·흰 상자를 지운 입원실 사진
  band-m.jpg      같은 띠의 모바일 배경(m_sub02-02-04)
  woman.jpg       돋보기 든 여성 일러스트(흰 상자 위, 글자 없음)
  doctor.jpg      차트 든 한의사 일러스트
글자(제목·상자 안 글·원·알약)는 모두 HTML 로 다시 쓰고, 아이콘은 컴포넌트 안 인라인 SVG 로 그린다.
같은 입력이면 항상 같은 결과가 나온다(난수 없음).
"""
import json
import os
import shutil

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = '/Users/johyeondo/.openclaw/workspace/deliverables/haeun-nuri/web/public/default/img/_yami/images/sub/sub02'
OUT = os.path.join(ROOT, 'public/img/sub/hospital-page02')
Q = [cv2.IMWRITE_JPEG_QUALITY, 88]

# 흰 상자 테두리: 5px, 흰색 39% 가 사진 위에 겹쳐 있다(주변 사진 대비로 측정)
RING = 5
ALPHA = 0.39


def src(name):
    return os.path.join(SRC, name)


def rrect(w, h, x0, y0, x1, y1, r, ss=4):
    """둥근 사각형 덮임 비율(0..1, 가장자리 계단 없이). x1,y1 은 끝(미포함) 좌표."""
    big = np.zeros((h * ss, w * ss), np.uint8)
    X0, Y0, X1, Y1, R = x0 * ss, y0 * ss, x1 * ss - 1, y1 * ss - 1, r * ss
    cv2.rectangle(big, (X0 + R, Y0), (X1 - R, Y1), 255, -1)
    cv2.rectangle(big, (X0, Y0 + R), (X1, Y1 - R), 255, -1)
    for cx, cy in ((X0 + R, Y0 + R), (X1 - R, Y0 + R), (X0 + R, Y1 - R), (X1 - R, Y1 - R)):
        cv2.circle(big, (cx, cy), R, 255, -1)
    return cv2.resize(big, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255


def dir_fill(img, target, valid, slope=None, vertical=False, nmax=700):
    """target 자리를 정해진 방향(세로, 또는 기울기 slope 의 가로선)으로 양쪽의 valid 픽셀을 찾아 거리 비례로 섞어 채운다.
    나뭇결(세로)·거울 속 선반선(살짝 기운 가로)이 끊기지 않고 이어진다."""
    H, W = img.shape[:2]
    ys, xs = np.where(target)
    if not len(ys):
        return img
    out = img.copy()
    found = []
    for sgn in (-1, 1):
        val = np.zeros((len(ys), 3), np.float32)
        dist = np.full(len(ys), -1.0)
        todo = np.ones(len(ys), bool)
        for k in range(1, nmax):
            if vertical:
                yy, xx = ys + sgn * k, xs
            else:
                xx = xs + sgn * k
                yy = np.rint(ys + sgn * k * slope).astype(int)
            inb = (yy >= 0) & (yy < H) & (xx >= 0) & (xx < W)
            idx = np.where(todo & inb)[0]
            if not len(idx):
                break
            ok = valid[yy[idx], xx[idx]]
            hit = idx[ok]
            val[hit] = img[yy[hit], xx[hit]]
            dist[hit] = k
            todo[hit] = False
            todo &= inb
            if not todo.any():
                break
        found.append((val, dist))
    (v1, d1), (v2, d2) = found
    both = (d1 > 0) & (d2 > 0)
    w2 = np.where(both, d1 / np.maximum(d1 + d2, 1e-6), (d2 > 0).astype(np.float32))
    res = v1 * (1 - w2[:, None]) + v2 * w2[:, None]
    out[ys, xs] = res
    return out


def circle_fit(pts):
    p = np.array(pts, float)
    x, y = p[:, 0], p[:, 1]
    A = np.c_[2 * x, 2 * y, np.ones(len(x))]
    cx, cy, c = np.linalg.lstsq(A, x * x + y * y, rcond=None)[0]
    return cx, cy, float(np.sqrt(c + cx * cx + cy * cy))


def clean_band(name, box, radius, title_box, rim_pts, slope, out_name, crop_h=None):
    """보험 안내 띠: 제목 글자를 지우고, 흰 상자(테두리 포함) 아래 사진을 되살린다."""
    img = cv2.imread(src(name)).astype(np.float32)
    if crop_h:
        img = img[:crop_h]
    H, W = img.shape[:2]
    x0, y0, x1, y1 = box  # 상자 바깥 테두리(끝 미포함)
    outer = rrect(W, H, x0, y0, x1, y1, radius)
    inner = rrect(W, H, x0 + RING, y0 + RING, x1 - RING, y1 - RING, radius - RING)
    # 픽셀 = 흰색*k + 사진*(1-k), k = 안쪽 흰 면 + 테두리(39%) → 테두리 아래 사진을 거꾸로 풀어 낸다
    k = inner + (outer - inner) * ALPHA
    k3 = k[:, :, None]
    photo = np.clip((img - 255 * k3) / np.maximum(1 - k3, 1e-3), 0, 255)
    ok = k < 0.6
    res = np.where(ok[:, :, None], photo, img)
    # 흰 면 안쪽(화면에서 흰 상자가 완전히 덮는 자리): 상자 밖 위·아래 사진을 세로로 이어 채운다
    res = dir_fill(res, ~ok, outer < 0.01, vertical=True)

    # 제목 글자: 주변보다 확 밝은 픽셀(흰 글·금색 글) + 번짐 2px
    tx0, ty0, tx1, ty1 = title_box
    u8 = np.clip(res, 0, 255).astype(np.uint8)
    g = cv2.cvtColor(u8, cv2.COLOR_BGR2GRAY).astype(np.int16)
    gb = cv2.cvtColor(cv2.medianBlur(u8, 31), cv2.COLOR_BGR2GRAY).astype(np.int16)
    tm = np.zeros((H, W), np.uint8)
    sub = (g - gb > 28) | (g > 165)
    tm[ty0:ty1, tx0:tx1] = sub[ty0:ty1, tx0:tx1]
    tm = cv2.dilate(tm, np.ones((5, 5), np.uint8)) > 0

    # 둥근 거울: 안쪽은 거울 속 선반선 방향(살짝 기운 가로)으로, 바깥 벽은 세로 나뭇결로 메우고 테두리선을 다시 긋는다
    cx, cy, r = circle_fit(rim_pts)
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    res = dir_fill(res, tm & (d <= r), ~tm & (d < r - 2.5), slope=slope)
    res = dir_fill(res, tm & (d > r), ~tm & (d > r + 2.5) & (outer < 0.01), vertical=True)
    rim_col = np.mean([img[int(y), int(x)] for x, y in rim_pts], axis=0)
    w = np.clip(1.3 - np.abs(d - r), 0, 1) * tm
    res = res * (1 - w[:, :, None]) + rim_col * w[:, :, None]
    # 메운 자리만 살짝 부드럽게(띠 자국 방지) — 원본 픽셀은 그대로
    soft = cv2.GaussianBlur(res, (0, 0), 0.7)
    res = np.where(tm[:, :, None], soft, res)
    cv2.imwrite(os.path.join(OUT, out_name), np.clip(res, 0, 255).astype(np.uint8), Q)


def trace_icon(path, box, bg, fg, ss=8, eps=0.2):
    """아이콘 픽셀(글자 없음)을 윤곽선으로 따서 SVG path 로 — 화면에서는 이 path 를 CSS 색으로 칠한다.
    box 안 좌표(원본 1px 단위)로 돌려준다."""
    img = cv2.imread(path)[:, :, ::-1].astype(np.float32)
    x0, y0, x1, y1 = box
    r = img[y0:y1, x0:x1]
    a = np.abs(r - np.array(bg, np.float32)).sum(2) / np.abs(np.array(fg, np.float32) - np.array(bg, np.float32)).sum()
    a = np.clip(a, 0, 1)
    big = cv2.resize(a, ((x1 - x0) * ss, (y1 - y0) * ss), interpolation=cv2.INTER_CUBIC)
    m = (big > 0.5).astype(np.uint8)
    cs, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    parts = []
    for c in cs:
        if cv2.contourArea(c) < (ss * ss) * 0.8:
            continue
        c = cv2.approxPolyDP(c, eps * ss, True).reshape(-1, 2) / ss
        parts.append('M' + 'L'.join(f'{x:g},{y:g}' for x, y in np.round(c, 1)) + 'Z')
    return {'w': x1 - x0, 'h': y1 - y0, 'd': ''.join(parts)}


def icons():
    shot = '/tmp/hn_orig_hosp2.png'  # 원본 화면 캡처(원 3개 아이콘은 HTML 아이콘 글꼴이라 캡처에서 딴다)
    p04, p05 = src('sub02-02-04.jpg'), src('sub02-02-05.jpg')
    W, GOLD = (255, 255, 255), (189, 156, 113)
    out = {}
    if os.path.exists(shot):  # 캡처가 없으면 lib JSON 에 있던 값을 그대로 둔다
        out['plus'] = trace_icon(shot, (598, 1160, 644, 1208), W, (188, 156, 112))
        out['user'] = trace_icon(shot, (936, 1158, 984, 1210), (188, 156, 112), W)
        out['mac'] = trace_icon(shot, (1274, 1160, 1322, 1208), (33, 37, 41), W)
    out.update({        # 보험 띠 상자
        'alert': trace_icon(p04, (703, 252, 739, 288), W, (62, 52, 43)),
        'clip': trace_icon(p04, (735, 535, 764, 565), W, (139, 114, 92)),
        # 버틀러 카드 5개(금색 선 아이콘)
        'doc': trace_icon(p05, (355, 416, 392, 457), W, GOLD),
        'car': trace_icon(p05, (789, 422, 831, 459), W, GOLD),
        'coin': trace_icon(p05, (1235, 421, 1280, 464), W, GOLD),
        'bed': trace_icon(p05, (355, 748, 394, 781), W, GOLD),
        'hosp': trace_icon(p05, (1013, 746, 1052, 781), W, GOLD),
    })
    return out


def crop_white(name, box, out_name):
    """흰 상자 위 일러스트를 잘라 낸다(바탕은 상자와 같은 흰색, 화면에서 multiply 로 겹침)."""
    img = cv2.imread(src(name))
    x0, y0, x1, y1 = box
    cv2.imwrite(os.path.join(OUT, out_name), img[y0:y1, x0:x1], Q)


def main():
    os.makedirs(OUT, exist_ok=True)
    for i, n in enumerate(range(7, 11), 1):
        shutil.copyfile(src(f'sub02-02-{n:02d}.jpg'), os.path.join(OUT, f'room-{i}.jpg'))
    for i, n in enumerate(range(11, 15), 1):
        shutil.copyfile(src(f'sub02-02-{n:02d}.jpg'), os.path.join(OUT, f'care-{i}.jpg'))
    for i, n in enumerate(range(15, 21), 1):
        shutil.copyfile(src(f'sub02-02-{n:02d}.jpg'), os.path.join(OUT, f'step-{i}.jpg'))

    # PC 띠 1920x731: 상자 바깥 (463,198)~(1458,624), 모서리 26 / 제목 줄 y 100~162
    #   거울 테두리 점(글자 위·아래에서 잰 밝은 선) / 거울 속 선반선 기울기
    rim_pc = [(1308, 40), (1308, 60), (1310, 80), (1311, 90), (1312, 95), (1346, 165), (1350, 170), (1356, 175), (1362, 180), (1378, 190)]
    clean_band('sub02-02-04.jpg', (463, 198, 1458, 624), 26, (470, 98, 1450, 163), rim_pc, -0.04, 'band.jpg')
    # 모바일 띠 750x882(아래 회색 줄 제외): 상자 (22,229)~(728,796), 제목 두 줄 y 90~205
    rim_m = [(514, 41), (511, 47), (509, 53), (506, 59), (503, 65), (501, 71), (499, 77), (497, 83), (495, 89), (493, 95), (487, 201), (488, 205), (489, 209), (490, 213), (491, 217), (493, 221), (494, 225)]
    clean_band('m_sub02-02-04.jpg', (22, 229, 728, 796), 26, (15, 88, 735, 206), rim_m, -0.16, 'band-m.jpg', crop_h=882)

    # 일러스트(흰 상자 안쪽 바닥 y=619 에서 잘림): 여성 / 한의사
    crop_white('sub02-02-04.jpg', (486, 386, 674, 619), 'woman.jpg')
    crop_white('sub02-02-04.jpg', (1262, 372, 1446, 619), 'doctor.jpg')

    # 아이콘 윤곽선 → lib/sub_hospital_page02.json (컴포넌트가 읽어 인라인 SVG 로 그림)
    lib = os.path.join(ROOT, 'lib/sub_hospital_page02.json')
    data = json.load(open(lib, encoding='utf-8')) if os.path.exists(lib) else {}
    data.setdefault('icons', {}).update(icons())
    with open(lib, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
