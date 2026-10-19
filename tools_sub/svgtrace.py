"""작은 래스터 도형(아이콘 선, 로고 무늬)을 SVG 경로로 바꾸는 공용 함수 — tools_sub/*.py 에서 import.

방법: 0~1 농도 지도 → 8배 확대(부드럽게) → 0.5 문턱 → 윤곽선(구멍 포함) → 꼭짓점 줄이기 → path(evenodd)
"""
import cv2
import numpy as np


def trace(cover, scale=8, eps=0.6, min_area=4.0, thr=0.5):
    """cover: float32 0~1 (1 = 도형). 반환: (path d 문자열, 폭, 높이) — 좌표는 원래 픽셀 단위"""
    h, w = cover.shape
    big = cv2.resize(cover.astype(np.float32), (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    big = cv2.GaussianBlur(big, (0, 0), scale * 0.35)
    bw = (big >= thr).astype(np.uint8)
    cnts, _ = cv2.findContours(bw, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    parts = []
    for c in cnts:
        if cv2.contourArea(c) < min_area * scale * scale:
            continue
        a = cv2.approxPolyDP(c, eps * scale / 4, True).reshape(-1, 2) / scale
        if len(a) < 3:
            continue
        pts = ' '.join(f'{x:.2f} {y:.2f}' for x, y in a)
        parts.append(f'M{pts}Z')
    return ''.join(parts), w, h
