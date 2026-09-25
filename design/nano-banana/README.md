# Suit imagery — Nano Banana Pro workflow

Every photograph used by the custom-suit experience is generated with **Nano Banana Pro**
(`gemini-3-pro-image`) in Google AI Studio, then processed by scripts in this repo. The exact
prompts are in `prompts.json` (one entry per asset, self-contained). This file explains the system.

## 1. What the customizer needs

| View | Assets (one base photo each) | Driven by |
|---|---|---|
| **Front** (jacket + folded trousers, flat-lay) | sb2-notch, sb1-notch, sb1-peak, sb1-shawl, sb2-peak, sb3-notch, db4-peak, db6-peak, mandarin; pocket variants (jetted, patch) | `jacket.closure`, `jacket.lapel`, `jacket.pockets` |
| **Back** (jacket back + trousers) | vents none / centre / side | `jacket.vents` |
| **Inside** (jacket laid open) | full lining, half lining, unlined | `accents.liningStyle`, lining colour |
| **Waistcoat** | single-breasted 5-button, double-breasted 6-button | `waistcoat.style` |
| **Hero / marketing** | 3 editorial on-model portraits | landing page carousel |

Details that are too small to photograph per combination (lapel width, buttonhole thread, pick
stitching, monogram) stay on the technical drawings (the "Flat" tab).

Every base photo shares one **style block**: overhead orthographic flat-lay, seamless neutral grey
`#EEEEEE` backdrop, soft even light, **neutral mid-grey plain worsted** (`#A3A3A3`), **emerald satin
lining** (`#1E9E4A`), **matte black horn buttons**. Neutral cloth + a saturated lining make the
photos re-colourable without bleeding:

- `rembg` ISNet produces the garment cut-out (excludes the contact shadow),
- the emerald chroma isolates the lining,
- dark round blobs isolate buttons,
- the rest is cloth, whose luminance (folds, seams, pressing) multiplies the chosen fabric texture.

## 2. Fabrics — established, commercially popular options only

Navy and charcoal worsteds are the global core of suiting; mid-grey, black, mid-blue follow. The
patterned staples are pinstripe, chalk stripe, herringbone, houndstooth, birdseye, Prince of Wales
(glen) check and windowpane. Seasonal: flannel (winter), linen and wool-linen (summer — oatmeal,
cream, sage, sky), tweed/donegal (country), velvet (evening). Nothing obscure is added to pad
the range; see `lib/suit/catalogue.ts` (`SUIT_FABRICS`).

Fabric swatch textures are photographed with Nano Banana Pro as macro shots and made seamless by
`scripts/generate-fabric-textures.py --from-photos`.

## 3. Running it

1. Open AI Studio → Playground → model **Nano Banana Pro**, aspect ratio per asset (`prompts.json`),
   resolution **2K**.
2. Paste the prompt; for variants, stay in the same chat as the base and paste the variant's
   *edit* prompt so the garment stays identical.
3. Inspect at 100 %: reject any image with warped lapels, uneven sleeves, extra/missing buttons,
   stray colour, low detail or a non-neutral cloth. Regenerate until clean.
4. Save as `design/nano-banana/out/<asset-id>.jpg`, then run
   `python3 scripts/build-suit-photos.py` → `public/suit-photos/**` + `lib/suit/photo-assets.json`.
