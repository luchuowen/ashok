#!/usr/bin/env python3
"""
Nano Banana Pro fabric photos -> swatch images (and, with --textures, seamless dye textures
from flat top-down macro shots).

  design/nano-banana/fabrics/<fabric-id>.jpg   top-down macro, ~10 cm of cloth, 1:1
  -> public/photos/fabrics/<fabric-id>.jpg     1200 px swatch for the fabric cards
  -> public/textures/fabrics/<fabric-id>.jpg   512 px seamless tile (10 cm of cloth)
  -> lib/suit/texture-scale.json               tile size in stage pixels per texture

The stage photos are ~11 px per cm, so a 10 cm tile is drawn at 110 px.

    python3 scripts/fabric-photos-to-textures.py [fabric-id ...]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "nano-banana" / "fabrics"
SWATCH = ROOT / "public" / "photos" / "fabrics"
TEX = ROOT / "public" / "textures" / "fabrics"
SCALE = ROOT / "lib" / "suit" / "texture-scale.json"
N = 512
TILE_PX = 110


def seamless(a: np.ndarray) -> np.ndarray:
    """Blend the image with a half-rolled copy so opposite edges meet."""
    h, w = a.shape[:2]
    r = np.roll(np.roll(a, h // 2, 0), w // 2, 1)
    y = np.minimum(np.arange(h), h - 1 - np.arange(h)) / (h / 2)
    x = np.minimum(np.arange(w), w - 1 - np.arange(w)) / (w / 2)
    k = np.clip(np.minimum.outer(y, x) / 0.18, 0, 1)[..., None]  # 0 at edges -> rolled copy
    return a * k + r * (1 - k)


def flatten(a: np.ndarray) -> np.ndarray:
    """Remove slow lighting falloff so the tile has no visible repeat."""
    from scipy.ndimage import gaussian_filter

    lum = a.mean(axis=2, keepdims=True)
    low = gaussian_filter(lum, sigma=(a.shape[0] / 6, a.shape[1] / 6, 0))
    return np.clip(a * (lum.mean() / np.maximum(low, 1)), 0, 255)


def main():
    textures = "--textures" in sys.argv  # only for flat top-down macro shots
    only = set(a for a in sys.argv[1:] if not a.startswith("--"))
    scale = json.loads(SCALE.read_text()) if SCALE.exists() else {}
    for p in sorted(SRC.glob("*.jpg")):
        fid = p.stem
        if only and fid not in only:
            continue
        im = Image.open(p).convert("RGB")
        s = min(im.size)
        im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2))
        im.resize((1200, 1200), Image.LANCZOS).save(SWATCH / f"{fid}.jpg", quality=88, optimize=True, progressive=True)
        print(fid)
        if not textures:
            continue
        a = np.asarray(im.resize((N, N), Image.LANCZOS)).astype(np.float32)
        t = seamless(flatten(a))
        Image.fromarray(t.clip(0, 255).astype(np.uint8)).save(TEX / f"{fid}.jpg", quality=92)
        scale[fid] = TILE_PX
    SCALE.write_text(json.dumps(scale, indent=2, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
