#!/usr/bin/env python3
"""
Build the on-model preview layers from the neutral-grey studio photos in
design/model-src/ -> public/model/<pose>/ + lib/suit/model-poses.json.

Each source photo shows the same model and pose wearing a plain light-grey suit,
white shirt and an emerald-green tie on a white background. For every pose we
write:

  base.jpg   the photo (cropped), used as-is for shirt, skin, shoes, background
  shade.jpg  smoothed luminance normalised per region (128 = region median), so
             the browser can re-dye cloth/skin/tie while keeping folds + light
  mask.png   R = jacket, G = trousers, B = waistcoat   (soft 0-255)
  mask2.png  R = skin,   G = tie,      B = studio background (made transparent)

The browser (components/suit/ModelPreview.tsx) multiplies the chosen fabric
texture by the shade inside the masks. Re-run after adding or replacing a photo:

    python3 scripts/build-model-poses.py
"""
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "model-src"
OUT = ROOT / "public" / "model"
MANIFEST = ROOT / "lib" / "suit" / "model-poses.json"
CROP_TOP = 30  # hide the chin

# Trousers are the suit pixels below this polyline (x, y in source pixels); it rises
# into the gap between the jacket fronts where the trousers show through.
HEM_SB2 = [(0, 818), (385, 818), (400, 780), (425, 690), (446, 605), (456, 605), (470, 690), (495, 780), (520, 818), (896, 818)]
POSES = {
    "front-sb2-notch": {"hem": HEM_SB2},
    "front-notie": {"hem": HEM_SB2},
    "front-bowtie": {"hem": HEM_SB2},
    "front-sb1-shawl": {"hem": [(0, 812), (390, 812), (410, 760), (432, 670), (446, 600), (456, 600), (470, 670), (492, 760), (512, 812), (896, 812)]},
    "front-db6-peak": {"hem": [(0, 806), (896, 806)]},
    "front-threepiece": {
        "hem": [(0, 815), (335, 812), (352, 760), (360, 705), (452, 712), (528, 700), (540, 760), (560, 812), (896, 815)],
        "waistcoat": [(385, 262), (515, 262), (528, 320), (528, 700), (452, 712), (358, 700), (362, 320)],
    },
    "front-threepiece-notie": {
        "hem": [(0, 815), (300, 812), (330, 760), (352, 705), (445, 692), (498, 700), (520, 760), (545, 812), (896, 815)],
        "waistcoat": [(385, 240), (470, 240), (495, 300), (495, 700), (445, 692), (355, 700), (352, 300)],
    },
    "front-db6-peak-notie": {"hem": [(0, 806), (896, 806)]},
    "front-sb1-shawl-notie": {"hem": [(0, 812), (390, 812), (410, 760), (432, 670), (446, 600), (456, 600), (470, 670), (492, 760), (512, 812), (896, 812)]},
    "front-waistcoat": {
        "hem": [(0, 680), (330, 672), (445, 705), (565, 672), (896, 680)],
        "allWaistcoat": True,
        # shirt sleeves have grey fold shadows: only the waistcoat torso and the legs are cloth
        "clothOnly": [[(290, 40), (634, 40), (634, 760), (290, 760)], [(0, 640), (896, 640), (896, 1776), (0, 1776)]],
        "opaque": [(215, 0), (690, 0), (700, 790), (210, 790)],  # white sleeves are backdrop-bright: never key them
    },
    "front-mandarin": {"hem": [(0, 822), (400, 822), (425, 770), (445, 705), (455, 705), (470, 770), (495, 822), (896, 822)]},
    "front-nojacket": {"hem": [(0, 0), (896, 0)], "clothOnly": [[(0, 515), (896, 515), (896, 1776), (0, 1776)]], "opaque": [(215, 0), (690, 0), (700, 790), (210, 790)]},
    "back": {"hem": [(0, 802), (896, 802)]},
}


def below_polyline(h, w, pts):
    xs = np.array([p[0] for p in pts], float)
    ys = np.array([p[1] for p in pts], float)
    hem = np.interp(np.arange(w), xs, ys)
    return np.arange(h)[:, None] >= hem[None, :]


