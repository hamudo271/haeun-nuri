#!/usr/bin/env python3
"""추나요법(treatment/page02) — 원본 통이미지에서 '디자인 소스'(사진·일러스트·아이콘·무늬)만 잘라 낸다.

글자는 전부 HTML 로 다시 올리므로, 사진 위에 박힌 글자·배지는 지운다(배지·상자가 덮는 자리는 정확히 그 범위만 메움).
결과: public/img/sub/treatment-page02/*.jpg, mark.svg / lib/sub_treatment_page02.json(도해 원 위치)
사용: python3 tools_sub/treatment_page02.py            (재실행하면 같은 결과)
      python3 tools_sub/treatment_page02.py --sheet    검수용 컨택트 시트 /tmp/hn_sheet_treatment_page02.jpg
"""
import glob, json, os, sys
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = '/Users/johyeondo/.openclaw/workspace/deliverables/haeun-nuri/web/public/default/img/_yami/images/sub/sub03'
OUT = os.path.join(ROOT, 'public', 'img', 'sub', 'treatment-page02')
WEB = '/img/sub/treatment-page02/'
Q = 90
SS = 8  # 원·선을 부드럽게 그릴 때의 소수점 정밀도(cv2 shift=3)


# =========================================================================== 공통 도구
def load(name):
    return cv2.imread(os.path.join(SRC, name))


def save(img, name, q=Q):
    path = os.path.join(OUT, name)
    cv2.imwrite(path, img, [cv2.IMWRITE_JPEG_QUALITY, q, cv2.IMWRITE_JPEG_OPTIMIZE, 1])
    return [int(img.shape[1]), int(img.shape[0])]


def text_mask(img, rects, thr=22, grow=4):
    """사진 위 밝은 글자(흰색·금색): 주변 평균보다 확 밝은 픽셀 → 조금 넓힌다. rects=(x0,y0,x1,y1) 안에서만"""
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    bl = cv2.GaussianBlur(g, (0, 0), 14)
    m = np.zeros(g.shape, np.uint8)
    for x0, y0, x1, y1 in rects:
        m[y0:y1, x0:x1] = ((g[y0:y1, x0:x1] - bl[y0:y1, x0:x1]) > thr).astype(np.uint8) * 255
    if grow:
        m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1)))
    return m


def circle_mask(shape, cx, cy, r):
    m = np.zeros(shape[:2], np.uint8)
    cv2.circle(m, (int(round(cx * SS)), int(round(cy * SS))), int(round(r * SS)), 255, -1, cv2.LINE_8, 3)
    return m


