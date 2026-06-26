"""
Swap the dark stone background behind every product image with a warm gold-satin
backdrop. Uses rembg (AI U^2-Net) to extract the jewellery as an RGBA cutout,
then composites it onto a procedurally-generated champagne-gold satin canvas.

Output files OVERWRITE the originals so the website picks them up automatically.
Originals are preserved at public/images/products/_originals/ on first run.
"""

import os, shutil, math, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "public" / "images" / "products"
BACKUP_DIR = SRC_DIR / "_originals"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

# Build a bright champagne / gold satin backdrop — matches the reference photo.
# Uses a small low-res canvas painted per-pixel then upscaled with smooth filtering.
def gold_satin(size=(1024, 1280)):
    w, h = size
    LOW = (64, 80)  # paint at low res, smooth-upscale later
    lw, lh = LOW
    grad = Image.new("RGB", LOW)
    # Cream → champagne radial wash, biased to the top
    for y in range(lh):
        for x in range(lw):
            nx, ny = x / lw - 0.5, y / lh - 0.45
            d = (nx * nx + ny * ny) ** 0.5
            d = min(1.0, d / 0.85)
            # warm cream center → champagne mid → soft bronze edge
            r = int(252 - (252 - 200) * d)
            g = int(238 - (238 - 162) * d)
            b = int(202 - (202 - 110) * d)
            grad.putpixel((x, y), (r, g, b))
    base = grad.resize(size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(8))

    # Silky highlight bands — soft diagonal sweeps
    light = Image.new("L", size, 0)
    ldraw = ImageDraw.Draw(light)
    for i, alpha in enumerate([90, 55, 30]):
        offset = int(w * 0.05) + i * int(w * 0.12)
        ldraw.polygon([
            (-w//3 + offset, 0),
            (w//3 + offset, 0),
            (w + offset, h),
            (w//3 - w//3 + offset, h),
        ], fill=alpha)
    light = light.filter(ImageFilter.GaussianBlur(70))
    out = Image.composite(Image.new("RGB", size, (255, 248, 225)), base, light)

    # Bright hot-spots for prism / reflection feel
    spots = Image.new("L", size, 0)
    sdraw = ImageDraw.Draw(spots)
    for cx, cy, r, a in [
        (int(w*0.20), int(h*0.18), int(w*0.34), 175),
        (int(w*0.82), int(h*0.16), int(w*0.28), 135),
        (int(w*0.55), int(h*0.88), int(w*0.45), 110),
        (int(w*0.30), int(h*0.62), int(w*0.20), 95),
        (int(w*0.78), int(h*0.78), int(w*0.18), 80),
    ]:
        sdraw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=a)
    spots = spots.filter(ImageFilter.GaussianBlur(90))
    out = Image.composite(Image.new("RGB", size, (255, 244, 215)), out, spots)

    return out

print("Generating gold-satin backdrop…", flush=True)
backdrop_template = gold_satin((1024, 1280))

# Use a smaller, faster rembg model for jewellery silhouettes
session = new_session("u2net")

def process(jpg: Path):
    rel = jpg.relative_to(SRC_DIR)
    backup = BACKUP_DIR / rel.name
    if not backup.exists():
        shutil.copy(jpg, backup)
    src = Image.open(backup).convert("RGB")
    w, h = src.size
    bg = backdrop_template.resize((w, h), Image.LANCZOS)
    cutout = remove(src, session=session)  # RGBA
    bg.paste(cutout, (0, 0), cutout)
    bg.save(jpg, "JPEG", quality=92, optimize=True)
    print(f"  ✓ {jpg.name}", flush=True)

files = sorted(SRC_DIR.glob("design-*.jpg"))
print(f"Processing {len(files)} files →", flush=True)
for f in files:
    process(f)
print("Done.", flush=True)
