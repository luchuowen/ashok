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
    dark = ((L < 70) & fg).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(dark, 8)
    btn = np.zeros(L.shape, bool)
    for i in range(1, n):
        x, y, bw, bh, ar = st[i]
        if 40 < ar < 3500 and 0.55 < bw / max(bh, 1) < 1.8 and ar > 0.45 * bw * bh:
            btn |= lab == i
    btn = cv2.dilate(btn.astype(np.uint8), np.ones((3, 3), np.uint8))
    mbtn = cv2.GaussianBlur(btn.astype(np.float32), (0, 0), 0.8) * alpha
    cloth = np.clip(alpha - lining - mbtn, 0, 1)

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
    return {"width": WIDTH, "height": h}


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