def inpaint_mask(img, *masks, radius=12, half=True, grain=None):
    """마스크 자리를 주변 색으로 메운다.
    half=True: 반 크기에서 메우고 키워서 마스크 안에만 넣음(넓은 자리). False: 원래 크기(가는 글자 자리).
    grain=(x0,y0,x1,y1): 그 영역(매끈한 바탕)의 잔 노이즈 세기만큼 메운 자리에도 노이즈를 입힌다."""
    m = np.zeros(img.shape[:2], np.uint8)
    for k in masks:
        if k is not None:
            m |= k
    if not m.any():
        return img.copy()
    if half:
        small = cv2.resize(img, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
        ms = cv2.resize(cv2.dilate(m, np.ones((3, 3), np.uint8)), (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
        fixed = cv2.inpaint(small, ms, radius, cv2.INPAINT_TELEA)
        big = cv2.resize(fixed, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)
        big = cv2.GaussianBlur(big, (0, 0), 1.0).astype(np.float32)
    else:
        big = cv2.inpaint(img, m, radius, cv2.INPAINT_TELEA).astype(np.float32)
    if grain:
        x0, y0, x1, y1 = grain
        f = img[y0:y1, x0:x1].astype(np.float32)
        sd = float((f - cv2.GaussianBlur(f, (0, 0), 1.5)).std())
        rng = np.random.default_rng(7)
        big += rng.normal(0, sd, big.shape[:2])[:, :, None]
    out = img.copy()
    sel = m > 0
    out[sel] = np.clip(big[sel], 0, 255).astype(np.uint8)
    return out


def fit_circle(pts, rounds=6):
    pts = np.asarray(pts, float)
    for _ in range(rounds):
        A = np.c_[2 * pts[:, 0], 2 * pts[:, 1], np.ones(len(pts))]
        s = np.linalg.lstsq(A, (pts ** 2).sum(1), rcond=None)[0]
        cx, cy = s[0], s[1]
        r = np.sqrt(s[2] + cx * cx + cy * cy)
        res = np.abs(np.hypot(pts[:, 0] - cx, pts[:, 1] - cy) - r)
        pts = pts[res < max(0.8, np.percentile(res, 70))]
    return float(cx), float(cy), float(r)


def disc_fit(img, c0, r0, col, tol=10):
    """원 하나: 예상 중심에서 바깥으로 광선을 쏘아 원 색이 끝나는 지점들 → 원 맞추기"""
    rgb = img[:, :, ::-1].astype(np.float32)
    col = np.array(col, np.float32)
    pts = []
    for t in np.radians(np.arange(0, 360, 2)):
        prev = None
        for rr in np.arange(r0 - 14, r0 + 14, 0.25):
            x, y = c0[0] + rr * np.cos(t), c0[1] + rr * np.sin(t)
            xi, yi = int(x), int(y)
            if not (0 <= xi < img.shape[1] - 1 and 0 <= yi < img.shape[0] - 1):
                break
            fx, fy = x - xi, y - yi
            p = (rgb[yi, xi] * (1 - fx) * (1 - fy) + rgb[yi, xi + 1] * fx * (1 - fy) + rgb[yi + 1, xi] * (1 - fx) * fy + rgb[yi + 1, xi + 1] * fx * fy)
            inside = bool(np.abs(p - col).max() <= tol)
            if prev is True and not inside:
                pts.append((x, y))
                break
            prev = inside
    return fit_circle(pts)


def photo_disc(img, bg, box):
    """단색 바탕 위 원형 사진: 바탕과 다른 덩어리(가는 선 제거)의 좌우 끝 → 원"""
    x0, y0, x1, y1 = box
    d = (np.abs(img[y0:y1, x0:x1, ::-1].astype(int) - np.array(bg)).sum(2) > 30).astype(np.uint8)
    o = cv2.morphologyEx(d, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    pts = []
    for y in range(0, o.shape[0], 3):
        xs = np.nonzero(o[y])[0]
        if len(xs):
            pts += [(xs.min() + x0, y + y0), (xs.max() + x0, y + y0)]
    return fit_circle(pts)


def mark_svg(gray_crop, color='currentColor'):
    """아주 옅은 로고 무늬(흰 바탕) → 윤곽선을 따서 SVG path(선 모양 그대로)"""
    v = (255 - gray_crop.astype(np.float32))
    big = cv2.resize(v, None, fx=8, fy=8, interpolation=cv2.INTER_CUBIC)
    big = cv2.GaussianBlur(big, (0, 0), 5)
    lvl = np.percentile(v[v > 2], 50) / 2 if (v > 2).any() else 3
    bw = (big > lvl).astype(np.uint8) * 255
    cs, hier = cv2.findContours(bw, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    ys, xs = np.nonzero(bw)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    parts = []
    for c in cs:
        if cv2.contourArea(c) < 64 * 2:
            continue
        ap = cv2.approxPolyDP(c, 2.0, True).reshape(-1, 2)
        pts = ['%.2f %.2f' % ((x - bx0) / 8, (y - by0) / 8) for x, y in ap]
        parts.append('M' + 'L'.join(pts) + 'Z')
    w, h = (bx1 - bx0) / 8, (by1 - by0) / 8
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.2f %.2f" width="%.2f" height="%.2f">'
            '<path fill="%s" fill-rule="evenodd" d="%s"/></svg>\n') % (w, h, w, h, '#000' if color == 'currentColor' else color, ''.join(parts))


def hex_diagram(img, centers, r0, name):
    """육각 도해: 원 6개 위치를 맞추고, 원 자리(원 + 1px)를 주변 색으로 메운다 → 화면에서 HTML 원이 정확히 덮는다"""
    discs = []
    cov = np.zeros(img.shape[:2], np.uint8)
    for c0 in centers:
        ring = [img[int(c0[1] + r0 * 0.8 * np.sin(t)), int(c0[0] + r0 * 0.8 * np.cos(t)), ::-1] for t in np.radians(np.arange(0, 360, 5))]
        col = np.median(np.array(ring), 0)  # 원 색(반지름 80% 둘레의 중앙값 — 글자 밖)
        cx, cy, r = disc_fit(img, c0, r0, col)
        discs.append([round(cx, 2), round(cy, 2), round(r, 2), '#%02x%02x%02x' % tuple(int(v) for v in col)])
        cv2.circle(cov, (int(round(cx * SS)), int(round(cy * SS))), int(round((r + 1.0) * SS)), 255, -1, cv2.LINE_8, 3)
    out = inpaint_mask(img, cov, radius=9)
    wh = save(out, name)
    return {'src': WEB + name, 'wh': wh, 'discs': discs}


# =========================================================================== 이 페이지
def run():
    os.makedirs(OUT, exist_ok=True)
    for f in glob.glob(os.path.join(OUT, '*')):
        if not f.endswith('.webp'):  # webp 는 별도 명령으로 만든다(지우지 않음)
            os.remove(f)
    info = {}

    def put(key, img, name, q=Q):
        info[key] = {'src': WEB + name, 'wh': save(img, name, q)}

    # ---------------------------------------------------- 소개: 사진 + 육각 로고 무늬(벡터)
    a = load('sub03-02-01.jpg')
    put('intro', a[115:507, 310:896], 'intro.jpg')                 # 586x392
    m = load('m_sub03-02-01.jpg')
    put('mIntro', m[177:569, 31:720], 'm-intro.jpg')               # 689x392(모바일은 더 넓게 잘림)
    with open(os.path.join(OUT, 'mark.svg'), 'w') as f:
        f.write(mark_svg(cv2.cvtColor(a[64:297, 1450:1717], cv2.COLOR_BGR2GRAY)))

    # ---------------------------------------------------- 건강보험 띠: 글자 지우기 + 원형 배지 자리 메우기
    a = load('sub03-02-02.jpg')
    tm = text_mask(a, [(612, 95, 1306, 148), (936, 171, 984, 183), (848, 208, 1072, 244), (760, 248, 1160, 281), (871, 299, 1049, 323)], thr=30, grow=2)
    bcx, bcy, br = photo_disc_badge(a, (1515, 276), 92)
    info['badge'] = [round(bcx, 2), round(bcy, 2), round(br, 2)]
    a = inpaint_mask(a, tm, radius=5, half=False, grain=(60, 20, 300, 80))
    a = inpaint_mask(a, circle_mask(a.shape, bcx, bcy, br + 1), grain=(60, 20, 300, 80))
    put('band', a, 'band-insurance.jpg', 88)
    m = load('m_sub03-02-02.jpg')
    tm = text_mask(m, [(170, 110, 580, 226), (350, 252, 400, 265), (130, 292, 620, 374), (250, 388, 497, 419)], thr=30, grow=2)
    mcx, mcy, mr = photo_disc_badge(m, (372, 600), 131)
    info['mBadge'] = [round(mcx, 2), round(mcy - 20, 2), round(mr, 2)]           # 띠 기준(위 흰 20줄 뺌)
    m = inpaint_mask(m, tm, radius=5, half=False, grain=(30, 40, 200, 90))
    m = inpaint_mask(m, circle_mask(m.shape, mcx, mcy, mr + 1), grain=(30, 40, 200, 90))
    put('mBand', m[20:798], 'm-band-insurance.jpg', 86)

    # ---------------------------------------------------- 숙련도: 원형 사진(사진 위를 지나는 가는 원 선은 지움 — CSS 로 다시 그림)
    a = load('sub03-02-03.jpg')
    cx, cy, r = photo_disc(a, (189, 156, 113), (300, 30, 830, 560))
    info['skillFit'] = [round(cx, 2), round(cy, 2), round(r, 2)]
    ring = np.zeros(a.shape[:2], np.uint8)
    cv2.circle(ring, (int(round(544.6 * SS)), int(round(275.7 * SS))), int(round(232.7 * SS)), 255, 3, cv2.LINE_8, 3)
    ring = cv2.dilate(ring, np.ones((3, 3), np.uint8))
    fixed = cv2.inpaint(a, ring, 3, cv2.INPAINT_TELEA)
    x0, y0, d = int(round(cx - r)), int(round(cy - r)), int(round(2 * r))
    put('skill', fixed[y0:y0 + d, x0:x0 + d], 'skill.jpg')

    # ---------------------------------------------------- 특징 목록: 오른쪽 아래 아주 흐린 사진
    a = load('sub03-02-04.jpg')
    crop = a[:, 1300:1919].copy()                                     # 마지막 열 1919 는 이음새
    cov = np.zeros(crop.shape[:2], np.uint8)
    for y in (209, 299, 389, 479, 569):                               # 흰 상자 + 그림자가 덮는 자리
        cov[y - 6:y + 76, 0:1440 - 1300] = 255
    cov[160:167, 0:1612 - 1300] = 255                                 # 제목 아래 가는 선(HTML 선이 덮음)
    cov[105:150, 0:30] = 255                                          # 제목 끝 글자 '다.'
    crop = inpaint_mask(crop, cov)
    put('listBg', crop, 'list-bg.jpg', 88)
    m = load('m_sub03-02-04.jpg')
    crop = m[420:897].copy()
    cov = np.zeros(crop.shape[:2], np.uint8)
    for y0, y1 in ((443, 522), (550, 667), (695, 774)):
        cov[y0 - 6 - 420:y1 + 7 - 420, 24:724] = 255
    put('mListBg', inpaint_mask(crop, cov), 'm-list-bg.jpg', 88)

    # ---------------------------------------------------- 적용 질환: 갈색 사진 띠 + 아이콘 6개
    a = load('sub03-02-05.jpg')
    tm = text_mask(a, [(755, 96, 1163, 146), (546, 165, 1373, 224)], thr=30, grow=2)
    cov = np.zeros(a.shape[:2], np.uint8)
    cov[304:389, 313:1610] = 255                                      # 흰 바탕 상자가 덮는 자리(정확히)
    band = inpaint_mask(a[:389], tm[:389], radius=5, half=False)
    put('cardsBand', inpaint_mask(band, cov[:389]), 'band-cards.jpg', 88)
    m = load('m_sub03-02-05.jpg')
    tm = text_mask(m, [(170, 110, 580, 160), (60, 186, 692, 288)], thr=30, grow=2)
    put('mCardsBand', inpaint_mask(m[:388], tm[:388], radius=5, half=False), 'm-band-cards.jpg', 88)
    names = ['neck', 'spine', 'knee', 'pelvis', 'car', 'child']
    k = 0
    for y in (371, 688):
        for x in (371, 781, 1191):
            put('ic-' + names[k], a[y + 1:y + 212, x + 1:x + 358], 'ic-%s.jpg' % names[k])   # 카드 흰 칸(테두리 안쪽)
            k += 1
    k = 0
    for y in (436, 751, 1070):
        for x in (31, 389):
            put('m-ic-' + names[k], m[y + 1:y + 191, x + 1:x + 330], 'm-ic-%s.jpg' % names[k])
            k += 1

    # ---------------------------------------------------- 질환 사진 + 육각 도해
    put('neck', a[1120:1446, 312:1610], 'neck.jpg')
    put('back', a[2468:2794, 312:1610], 'back.jpg')
    put('mNeck', m[1466:1925, 0:750], 'm-neck.jpg')
    put('mBack', m[3586:4045, 0:750], 'm-back.jpg')
    pc = [(177, 64), (402, 64), (64, 258.5), (513, 258.5), (177, 452.5), (402, 452.5)]
    info['hexNeck'] = hex_diagram(a[1831:2348, 357:934].copy(), pc, 63, 'hex-neck.jpg')
    info['hexBack'] = hex_diagram(a[3179:3696, 357:934].copy(), pc, 63, 'hex-back.jpg')
    mc = [(212, 77.5), (481, 77.5), (77.5, 310), (615.5, 310), (212, 541.5), (481, 541.5)]
    info['mHexNeck'] = hex_diagram(m[2608:3225, 31:721].copy(), mc, 75, 'm-hex-neck.jpg')
    info['mHexBack'] = hex_diagram(m[4745:5362, 29:719].copy(), mc, 75, 'm-hex-back.jpg')

    with open(os.path.join(ROOT, 'lib', 'sub_treatment_page02.json'), 'w') as f:
        json.dump(info, f, ensure_ascii=False, indent=1)
    return info


def photo_disc_badge(img, c0, r0):
    """사진 위 갈색 원형 배지: 가장자리(갈색 → 사진) 광선 탐색"""
    rgb = img[:, :, ::-1].astype(int)
    pts = []
    for t in np.radians(np.arange(0, 360, 2)):
        last = None
        for rr in np.arange(r0 - 12, r0 + 12, 0.5):
            x, y = int(round(c0[0] + rr * np.cos(t))), int(round(c0[1] + rr * np.sin(t)))
            if not (0 <= x < img.shape[1] and 0 <= y < img.shape[0]):
                break
            p = rgb[y, x]
            brown = (p[0] - p[2] > 28) and (p[0] < 140) and (p[1] < 100)
            if brown:
                last = (x, y)
        if last:
            pts.append(last)
    return fit_circle(pts)


def sheet(out):
    fs = sorted(glob.glob(os.path.join(OUT, '*.jpg')))
    tiles = []
    for f in fs:
        im = cv2.imread(f)
        s = 300 / max(im.shape[:2])
        im = cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        t = np.full((330, 310, 3), 200, np.uint8)
        t[:im.shape[0], :im.shape[1]] = im
        cv2.putText(t, os.path.basename(f)[:28], (2, 325), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
        tiles.append(t)
    while len(tiles) % 5:
        tiles.append(np.full((330, 310, 3), 200, np.uint8))
    rows = [np.hstack(tiles[i:i + 5]) for i in range(0, len(tiles), 5)]
    cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])


if __name__ == '__main__':
    info = run()
    if '--sheet' in sys.argv:
        sheet('/tmp/hn_sheet_treatment_page02.jpg')
    for k, v in info.items():
        print(k, v if not isinstance(v, dict) else {kk: vv for kk, vv in v.items()})
