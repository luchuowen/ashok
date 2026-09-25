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
    circles = cv2.HoughCircles(blur, cv2.HOUGH_GRADIENT, dp=1.2, minDist=14, param1=70, param2=13, minRadius=4, maxRadius=16)
    if circles is not None:
        for cx, cy, r in np.round(circles[0]).astype(int):
            if 0 <= cy < L.shape[0] and 0 <= cx < L.shape[1] and fg[cy, cx]:
                ring = L[max(cy - r, 0) : cy + r, max(cx - r, 0) : cx + r]
                disc = a[max(cy - r + 2, 0) : cy + r - 1, max(cx - r + 2, 0) : cx + r - 1]
                warm = float(np.median(disc[..., 0] - disc[..., 2])) if disc.size else 0
                if ring.size and np.median(ring) < 90 and lining[cy, cx] < 0.2 and (warm > 5 or np.median(ring) < 40):
                    cv2.circle(btn, (cx, cy), r + 1, 1, -1)
    btn = cv2.dilate(btn.astype(np.uint8), np.ones((3, 3), np.uint8))
    mbtn = cv2.GaussianBlur(btn.astype(np.float32), (0, 0), 0.8) * alpha
    # Shirt (three-piece / no-jacket shots): flood-fill from bright neutral seeds
    # through smooth shading, stopping at the sharp edges where the cloth begins.
    sat = a.max(axis=2) - a.min(axis=2)
    seeds = (L > 212) & (sat < 16) & fg
    seeds = cv2.morphologyEx(seeds.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    shirt_m = np.zeros(L.shape, np.uint8)
    if seeds.sum() > 400:
        Lb = cv2.GaussianBlur(L.astype(np.float32), (0, 0), 1.2)
        img8 = np.clip(Lb, 0, 255).astype(np.uint8)
        ff = np.zeros((L.shape[0] + 2, L.shape[1] + 2), np.uint8)
        ys, xs = np.nonzero(seeds)
        for y, x in zip(ys[::97], xs[::97]):
            if ff[y + 1, x + 1] == 0:
                cv2.floodFill(img8, ff, (int(x), int(y)), 0, loDiff=3, upDiff=3, flags=4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8))
        shirt_m = (ff[1:-1, 1:-1] > 0).astype(np.uint8)
        shirt_m &= ((sat < 26) & (L > 120)).astype(np.uint8)
        # keep only components that contain a seed (drop leaks into grey cloth)
        n, lab = cv2.connectedComponents(shirt_m)
        keep = np.zeros(n, bool)
        keep[np.unique(lab[seeds > 0])] = True
        keep[0] = False
        shirt_m = keep[lab].astype(np.uint8)
        shirt_m = cv2.morphologyEx(shirt_m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    shirt = cv2.GaussianBlur(shirt_m.astype(np.float32), (0, 0), 0.8) * alpha
    cloth = np.clip(alpha - lining - mbtn - shirt, 0, 1)

    # Shade: cloth luminance with the grey weave smoothed out, highlights not
    # inflated near the outline (the matte edge can catch the backdrop).
    Lf = np.where(fg, L, np.median(L[fg])).astype(np.float32)
    Ls = cv2.bilateralFilter(Lf, 7, 16, 4)
    ref = float(np.median(Ls[(cloth > 0.9)]))
    shade = Ls / ref
    dist = cv2.distanceTransform(fg.astype(np.uint8), cv2.DIST_L2, 5)
    k = np.clip(dist / 6, 0, 1)
    shade = np.where(shade > 1, 1 + (shade - 1) * k, shade)
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
    # Where the jacket ends and the folded trousers begin (an empty band of rows
    # in the lower half): the browser dyes rows below it in the trouser cloth.
    rows = (alpha > 0.5).sum(axis=1)
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
