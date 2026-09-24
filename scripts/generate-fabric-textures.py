#!/usr/bin/env python3
"""
Generate seamless, photo-like cloth textures for every fabric in
lib/suit/catalogue.ts -> public/textures/fabrics/<id>.jpg (512x512 tiles).

The suit preview fills garments with these tiles and adds lighting on top, so
a new cloth only needs its catalogue entry + one run of this script:

    python3 scripts/generate-fabric-textures.py

Every structure is built from periodic functions / FFT-filtered noise, so the
tiles repeat without seams.
"""
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CATALOGUE = ROOT / "lib" / "suit" / "catalogue.ts"
OUT = ROOT / "public" / "textures" / "fabrics"
N = 512


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255.0


def periodic_noise(seed, sx, sy, n=N):
    """FFT band-limited noise; sx/sy = feature size in px along x/y (anisotropic). Wraps seamlessly."""
    rng = np.random.default_rng(seed)
    white = rng.standard_normal((n, n))
    fy = np.fft.fftfreq(n)[:, None]
    fx = np.fft.fftfreq(n)[None, :]
    filt = np.exp(-((fx * sx) ** 2 + (fy * sy) ** 2) * 8)
    out = np.real(np.fft.ifft2(np.fft.fft2(white) * filt))
    out -= out.mean()
    out /= out.std() + 1e-9
    return out


def grid():
    y, x = np.mgrid[0:N, 0:N].astype(np.float64)
    return x, y


def wave(v, period):
    return np.sin(2 * np.pi * v / period)


def stripe(v, period, width, soft=0.6):
    """1 on thin lines every `period` px (period must divide N for seamlessness)."""
    d = np.abs(((v + period / 2) % period) - period / 2)
    return np.clip(1 - (d - width / 2) / soft, 0, 1)


