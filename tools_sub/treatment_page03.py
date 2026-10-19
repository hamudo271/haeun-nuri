#!/usr/bin/env python3
"""
통증매선(treatment/page03) 디자인 소스 추출.

실행:
  /Users/johyeondo/.openclaw/workspace/deliverables/cellreand-brochure/.venv/bin/python tools_sub/treatment_page03.py

원본 통이미지에서 글자가 없는 사진·도해·선 아이콘만 추출한다.
제목 띠는 글자 영역을 마스킹하고 주변 사진으로 inpaint한다.
출력은 public/img/sub/treatment-page03/ 아래에만 생성한다.
"""
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = Path('/Users/johyeondo/.openclaw/workspace/deliverables/haeun-nuri/web/public/default/img/_yami/images/sub/sub03')
OUT = ROOT / 'public/img/sub/treatment-page03'
JQ = [cv2.IMWRITE_JPEG_QUALITY, 90]


def read(name):
    image = cv2.imread(str(SRC / name), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(SRC / name)
    return image


def crop_jpg(image, box, name):
    x0, y0, x1, y1 = box
    part = image[y0:y1, x0:x1]
    if part.size == 0:
        raise ValueError((name, box))
    cv2.imwrite(str(OUT / name), part, JQ)


def clean_band(image, name, mobile=False):
    """제목·설명 글자만 지운 사진 띠. 중앙 텍스트 영역 밖 픽셀은 그대로 둔다."""
    band = image[:402 if mobile else 390].copy()
    h, w = band.shape[:2]
    hsv = cv2.cvtColor(band, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(band, cv2.COLOR_BGR2GRAY)
    # 원본 글자는 중앙의 밝은 흰색/금색. 사진 가장자리의 밝은 부분은 마스크하지 않는다.
    if mobile:
        x0, x1, y0, y1 = 34, 716, 64, 345
    else:
        x0, x1, y0, y1 = 455, 1465, 72, 315
    roi = np.zeros((h, w), np.uint8)
    sat, val = hsv[:, :, 1], hsv[:, :, 2]
    light_text = ((val > 160) & (sat < 150)) | ((val > 128) & (sat > 55) & (hsv[:, :, 0] > 5) & (hsv[:, :, 0] < 35))
    roi[y0:y1, x0:x1] = light_text[y0:y1, x0:x1].astype(np.uint8) * 255
    roi = cv2.morphologyEx(roi, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    roi = cv2.dilate(roi, np.ones((7, 7), np.uint8), iterations=1)
    cleaned = cv2.inpaint(band, roi, 7, cv2.INPAINT_TELEA)
    cv2.imwrite(str(OUT / name), cleaned, JQ)


def icon_png(image, box, name):
    """흰 카드 위 금색 선 아이콘을 투명 PNG로 만든다. crop에는 글자가 없다."""
    x0, y0, x1, y1 = box
    part = image[y0:y1, x0:x1]
    # 흰 바탕과의 RGB 거리로 알파를 만들어 JPEG 안티앨리어싱까지 보존.
    rgb = cv2.cvtColor(part, cv2.COLOR_BGR2RGB)
    distance = 255 - np.min(rgb, axis=2)
    alpha = np.clip((distance.astype(np.float32) - 4) * 3.5, 0, 255).astype(np.uint8)
    # 흰색 잔상을 없애고 원본 금색/갈색 선은 유지.
    rgba = np.dstack([rgb, alpha])
    cv2.imwrite(str(OUT / name), cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    p1 = read('sub03-03-01.jpg')
    p2 = read('sub03-03-02.jpg')
    p3 = read('sub03-03-03.jpg')
    p4 = read('sub03-03-04.jpg')
    m2 = read('m_sub03-03-02.jpg')

    # 대표 사진: 원본 1px 회색 경계가 남지 않도록 2px 안쪽.
    crop_jpg(p1, (312, 117, 893, 505), 'intro.jpg')

    # 치료 원리 도해 3개(글자 없는 일러스트만).
    crop_jpg(p2, (429, 398, 703, 670), 'how-1.jpg')
    crop_jpg(p2, (844, 398, 1106, 675), 'how-2.jpg')
    crop_jpg(p2, (1245, 433, 1493, 656), 'how-3.jpg')
    clean_band(p2, 'how-band.jpg')
    clean_band(m2, 'how-band-m.jpg', mobile=True)

    # 적용 질환 9개 선 아이콘. 각 crop은 원본 카드의 제목 영역 위에서 끝난다.
    icons = [
        (491, 344, 609, 490),
        (911, 340, 1007, 491),
        (1307, 362, 1430, 479),
        (478, 685, 616, 796),
        (850, 678, 1064, 782),
        (1288, 672, 1421, 800),
        (501, 993, 616, 1108),
        (895, 986, 1055, 1099),
        (1303, 983, 1433, 1093),
    ]
    for i, box in enumerate(icons, 1):
        icon_png(p3, box, f'indication-{i}.png')

    # 장점 사진 3개: 사진 외곽 회색선 2px 제거.
    crop_jpg(p4, (388, 165, 981, 438), 'adv-1.jpg')
    crop_jpg(p4, (1015, 443, 1608, 716), 'adv-2.jpg')
    crop_jpg(p4, (388, 720, 981, 993), 'adv-3.jpg')


if __name__ == '__main__':
    main()