def build(name, cfg):
    a = np.asarray(Image.open(SRC / f"{name}.jpg").convert("RGB")).astype(np.float32)
    h, w, _ = a.shape
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    L = 0.299 * R + 0.587 * G + 0.114 * B
    sat = a.max(-1) - a.min(-1)

    tie = (G > R + 18) & (G > B + 4)
    skin = (R > G + 6) & (G >= B - 4) & (R - B > 22) & (L < 215)
    Lm = cv2.medianBlur(L.astype(np.uint8), 9).astype(np.float32)
    suit = ((sat < 22) & (Lm < 214) & (Lm > 55) & ~tie & ~skin).astype(np.uint8)
    suit = cv2.morphologyEx(suit, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(suit, 8)
    keep = np.zeros_like(suit)
    for i in range(1, n):
        if st[i, 4] > 4000:
            keep[lab == i] = 1
    # Floor shadow round the shoes reads as grey cloth: cut below the shoe tops.
    dark = (L < 45).astype(np.uint8)
    dark[: int(h * 0.8)] = 0
    ys = np.where(dark.any(1))[0]
    if len(ys):
        keep[ys.min() + 10 :] = 0
    suit = keep.astype(bool)
    if "clothOnly" in cfg:
        zone = np.zeros((h, w), np.uint8)
        for poly in cfg["clothOnly"]:
            cv2.fillPoly(zone, [np.array(poly, np.int32)], 1)
        suit &= zone.astype(bool)
    # Grow skin into highlights/nails the colour test misses (but not onto cloth or the white shirt/background).
    skin = cv2.dilate(skin.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool) & ~suit & ~tie & (L < 232)

    # Background: flood from the corners through the smooth studio backdrop, so the
    # page behind shows through (the stage is not the photo's exact grey).
    bg8 = cv2.GaussianBlur(a, (0, 0), 1.0).astype(np.uint8)
    ff = np.zeros((h + 2, w + 2), np.uint8)
    for seed in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 2)):
        cv2.floodFill(bg8, ff, seed, (0, 0, 0), (2, 2, 2), (2, 2, 2), cv2.FLOODFILL_MASK_ONLY | (255 << 8) | 8)
    bg = ff[1:-1, 1:-1] > 0
    bg = cv2.morphologyEx(bg.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool) & ~suit & ~skin
    if "opaque" in cfg:
        keep_out = np.zeros((h, w), np.uint8)
        cv2.fillPoly(keep_out, [np.array(cfg["opaque"], np.int32)], 1)
        bg &= ~keep_out.astype(bool)
    bg[: int(h * 0.52), w // 2 - 70 : w // 2 + 70] = False  # no backdrop inside the torso (small leaks at the waist)
    tie = cv2.dilate(tie.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & ~suit & ~skin

    trousers = suit & below_polyline(h, w, cfg["hem"])
    waist = np.zeros_like(suit)
    if cfg.get("allWaistcoat"):
        waist = suit & ~trousers
    elif "waistcoat" in cfg:
        poly = np.zeros((h, w), np.uint8)
        cv2.fillPoly(poly, [np.array(cfg["waistcoat"], np.int32)], 1)
        waist = suit & ~trousers & poly.astype(bool)
    jacket = suit & ~trousers & ~waist

    def soft(m, r=1.2):
        return np.clip(cv2.GaussianBlur(m.astype(np.float32), (0, 0), r) * 255, 0, 255)

    # Shade: remove the grey cloth's own weave (edge-preserving), keep folds.
    Ls = cv2.bilateralFilter(L.astype(np.float32), 9, 18, 6)
    Ls = cv2.GaussianBlur(Ls, (0, 0), 0.8)
    shade = np.full((h, w), 128.0, np.float32)
    refs = {}
    for key, m in (("suit", suit), ("skin", skin), ("tie", tie)):
        if m.sum() < 50:
            continue
        ref = float(np.median(Ls[m]))
        refs[key] = round(ref, 1)
        grown = cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
        shade[grown] = np.clip(128 * Ls[grown] / ref, 0, 255)
    skin_rgb = [int(round(float(np.median(a[..., c][skin])))) for c in range(3)] if skin.sum() > 50 else [150, 100, 70]

    c = slice(CROP_TOP, None)
    d = OUT / name
    d.mkdir(parents=True, exist_ok=True)
    Image.fromarray(a[c].astype(np.uint8)).save(d / "base.jpg", quality=88, optimize=True, progressive=True)
    Image.fromarray(shade[c].astype(np.uint8), "L").save(d / "shade.jpg", quality=92, optimize=True)
    # Parts share one soft outline (suit grown by a pixel so the dye covers the
    # anti-aliased edge); the split between parts is feathered but always sums
    # to the outline, so no grey seam shows between jacket, waistcoat and trousers.
    total = soft(cv2.dilate(suit.astype(np.uint8), np.ones((3, 3), np.uint8)), 1.0)
    parts = np.stack([cv2.GaussianBlur(m.astype(np.float32), (0, 0), 2.0) for m in (jacket, trousers, waist)], -1)
    parts = parts / np.maximum(parts.sum(-1, keepdims=True), 1e-4)
    m1 = (parts * total[..., None])[c].astype(np.uint8)
    m2 = np.stack([soft(skin, 0.8), soft(tie, 0.8), soft(bg, 0.9)], -1)[c].astype(np.uint8)
    Image.fromarray(m1).save(d / "mask.png", optimize=True)
    Image.fromarray(m2).save(d / "mask2.png", optimize=True)
    return {"width": w, "height": h - CROP_TOP, "refs": refs, "skin": skin_rgb, "hasTie": bool(tie.sum() > 50), "hasWaistcoat": bool(waist.sum() > 50)}


def main():
    manifest = {"tilePx": 150, "poses": {}}
    for name, cfg in POSES.items():
        manifest["poses"][name] = build(name, cfg)
        print(name, manifest["poses"][name])
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