def build(pattern, base, acc, seed):
    x, y = grid()
    lum = np.zeros((N, N))
    mix = np.zeros((N, N))  # 0 = base, 1 = accent

    fibre = periodic_noise(seed, 1.2, 7) * 0.035 + periodic_noise(seed + 1, 0.8, 0.8) * 0.02
    mottled = periodic_noise(seed + 2, 60, 60) * 0.006
    lum += fibre + mottled

    if pattern in ("twill", "pinstripe", "chalkstripe", "donegal", "glencheck", "windowpane"):
        lum += wave(x + y, 5.12) * 0.045 + wave(x + y, 2.56) * 0.015
    if pattern == "solid":
        lum += wave(x - y, 4.0) * 0.012
    if pattern == "melange":
        heather = periodic_noise(seed + 3, 1.5, 9)
        mix = np.clip((heather - 0.3) * 0.9, 0, 1) * 0.55
        lum += periodic_noise(seed + 4, 2, 2) * 0.03
    if pattern == "flannel":
        lum = periodic_noise(seed + 5, 4, 5) * 0.04 + mottled * 0.8
    if pattern == "velvet":
        lum = periodic_noise(seed + 6, 3, 3) * 0.015 + periodic_noise(seed + 7, 80, 40) * 0.06
    if pattern == "birdseye":
        cell = 8.0
        cx = ((x % cell) - cell / 2) / (cell / 2)
        cy = ((y % cell) - cell / 2) / (cell / 2)
        dot = np.clip(1 - np.sqrt(cx**2 + cy**2) * 1.6, 0, 1)
        mix = dot * 0.9
        lum += wave(x, cell) * wave(y, cell) * 0.02
    if pattern == "herringbone":
        col = np.floor(x / 16) % 2
        lum += np.where(col == 0, wave(x + y, 5.12), wave(x - y, 5.12)) * 0.07
        lum -= stripe(x, 16, 0.6, 0.8) * 0.05
    if pattern == "houndstooth":
        # True houndstooth: 2/2 twill with 4-dark/4-light warp and weft.
        t = 4
        X = (x // t).astype(int)
        Y = (y // t).astype(int)
        warp_dark = (X // 4) % 2 == 0
        weft_dark = (Y // 4) % 2 == 0
        warp_up = ((X + Y) % 4) < 2
        dark = np.where(warp_up, warp_dark, weft_dark)
        mix = np.where(dark, 0.0, 1.0)
        lum += wave(x + y, 4) * 0.03
    if pattern == "pinstripe":
        dash = 0.75 + 0.25 * (wave(y, 4) > -0.3)
        mix = stripe(x, 32, 1.1, 0.7) * 0.9 * dash
    if pattern == "chalkstripe":
        soft = stripe(x, 64, 3.0, 2.5) * (0.5 + 0.35 * np.clip(periodic_noise(seed + 8, 1, 6), -1, 1))
        mix = np.clip(soft, 0, 1) * 0.55
    if pattern == "windowpane":
        mix = np.maximum(stripe(x, 128, 1.4, 0.8), stripe(y, 128, 1.4, 0.8)) * 0.8
    if pattern == "glencheck":
        big = 128
        u = x % big
        v = y % big
        fine_v = stripe(x, 4, 1.2, 0.5) * (u < 64)
        fine_h = stripe(y, 4, 1.2, 0.5) * (v >= 64)
        lum -= (fine_v + fine_h) * 0.07
        lum -= ((u < 64) & (v < 64)).astype(float) * 0.03
        mix = np.maximum(stripe(x, big, 1.2, 0.8), stripe(y, big, 1.2, 0.8)) * 0.85
    if pattern == "corduroy":
        wale = np.abs(wave(x, 6.4))
        lum = (wale - 0.6) * 0.16 + periodic_noise(seed + 9, 0.6, 12) * 0.03 + mottled
    if pattern == "linen":
        slub_x = periodic_noise(seed + 10, 0.9, 40)
        slub_y = periodic_noise(seed + 11, 40, 0.9)
        lum = (slub_x + slub_y) * 0.035 + (wave(x, 2.56) * wave(y, 2.56)) * 0.02 + mottled * 0.6
        mix = np.clip(np.maximum(slub_x, slub_y) - 1.6, 0, 1) * 0.6
    if pattern == "donegal":
        rng = np.random.default_rng(seed + 12)
        flecks = np.zeros((N, N))
        for _ in range(420):
            fx, fy = rng.integers(0, N, 2)
            flecks[fy % N, fx % N] = 1
            flecks[fy % N, (fx + 1) % N] = 0.7
        flecks = np.real(np.fft.ifft2(np.fft.fft2(flecks) * np.fft.fft2(np.pad(np.ones((2, 2)), ((0, N - 2), (0, N - 2))))))
        mix = np.clip(flecks, 0, 1)

    col = base[None, None, :] * (1 - mix[..., None]) + acc[None, None, :] * mix[..., None]
    col = col * (1 + lum[..., None])
    return np.clip(col, 0, 1)


def parse_fabrics():
    src = CATALOGUE.read_text()
    block = src[src.index("export const SUIT_FABRICS") : src.index("export const LINING_COLOURS")]
    entries = re.split(r"\n  \{\n", block)[1:]
    out = []
    for e in entries:
        get = lambda k: (re.search(rf'\b{k}: "([^"]+)"', e) or [None, None])[1]
        fid, pattern, hx, acc = get("id"), get("pattern"), get("hex"), get("accentHex")
        if fid and pattern and hx:
            out.append((fid, pattern, hx, acc))
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    fabrics = parse_fabrics()
    only = set(sys.argv[1:])
    for i, (fid, pattern, hx, acc) in enumerate(fabrics):
        if only and fid not in only:
            continue
        base = hex_rgb(hx)
        accent = hex_rgb(acc) if acc else np.clip(base * 1.18 + 0.02, 0, 1)
        img = build(pattern, base, accent, seed=1000 + i * 17)
        Image.fromarray((img * 255).astype(np.uint8)).save(OUT / f"{fid}.jpg", quality=86, optimize=True)
        print(f"{fid:32s} {pattern}")
    print(f"{len(fabrics)} fabrics -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
