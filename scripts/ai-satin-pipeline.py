"""
L2 pipeline: AI-generated gold satin backdrops + real jewellery cutouts.

1. Generate N unique satin backdrops via pollinations.ai (free, no key)
2. For each of the 45 originals: rembg cutout → soft cast shadow → composite
3. Each design (1-15) gets its own backdrop assigned, shared across that
   design's 3 variants (-1 / -2 / -3) for visual consistency.
4. Output OVERWRITES the public-facing files; originals stay safe in _originals/.
"""

import io
import sys
import time
import urllib.parse
from pathlib import Path
from urllib.request import urlopen, Request

from PIL import Image, ImageFilter
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "public" / "images" / "products" / "_originals"
OUT_DIR = ROOT / "public" / "images" / "products"
BACKDROP_CACHE = Path("/tmp/ai-sample/backdrops")
BACKDROP_CACHE.mkdir(parents=True, exist_ok=True)

# 5 backdrop variations — different folds & light, all champagne-gold
PROMPTS = [
    ("luxury champagne gold satin silk fabric backdrop, soft folds, prismatic sunlit reflections, editorial product photography surface, ultra realistic, 8k", 11),
    ("rich champagne silk surface with diagonal light streaks and gentle wrinkles, golden hour glow, soft shadows, luxury jewellery backdrop, photorealistic", 23),
    ("cream gold satin backdrop, smooth ripples, sun dappled refraction, warm vogue editorial lighting, no jewelry no objects, photoreal", 47),
    ("pale champagne silk fabric with soft folds and bright highlights, prism light spots, editorial luxury product still life surface", 71),
    ("gold satin sheen, billowing fabric folds, warm sunlight glints, jewellery photography backdrop only, no objects, ultra detailed", 92),
]

def fetch_backdrop(prompt: str, seed: int, size=(1024, 1280)) -> Image.Image:
    key = f"backdrop-{seed}.jpg"
    cached = BACKDROP_CACHE / key
    if cached.exists():
        print(f"   cached → {key}", flush=True)
        return Image.open(cached).convert("RGB").resize(size, Image.LANCZOS)
    url_prompt = urllib.parse.quote(prompt)
    url = (
        f"https://image.pollinations.ai/prompt/{url_prompt}"
        f"?width={size[0]}&height={size[1]}&model=flux&nologo=true&seed={seed}"
    )
    print(f"   fetching seed={seed} …", flush=True)
    req = Request(url, headers={"User-Agent": "xevia/1.0"})
    with urlopen(req, timeout=180) as resp:
        data = resp.read()
    cached.write_bytes(data)
    return Image.open(io.BytesIO(data)).convert("RGB").resize(size, Image.LANCZOS)

print("Fetching 5 AI backdrops …", flush=True)
backdrops = [fetch_backdrop(p, s) for p, s in PROMPTS]
print("Got all backdrops.", flush=True)

# rembg session shared across all images
session = new_session("u2net")

def composite(src_path: Path, backdrop: Image.Image, out_path: Path):
    src = Image.open(src_path).convert("RGB")
    sw, sh = src.size
    # Re-fetch a fresh backdrop sized to the source dimensions so the output keeps
    # the original photo's aspect ratio and resolution.
    bg = backdrop.resize((sw, sh), Image.LANCZOS)

    cutout = remove(src, session=session)
    # rembg returns RGBA at source size; ensure full size
    if cutout.size != (sw, sh):
        cutout = cutout.resize((sw, sh), Image.LANCZOS)

    # Soft cast shadow from alpha
    alpha = cutout.split()[3]
    shadow_layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    dark = Image.new("RGBA", (sw, sh), (40, 28, 12, 165))
    shadow_layer.paste(dark, (0, 0), alpha)
    # blur the shadow for softness — kernel proportional to image size
    blur_k = max(12, int(min(sw, sh) * 0.025))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(blur_k))

    # Offset shadow down-right slightly to simulate top-lighting
    offset = (max(6, int(sw * 0.015)), max(10, int(sh * 0.025)))
    out = bg.convert("RGBA")
    shifted_shadow = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    shifted_shadow.paste(shadow_layer, offset, shadow_layer)
    out.alpha_composite(shifted_shadow)
    out.alpha_composite(cutout)

    out.convert("RGB").save(out_path, "JPEG", quality=92, optimize=True)
    print(f"   ✓ {out_path.name}", flush=True)

files = sorted(SRC_DIR.glob("design-*.jpg"))
print(f"Processing {len(files)} originals…", flush=True)
t0 = time.time()
for src in files:
    # design-<N>-<variant>.jpg → backdrop assigned by N % len(backdrops)
    stem = src.stem  # e.g. design-7-2
    parts = stem.split("-")
    n = int(parts[1])
    backdrop = backdrops[(n - 1) % len(backdrops)]
    out = OUT_DIR / src.name
    composite(src, backdrop, out)

print(f"Done in {time.time() - t0:.1f}s.", flush=True)
