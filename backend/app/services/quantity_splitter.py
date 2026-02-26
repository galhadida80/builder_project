import logging

import cv2
import fitz
import numpy as np

logger = logging.getLogger(__name__)

MIN_AREA_RATIO = 0.02
MIN_ASPECT_RATIO = 0.4
MAX_ASPECT_RATIO = 2.5
RENDER_DPI = 150
CROP_DPI = 200


def split_garmoshka(file_content: bytes) -> list[bytes]:
    doc = fitz.open(stream=file_content, filetype="pdf")
    if len(doc) == 0:
        doc.close()
        return []

    page = doc[0]
    is_wide = page.rect.width > page.rect.height * 1.5
    if not is_wide:
        logger.info("Not a garmoshka layout (page is not wide enough), returning full page")
        pix = page.get_pixmap(matrix=fitz.Matrix(CROP_DPI / 72, CROP_DPI / 72))
        result = [pix.tobytes("png")]
        doc.close()
        return result

    zoom = RENDER_DPI / 72
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    img_bytes = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)

    if pix.n == 4:
        img_bgr = cv2.cvtColor(img_bytes, cv2.COLOR_RGBA2BGR)
    elif pix.n == 3:
        img_bgr = cv2.cvtColor(img_bytes, cv2.COLOR_RGB2BGR)
    else:
        img_bgr = img_bytes

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 5)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=3)

    contours, hierarchy = cv2.findContours(closed, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    page_area = pix.w * pix.h
    min_area = page_area * MIN_AREA_RATIO
    img_h, img_w = img_bgr.shape[:2]

    candidates = []
    for i, cnt in enumerate(contours):
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue

        # Skip the page-level contours (>90% of page area)
        if area > page_area * 0.9:
            continue

        x, y, w, h = cv2.boundingRect(cnt)
        aspect = w / h if h > 0 else 0

        if aspect < MIN_ASPECT_RATIO or aspect > MAX_ASPECT_RATIO:
            continue

        if w < img_w * 0.05 or h < img_h * 0.15:
            continue

        # Compute hierarchy depth
        depth = 0
        p = i
        while hierarchy is not None and hierarchy[0][p][3] != -1:
            p = hierarchy[0][p][3]
            depth += 1

        candidates.append((x, y, w, h, area, depth))

    # Prefer contours at the deepest common level (typically level 4 for garmoshka)
    if candidates:
        depth_counts = {}
        for _, _, _, _, _, d in candidates:
            depth_counts[d] = depth_counts.get(d, 0) + 1
        best_depth = max(depth_counts, key=lambda d: depth_counts[d])
        candidates = [(x, y, w, h, a) for x, y, w, h, a, d in candidates if d == best_depth]
    else:
        candidates = []

    candidates = filter_overlapping(candidates)
    candidates.sort(key=lambda c: c[0])

    if len(candidates) < 2:
        logger.info(f"OpenCV found {len(candidates)} region(s), returning full page as single image")
        pix_full = page.get_pixmap(matrix=fitz.Matrix(CROP_DPI / 72, CROP_DPI / 72))
        result = [pix_full.tobytes("png")]
        doc.close()
        return result

    logger.info(f"OpenCV detected {len(candidates)} floor drawing regions")

    scale = CROP_DPI / RENDER_DPI
    crop_mat = fitz.Matrix(CROP_DPI / 72, CROP_DPI / 72)
    pix_hires = page.get_pixmap(matrix=crop_mat)
    hires_bytes = np.frombuffer(pix_hires.samples, dtype=np.uint8).reshape(pix_hires.h, pix_hires.w, pix_hires.n)

    if pix_hires.n == 4:
        hires_bgr = cv2.cvtColor(hires_bytes, cv2.COLOR_RGBA2BGR)
    elif pix_hires.n == 3:
        hires_bgr = cv2.cvtColor(hires_bytes, cv2.COLOR_RGB2BGR)
    else:
        hires_bgr = hires_bytes

    floor_images = []
    for x, y, w, h, _ in candidates:
        hx = int(x * scale)
        hy = int(y * scale)
        hw = int(w * scale)
        hh = int(h * scale)

        hx = max(0, hx - 10)
        hy = max(0, hy - 10)
        hw = min(hires_bgr.shape[1] - hx, hw + 20)
        hh = min(hires_bgr.shape[0] - hy, hh + 20)

        crop = hires_bgr[hy:hy + hh, hx:hx + hw]
        success, png_data = cv2.imencode(".png", crop)
        if success:
            floor_images.append(png_data.tobytes())

    doc.close()

    if not floor_images:
        logger.warning("Cropping produced no images, falling back to full page")
        doc2 = fitz.open(stream=file_content, filetype="pdf")
        pix_fb = doc2[0].get_pixmap(matrix=fitz.Matrix(CROP_DPI / 72, CROP_DPI / 72))
        floor_images = [pix_fb.tobytes("png")]
        doc2.close()

    return floor_images


def filter_overlapping(candidates: list[tuple], overlap_thresh: float = 0.5) -> list[tuple]:
    if len(candidates) <= 1:
        return candidates

    sorted_by_area = sorted(candidates, key=lambda c: c[4], reverse=True)
    kept = []

    for candidate in sorted_by_area:
        x1, y1, w1, h1, _ = candidate
        is_overlap = False
        for kx, ky, kw, kh, _ in kept:
            ix = max(x1, kx)
            iy = max(y1, ky)
            ix2 = min(x1 + w1, kx + kw)
            iy2 = min(y1 + h1, ky + kh)
            if ix < ix2 and iy < iy2:
                inter_area = (ix2 - ix) * (iy2 - iy)
                smaller_area = min(w1 * h1, kw * kh)
                if inter_area / smaller_area > overlap_thresh:
                    is_overlap = True
                    break
        if not is_overlap:
            kept.append(candidate)

    return kept
