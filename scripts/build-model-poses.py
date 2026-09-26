#!/usr/bin/env python3
"""
Build the on-model preview layers from the colour-coded studio photos in
design/model-src/ -> public/model/<pose>/ + lib/suit/model-poses.json.

The source photos (Nano Banana Pro, prompts in design/nano-banana/prompts.json,
key "onModel") show one model and pose per file with the garments colour-coded so
every part can be separated cleanly by hue:

  jacket   medium blue    (#4A6FA5)
  trousers medium green   (#4F8A55)
  waistcoat medium purple (#7B5AA6)
  tie      magenta        (#D0208F)

Only the luminance of those regions is used (the browser multiplies the chosen
cloth texture by it), so the coding colours never reach the page. For every pose:

  base.jpg   the photo with every coded region neutralised to grey, so the soft
             mask edges can never show a blue/green/purple fringe
  shade.jpg  smoothed luminance normalised per region (128 = region median)
  mask.png   R = jacket, G = trousers, B = waistcoat   (soft 0-255)
  mask2.png  R = skin,   G = tie,      B = studio background (made transparent)

    python3 scripts/build-model-poses.py [pose ...]
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "model-src"
OUT = ROOT / "public" / "model"
MANIFEST = ROOT / "lib" / "suit" / "model-poses.json"
WIDTH = 1536  # delivered width = the 2K source width (no upscaling, no detail lost)
CROP_TOP = 0.045  # fraction of the source height cut from the top (the face)

POSES = [
    "front-sb2-notch", "front-notie", "front-bowtie", "front-sb1-shawl", "front-sb1-shawl-notie",
    "front-db6-peak", "front-db6-peak-notie", "front-threepiece", "front-threepiece-notie",
    "front-waistcoat", "front-mandarin", "front-nojacket", "back",
]

# OpenCV hue is 0-179. Centres of the coding colours.
HUES = {"jacket": 108, "trousers": 63, "waistcoat": 134, "tie": 162}


def person_matte(im: Image.Image) -> np.ndarray:
    from rembg import new_session, remove

    global _S
    try:
        _S
    except NameError:
        _S = new_session("isnet-general-use")
    return np.asarray(remove(im, session=_S, only_mask=True)).astype(np.float32) / 255.0


# Large-scale light on the model (bright thighs, darker jacket sides) is what makes one cloth read
# as two tones, so it is evened out: the broad light field of each garment is pulled 60% of the
# way to flat and every garment is centred on the same level. Folds, creases and seams (the
# fine-scale shading) are kept exactly.
FLATTEN = 0.75
LIGHT_SIGMA = 24 * WIDTH / 1200
TONE = {"jacket": 1.0, "trousers": 0.95, "waistcoat": 0.98}


def even_light(shade, m, grown, gain):
    mf = m.astype(np.float32)
    num = cv2.GaussianBlur(shade * mf, (0, 0), LIGHT_SIGMA)
    den = cv2.GaussianBlur(mf, (0, 0), LIGHT_SIGMA)
    low = num / np.maximum(den, 1e-3)
    high = shade / np.maximum(low, 1.0)
    centre = float(np.median(low[m]))
    low2 = centre + (1 - FLATTEN) * (low - centre)
    out = low2 * high
    out = out * (128.0 * gain / float(np.median(out[m])))
    return np.clip(out[grown], 0, 255)


def hue_dist(h, c):
    d = np.abs(h.astype(np.int16) - c)
    return np.minimum(d, 180 - d)


def clean(m, open_=3, min_area=1500):
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((open_, open_), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros(n, bool)
    keep[1:] = st[1:, 4] >= min_area
    m = keep[lab].astype(np.uint8)
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)).astype(bool)


def build(name):
    im = Image.open(SRC / f"{name}.jpg").convert("RGB")
    im = im.crop((0, int(im.height * CROP_TOP), im.width, im.height))  # face out of frame, chin at the top edge
    h = round(im.height * WIDTH / im.width)
    im = im.resize((WIDTH, h), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    hsv = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2HSV)
    H, S, V = hsv[..., 0], hsv[..., 1].astype(np.float32), hsv[..., 2].astype(np.float32)
    L = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]

    fg = person_matte(im)
    # The matte sometimes drops the neck/chin at the cropped top edge; the studio
    # backdrop is a pale neutral, so anything warm and saturated is the person.
    R0, G0, B0 = a[..., 0], a[..., 1], a[..., 2]
    warm0 = (R0 > B0 + 12) & (R0 >= G0) & (S > 30) & (L > 12)
    warm0 = cv2.morphologyEx(warm0.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    fg = np.maximum(fg, cv2.GaussianBlur(warm0.astype(np.float32), (0, 0), 0.8))
    fgb = fg > 0.5

    coded = (S > 38) & (V > 25) & fgb
    parts = {}
    for k, c in HUES.items():
        tol = 14 if k != "tie" else 12
        parts[k] = clean(coded & (hue_dist(H, c) < tol), min_area=300 if k == "tie" else 1500)
    # Deep folds lose saturation: grow each cloth part into adjacent dark, low-sat pixels
    # (never into the white shirt, black shoes are handled by the floor cut below).
    for k in ("jacket", "trousers", "waistcoat"):
        m = parts[k]
        if not m.any():
            continue
        others = np.any([parts[o] for o in parts if o != k], axis=0)
        for _ in range(3):
            ring = cv2.dilate(m.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool) & ~m
            m = m | (ring & fgb & (L < 150) & (L > 12) & ~others & ~warm0)
        parts[k] = m
    # Shadowed cloth edges (beside the hands, under the jacket hem) keep a faint coding hue at low
    # saturation: claim them for the neighbouring part so no green/blue sliver is left behind.
    for k in ("jacket", "trousers", "waistcoat"):
        if not parts[k].any():
            continue
        others = np.any([parts[o] for o in parts if o != k], axis=0)
        near_k = cv2.dilate(parts[k].astype(np.uint8), np.ones((21, 21), np.uint8)).astype(bool)
        loose = fgb & near_k & (hue_dist(H, HUES[k]) < 20) & (S > 10) & (V > 8) & (L < 140) & ~others
        parts[k] = parts[k] | loose
    # Shoes: the dark blob at the bottom is never trousers.
    shoes = (L < 50) & fgb
    shoes[: int(h * 0.82)] = False
    shoes = clean(shoes, 3, 4000)  # only the big shoe blobs, never deep fold shadows
    shoes = cv2.dilate(shoes.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    parts["trousers"] &= ~shoes

    cloth = parts["jacket"] | parts["trousers"] | parts["waistcoat"]
    tie = parts["tie"]
    # Skin: warm, foreground, not cloth/tie/white shirt/black shoes.
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    skin = fgb & ~cloth & ~tie & (R > B + 12) & (R >= G) & (L > 5) & (L < 225) & (S > 30)
    skin = clean(skin, 3, 400)
    # Close small gaps (deep shadow under the chin, lips at the top edge) and pad the top edge
    # so a hole touching the crop line is filled too.
    pad = 30
    sk = cv2.copyMakeBorder(skin.astype(np.uint8), pad, 0, 0, 0, cv2.BORDER_CONSTANT, value=1)
    sk = cv2.morphologyEx(sk, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))[pad:]
    Hh = H.astype(np.int16)
    coded_cast = (Hh > 30) & (Hh < 172) & (S > 12)  # green/blue/purple bounce light: never skin
    skin = sk.astype(bool) & ~cloth & ~tie & (L < 200) & ~coded_cast
    skin = cv2.dilate(skin.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~cloth & ~tie
    fg = np.maximum(fg, skin.astype(np.float32))
    # White shirt collar against the pale backdrop: anything enclosed by the person is the person.
    body = cv2.copyMakeBorder((fg > 0.5).astype(np.uint8), pad, 0, 0, 0, cv2.BORDER_CONSTANT, value=0)
    body[:pad, :] = body[pad : pad + 1, :]  # extend the top row so the collar is enclosed
    body = cv2.morphologyEx(body, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))[pad:]
    body[int(h * 0.14) :] = 0  # collar area only: never bridge the arm/torso or leg gaps
    fg = np.maximum(fg, cv2.GaussianBlur(cv2.erode(body, np.ones((3, 3), np.uint8)).astype(np.float32), (0, 0), 0.8))

    # Shade: remove the weave, keep folds; normalise per region.
    Ls = cv2.bilateralFilter(L.astype(np.float32), 9, 18, 6)
    Ls = cv2.GaussianBlur(Ls, (0, 0), 0.8)
    shade = np.full((h, w := WIDTH), 128.0, np.float32)
    cloth_all = cv2.dilate((parts["jacket"] | parts["trousers"] | parts["waistcoat"]).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    refs = {}
    for key, m in (("jacket", parts["jacket"]), ("trousers", parts["trousers"]), ("waistcoat", parts["waistcoat"]), ("skin", skin), ("tie", tie)):
        if m.sum() < 50:
            continue
        # Cloth is normalised by its mean so one fabric reads as one tone across jacket, trousers
        # and waistcoat (median left the trousers ~3% brighter and their broad lit thighs read far
        # lighter); trousers and the waistcoat under the jacket sit a touch darker, as in a real
        # photo of a single-cloth suit.
        cloth_part = key in ("jacket", "trousers", "waistcoat")
        ref = float(np.mean(Ls[m])) if cloth_part else float(np.median(Ls[m]))
        refs[key] = round(ref, 1)
        grown = cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
        if not cloth_part:
            # skin / tie: never spill onto neighbouring cloth or the white shirt
            grown = grown & ~cloth_all & (Ls < ref * 1.4)
        shade[grown] = np.clip(128.0 * Ls[grown] / ref, 0, 255)
        if cloth_part:
            shade[grown] = even_light(shade, m, grown, TONE[key])
        # Anti-aliased rim (over the backdrop or the white shirt): continue the cloth's own shading
        # outward instead of reading the bright neighbour, so edges never show a light/dark fringe.
        # The outermost cloth pixels are anti-aliased with the shirt/backdrop (too bright), so the
        # shading is taken from 2 px inside and continued outward.
        core = cv2.erode(m.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) if cloth_part else m
        edge = grown & ~core
        if edge.any() and core.any():
            num = cv2.GaussianBlur(np.where(core, shade, 0).astype(np.float32), (0, 0), 2.0)
            den = cv2.GaussianBlur(core.astype(np.float32), (0, 0), 2.0)
            ext = num / np.maximum(den, 1e-3)
            shade[edge] = np.minimum(ext[edge], float(np.median(shade[core])) * 1.08)
    skin_rgb = [int(round(float(np.median(a[..., c][skin])))) for c in range(3)] if skin.sum() > 50 else [150, 100, 70]

    # Neutralise the coding colours in the base photo (and a few pixels around them).
    warm = (R > B + 8) & (R >= G - 4) & ~cloth & ~tie  # chin, neck, hands: never greyed
    zone = cv2.dilate((cloth | tie).astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool) & ~skin & ~warm
    grey = np.repeat(L[..., None], 3, -1)
    base = np.where(zone[..., None], grey, a)
    # Safety net: any remaining coding-coloured pixel on the person (bounce light at the hands,
    # shadow slivers) is neutralised to grey so no blue/green/purple can ever reach the page.
    cast = fgb & coded_cast & ~cloth & ~tie & ~skin
    base = np.where(cast[..., None], grey, base)

    def soft(m, r=1.0):
        return np.clip(cv2.GaussianBlur(m.astype(np.float32), (0, 0), r) * 255, 0, 255)

    # Parts share one soft outline (grown a pixel so the dye covers anti-aliased
    # edges); the split between parts always sums to that outline -> no seams.
    total = soft(cv2.dilate(cloth.astype(np.uint8), np.ones((3, 3), np.uint8)), 0.9)
    stack = np.stack([cv2.GaussianBlur(parts[k].astype(np.float32), (0, 0), 1.2) for k in ("jacket", "trousers", "waistcoat")], -1)
    stack = stack / np.maximum(stack.sum(-1, keepdims=True), 1e-4)
    m1 = (stack * total[..., None]).astype(np.uint8)
    bg = np.clip(1 - fg, 0, 1)
    m2 = np.stack([soft(skin, 0.8), soft(tie, 0.7), bg * 255], -1).astype(np.uint8)

    d = OUT / name
    d.mkdir(parents=True, exist_ok=True)
    Image.fromarray(base.clip(0, 255).astype(np.uint8)).save(d / "base.jpg", quality=90, optimize=True, progressive=True)
    Image.fromarray(shade.astype(np.uint8), "L").save(d / "shade.jpg", quality=92, optimize=True)
    Image.fromarray(m1).save(d / "mask.png", optimize=True)
    Image.fromarray(m2).save(d / "mask2.png", optimize=True)
    return {
        "width": WIDTH,
        "height": h,
        "refs": refs,
        "skin": skin_rgb,
        "hasTie": bool(tie.sum() > 200),
        "hasWaistcoat": bool(parts["waistcoat"].sum() > 200),
    }


def main():
    only = sys.argv[1:]
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"poses": {}}
    manifest["tilePx"] = round(150 * WIDTH / 1200)  # same cloth scale as the 1200-px originals
    for name in POSES:
        if only and name not in only:
            continue
        if not (SRC / f"{name}.jpg").exists():
            print("missing", name)
            continue
        manifest["poses"][name] = build(name)
        print(name, manifest["poses"][name])
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
