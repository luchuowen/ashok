# Suit imagery — Nano Banana Pro workflow

Every photograph used by the custom-suit experience is generated with **Nano Banana Pro**
(`gemini-3-pro-image`) in Google AI Studio, then processed by scripts in this repo. The exact
prompts are in `prompts.json` (one entry per asset, self-contained). This file explains the system.

## 1. What the customizer needs (and what is live)

| View | Photo assets (`design/nano-banana/out/`) | Driven by |
|---|---|---|
| **Front** | `front-sb2-notch` (base), `front-sb1-notch`, `front-sb1-peak`, `front-sb1-shawl`, `front-sb2-peak`, `front-sb3-notch`, `front-db4-peak` (retouched from db6), `front-db6-peak`, `front-mandarin`, `front-sb2-jetted`, `front-sb2-patch`, `front-3pc-notch` (three-piece) | closure, lapel, pockets, pieces |
| **Detail** | close-up crop of the front photo (`DETAIL_CROP`) | — |
| **Hide jacket** | `nojacket-vest` (three-piece), `nojacket` (two-piece) | pieces |
| **Back** | `back-none`, `back-centre`, `back-side` | vents |
| **Inside** | `inside` (emerald satin so the lining can be re-coloured) | lining colour |
| **Waistcoat** | `waistcoat-sb5` | waistcoat style |
| **Hero** | 3 on-model portraits (`public/photos/custom-suits/`) | landing carousel |
| **On model** | 13 colour-coded poses (`design/model-src/`, prompts key `onModel`) | stage "On model" mode |

Base look: an **invisible-mannequin** luxury suit (Super 120s worsted, neutral grey `#9A9A9A`,
tonal satin lining, horn buttons) on a seamless light neutral backdrop. Every variant is an
**edit of the base image in the same chat** ("keep everything identical, change only …") so all
states are the same garment, same scale, same light.

Every configuration shows a photograph: options without their own shot use the closest one
(`choosePhoto()`); the parametric drawing (`SuitDrawing`) is only a fallback if a photo fails to
load. The trousers below the jacket are dyed separately (rows below `split` in the manifest), so
mix-and-match cloths show correctly. Bright white shirt areas are flood-filled and never dyed.

Re-colouring (`scripts/build-suit-photos.py` → `components/suit/PhotoPreview.tsx`):
`rembg` ISNet matte for the garment outline (the backdrop and contact shadow are never dyed),
Hough-circle detection for horn buttons (kept as photographed), emerald chroma for the inside
lining, and the grey cloth's smoothed luminance multiplied by the chosen fabric texture.

## 2. Fabrics — established, commercially popular options only

Navy and charcoal worsteds are the global core of suiting; mid-grey, black, mid-blue follow. The
patterned staples are pinstripe, chalk stripe, herringbone, houndstooth, birdseye, Prince of Wales
(glen) check and windowpane. Seasonal: flannel (winter), linen and wool-linen (summer — oatmeal,
cream, sage, sky), tweed/donegal (country), velvet (evening). Nothing obscure is added to pad
the range; see `lib/suit/catalogue.ts` (`SUIT_FABRICS`).

Fabric card photos are Nano Banana Pro shots (prompt `fabricSwatch` in `prompts.json`), saved to
`design/nano-banana/fabrics/<fabric-id>.jpg` and resized by `scripts/fabric-photos-to-textures.py`
into `public/photos/fabrics/`. The dye textures on the suit photos stay procedural
(`scripts/generate-fabric-textures.py`).

## 3. Running it

1. Open AI Studio → Playground → model **Nano Banana Pro**, aspect ratio per asset (`prompts.json`),
   resolution **2K**.
2. Paste the prompt; for variants, stay in the same chat as the base and paste the variant's
   *edit* prompt so the garment stays identical.
3. Inspect at 100 %: reject any image with warped lapels, uneven sleeves, extra/missing buttons,
   stray colour, low detail or a non-neutral cloth. Regenerate until clean.
4. Save as `design/nano-banana/out/<asset-id>.jpg`, then run
   `python3 scripts/build-suit-photos.py` → `public/suit-photos/**` + `lib/suit/photo-assets.json`.

## On-model poses

`design/model-src/<pose>.jpg` are Nano Banana Pro 2K photos (9:16) of one model, cropped at the chin,
with the garments **colour-coded** so each part separates cleanly by hue: jacket blue `#4A6FA5`,
trousers green `#4F8A55`, waistcoat purple `#7B5AA6`, tie magenta `#D0208F`. The first prompt makes
`front-sb2-notch`; every other pose is an edit of that image in the same chat. `python3
scripts/build-model-poses.py [pose ...]` turns them into `public/model/<pose>/` (grey-neutralised
base, shade, masks) — only luminance is used, so the coding colours never reach the page.
