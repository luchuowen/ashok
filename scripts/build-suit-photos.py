#!/usr/bin/env python3
"""
Turn Nano Banana Pro base photos (design/nano-banana/out/<asset>.jpg) into
re-colourable layers for the suit customizer:

  public/suit-photos/<asset>/base.webp    photo on transparent background (garment only)
  public/suit-photos/<asset>/shade.webp   luminance of the cloth, normalised (128 = median)
  public/suit-photos/<asset>/mask.png     R = cloth, G = lining, B = buttons   (soft, 0-255)
  lib/suit/photo-assets.json              sizes + metadata

The browser tiles the chosen fabric texture, multiplies it by the shade inside
the cloth mask, tints the lining and buttons, and lays everything on the page's
neutral grey. The garment outline comes from an AI matte (rembg ISNet) rather
than a colour threshold, so the contact shadow never gets dyed.

    pip install "rembg[cpu]" opencv-python-headless
    python3 scripts/build-suit-photos.py [asset ...]
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "nano-banana" / "out"
OUT = ROOT / "public" / "suit-photos"
MANIFEST = ROOT / "lib" / "suit" / "photo-assets.json"
WIDTH = 1200  # delivered width (2x of the ~600 css px stage)


def matte(im: Image.Image) -> np.ndarray:
    from rembg import new_session, remove

    global _SESSION
    try:
        _SESSION
    except NameError:
        _SESSION = new_session("isnet-general-use")
    m = remove(im, session=_SESSION, only_mask=True)
    return np.asarray(m).astype(np.float32) / 255.0


def build(asset: str) -> dict:
    im = Image.open(SRC / f"{asset}.jpg").convert("RGB")
    w0, h0 = im.size
    h = round(h0 * WIDTH / w0)
    im = im.resize((WIDTH, h), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    L = 0.299 * R + 0.587 * G + 0.114 * B

    close = asset.startswith(("detail-", "wc-"))
    if close:
        # Close-ups touch the frame edges: pad with the studio colour so the matte sees
        # a whole object, then crop the matte back.
        border = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
        bgc = tuple(int(v) for v in np.percentile(border, 90, axis=0))
        P = WIDTH // 3
        big = Image.new("RGB", (WIDTH + 2 * P, h + 2 * P), bgc)
        big.paste(im, (P, P))
        alpha = matte(big)[P : P + h, P : P + WIDTH]
    else:
        alpha = matte(im)
    alpha = np.where(alpha < 0.04, 0, alpha)
    fg = alpha > 0.5

    # Lining: strongly green pixels (emerald satin) inside the garment.
    lining = np.clip((G - (R + B) / 2 - 10) / 25, 0, 1) * alpha
    # Buttons: small, compact, dark blobs.
    # Buttons: compact dark discs. Hough circles on the luminance find them even
    # where they touch the dark shadow of the front opening.
    btn = np.zeros(L.shape, np.uint8)
    blur = cv2.GaussianBlur(L.astype(np.uint8), (0, 0), 1.5)
    close = asset.startswith(("detail-", "wc-"))
    circles = cv2.HoughCircles(blur, cv2.HOUGH_GRADIENT, dp=1.2, minDist=20 if close else 12, param1=60, param2=16 if close else 11, minRadius=8 if close else 4, maxRadius=36 if close else 16)
    if circles is not None and not asset.startswith("detail-pick"):
        for cx, cy, r in np.round(circles[0]).astype(int):
            if 0 <= cy < L.shape[0] and 0 <= cx < L.shape[1] and fg[cy, cx]:
                ring = L[max(cy - r, 0) : cy + r, max(cx - r, 0) : cx + r]
                disc = a[max(cy - r + 2, 0) : cy + r - 1, max(cx - r + 2, 0) : cx + r - 1]
                warm = float(np.median(disc[..., 0] - disc[..., 2])) if disc.size else 0
                y0, y1, x0, x1 = max(cy - 2 * r, 0), cy + 2 * r, max(cx - 2 * r, 0), cx + 2 * r
                annulus = L[y0:y1, x0:x1].copy()
                yy, xx = np.ogrid[y0 - cy : y1 - cy, x0 - cx : x1 - cx]
                ann = annulus[(yy**2 + xx**2 > (1.4 * r) ** 2)[: annulus.shape[0], : annulus.shape[1]]]
                contrast = (np.median(ann) - np.median(ring)) if ann.size else 0
                if ring.size and np.median(ring) < 95 and lining[cy, cx] < 0.2 and (warm > 3 or np.median(ring) < 40) and contrast > (38 if close else 22) and (not close or ((np.median(ring) < 80 or (asset.startswith("detail-cuff") and np.median(ring) < 110 and warm > 4)) and np.median(ann) - np.median(ring) > 18 and (L[max(cy - r // 2, 0) : cy + r // 2, max(cx - r // 2, 0) : cx + r // 2] < 95).mean() > 0.7 and L[max(cy - r // 2, 0) : cy + r // 2, max(cx - r // 2, 0) : cx + r // 2].std() > 9 and cy > 0.12 * h and cx > 0.04 * WIDTH and cx < 0.96 * WIDTH)):
                    cv2.circle(btn, (cx, cy), max(r - 1, 3), 1, -1)
    if asset.startswith("detail-cuff"):
        # Sleeve close-ups: horn buttons are the only warm-brown things on the neutral grey cloth.
        warmth = R - B
        cand = ((warmth > 9) & (L < 150) & fg).astype(np.uint8)
        cand = cv2.morphologyEx(cand, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        cand = cv2.morphologyEx(cand, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
        n_, lab_, st_, _ = cv2.connectedComponentsWithStats(cand)
        btn = np.zeros(L.shape, np.uint8)
        for k in range(1, n_):
            x_, y_, w_, h_, a_ = st_[k]
            if 120 < a_ < 40000 and max(w_, h_) < 420:
                comp = (lab_ == k).astype(np.uint8)
                cnts, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                cv2.drawContours(btn, [cv2.convexHull(c) for c in cnts], -1, 1, -1)
        btn = cv2.dilate(btn, np.ones((3, 3), np.uint8))
    # Tight discs: the cloth is dyed underneath, the photographed button is laid back on top.
    mbtn = cv2.GaussianBlur(btn.astype(np.float32), (0, 0), 0.7) * alpha
    # Shirt (three-piece / no-jacket shots): flood-fill from bright neutral seeds
    # through smooth shading, stopping at the sharp edges where the cloth begins.
    sat = a.max(axis=2) - a.min(axis=2)
    seeds = (L > 222) & (sat < 22) & fg & (not close)
    seeds = cv2.morphologyEx(seeds.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    shirt_m = np.zeros(L.shape, np.uint8)
    if seeds.sum() > 400:
        Lb = cv2.GaussianBlur(L.astype(np.float32), (0, 0), 1.2)
        img8 = np.clip(Lb, 0, 255).astype(np.uint8)
        ff = np.zeros((L.shape[0] + 2, L.shape[1] + 2), np.uint8)
        ys, xs = np.nonzero(seeds)
        for y, x in zip(ys[::41], xs[::41]):
            if ff[y + 1, x + 1] == 0:
                cv2.floodFill(img8, ff, (int(x), int(y)), 0, loDiff=3, upDiff=3, flags=4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8))
        shirt_m = (ff[1:-1, 1:-1] > 0).astype(np.uint8)
        shirt_m &= ((sat < (42 if close else 26)) & (L > (175 if close else (120 if asset.startswith("nojacket") else max(120, float(np.median(L[fg])) + 38))))).astype(np.uint8)
        # keep only components that contain a seed (drop leaks into grey cloth)
        n, lab = cv2.connectedComponents(shirt_m)
        keep = np.zeros(n, bool)
        keep[np.unique(lab[seeds > 0])] = True
        keep[0] = False
        shirt_m = keep[lab].astype(np.uint8)
        shirt_m = cv2.morphologyEx(shirt_m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    if asset.startswith(("nojacket", "front-")):
        # the shirt never reaches the folded trousers
        rows_ = (alpha > 0.5).sum(axis=1)
        lo_ = int(h * 0.45)
        gap = np.where(rows_[lo_:] < 3)[0]
        if len(gap):
            shirt_m[lo_ + gap[0] :] = 0
    # Grow the shirt a little so no dyed fringe is left on its edge.
    shirt_m = cv2.dilate(shirt_m, np.ones((7, 7), np.uint8))
    shirt = cv2.GaussianBlur(shirt_m.astype(np.float32), (0, 0), 0.8) * alpha
    cloth = np.clip(alpha - lining - shirt, 0, 1)

    if asset.startswith("detail-break"):
        # the black shoe is not cloth
        dark = ((L < 32) & fg).astype(np.uint8)
        dark[: int(h * 0.55)] = 0
        n_, lab_, st_, _ = cv2.connectedComponentsWithStats(dark)
        hull = np.zeros_like(dark)
        for k in range(1, n_):
            if st_[k, 4] > 2500:
                pts = np.column_stack(np.nonzero(lab_ == k))[:, ::-1].astype(np.int32)
                cv2.fillConvexPoly(hull, cv2.convexHull(pts), 1)
        # keep the trouser cloth that dips into the hull (lighter, mid-grey)
        dark = (hull.astype(bool) & ~((L > 90) & (L < 200) & (sat < 14) & (np.arange(h)[:, None] < np.argmax(dark.any(axis=1)) + 30))).astype(np.uint8)
        shoe = cv2.GaussianBlur(dark.astype(np.float32), (0, 0), 1.5)
        cloth = np.clip(cloth - shoe * 1.5, 0, 1)

    # Shade: cloth luminance with the grey weave smoothed out, highlights not
    # inflated near the outline (the matte edge can catch the backdrop).
    Lf = np.where(fg, L, np.median(L[fg])).astype(np.float32)
    Ls = cv2.bilateralFilter(Lf, 7, 16, 4)
    ref = float(np.median(Ls[(cloth > 0.9)]))
    shade = Ls / ref
    dist = cv2.distanceTransform(fg.astype(np.uint8), cv2.DIST_L2, 5)
    k = np.clip(dist / 6, 0, 1)
    shade = np.where(shade > 1, 1 + (shade - 1) * k, shade)
    if asset == "wc-back-lining":
        # the satin back panel takes the lining colour
        band = np.zeros_like(cloth); band[:, int(WIDTH * 0.25) : int(WIDTH * 0.75)] = 1
        band = cv2.GaussianBlur(band, (0, 0), 6)
        lining = np.maximum(lining, cloth * band); cloth = np.clip(cloth - lining, 0, 1)
    # Lining shade from its own luminance (satin sheen).
    lref = float(np.median(L[lining > 0.8])) if (lining > 0.8).sum() > 50 else 100.0
    lshade = np.clip(cv2.GaussianBlur(L, (0, 0), 1.0) / lref, 0, 2.5)
    shade_img = np.where(lining > 0.5, lshade, shade)

    d = OUT / asset
    d.mkdir(parents=True, exist_ok=True)
    rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(d / "base.webp", quality=90, method=6)
    Image.fromarray(np.clip(shade_img * 128, 0, 255).astype(np.uint8), "L").save(d / "shade.webp", quality=92, method=6)
    m = np.dstack([cloth, lining, mbtn]) * 255
    Image.fromarray(m.astype(np.uint8), "RGB").save(d / "mask.png", optimize=True)
    meta = {"width": WIDTH, "height": h}
    n, lab, st, cen = cv2.connectedComponentsWithStats((btn > 0).astype(np.uint8))
    meta["buttons"] = [[int(c[0]), int(c[1]), int(max(s[2], s[3]) // 2)] for c, s in zip(cen[1:], st[1:]) if s[4] > 20]
    # Where the jacket ends and the folded trousers begin (an empty band of rows
    # in the lower half): the browser dyes rows below it in the trouser cloth.
    rows = (alpha > 0.5).sum(axis=1) if asset.startswith(("front-", "back-", "nojacket")) else np.zeros(h)
    lo = int(h * 0.45)
    empty = np.where(rows[lo:] < 3)[0]
    if len(empty):
        runs = np.split(empty, np.where(np.diff(empty) != 1)[0] + 1)
        runs = [r for r in runs if len(r) >= 4 and lo + r[-1] < h - 20 and rows[lo + r[-1] + 1 :].sum() > 1000]
        if runs:
            meta["split"] = int(lo + runs[0][len(runs[0]) // 2])
    return meta


def main():
    only = sys.argv[1:]
    assets = sorted(p.stem for p in SRC.glob("*.jpg") if not only or p.stem in only)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"assets": {}}
    manifest.setdefault("assets", {})
    for a in assets:
        manifest["assets"][a] = build(a)
        print(a, manifest["assets"][a])
    manifest["tilePx"] = 180
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
