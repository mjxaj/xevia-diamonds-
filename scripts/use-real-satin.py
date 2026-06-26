"""Use the user's actual reference satin photo as the backdrop.
Crop a clean (jewelry-free) section, then composite the real jewelry from
design-1-1.jpg using rembg + cast shadow.
"""

from pathlib import Path
from PIL import Image, ImageFilter
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "public" / "images" / "site" / "satin-reference.jpg"
SRC = ROOT / "public" / "images" / "products" / "_originals" / "design-1-1.jpg"
OUT = Path("/tmp/ai-sample/real-satin-sample.jpg")

# Load reference satin (has a bracelet — we'll use only the empty-corner regions)
ref = Image.open(REF).convert("RGB")
rw, rh = ref.size
print(f"Reference satin: {rw}x{rh}")

# Build a clean backdrop from regions without jewelry (top-right strip is cleanest)
clean = ref.crop((int(rw*0.62), int(rh*0.02), int(rw*0.98), int(rh*0.18)))
# Tile it to fill, then heavy blur to hide tiling seams
cw, ch = clean.size
backdrop = Image.new("RGB", (rw, rh))
for y in range(0, rh, ch):
    for x in range(0, rw, cw):
        # Vary direction to avoid obvious tiling
        tile = clean if (x // cw + y // ch) % 2 == 0 else clean.transpose(Image.FLIP_LEFT_RIGHT)
        backdrop.paste(tile, (x, y))
backdrop = backdrop.filter(ImageFilter.GaussianBlur(6))
from PIL import ImageEnhance
backdrop = ImageEnhance.Brightness(backdrop).enhance(1.05)
backdrop = ImageEnhance.Contrast(backdrop).enhance(1.05)

# Now process the source product
src = Image.open(SRC).convert("RGB")
sw, sh = src.size
# Resize backdrop to match source dimensions
backdrop = backdrop.resize((sw, sh), Image.LANCZOS)

print("Removing background from product…")
session = new_session("u2net")
cutout = remove(src, session=session)

# Add soft cast shadow
alpha = cutout.split()[3]
shadow = Image.new("RGBA", (sw, sh), (0,0,0,0))
dark = Image.new("RGBA", (sw, sh), (80, 50, 20, 140))
shadow.paste(dark, (0, 0), alpha)
shadow = shadow.filter(ImageFilter.GaussianBlur(25))

out = backdrop.convert("RGBA")
shifted = Image.new("RGBA", (sw, sh), (0,0,0,0))
shifted.paste(shadow, (12, 28), shadow)
out.alpha_composite(shifted)
out.alpha_composite(cutout)

OUT.parent.mkdir(parents=True, exist_ok=True)
out.convert("RGB").save(OUT, "JPEG", quality=92, optimize=True)
print(f"Saved → {OUT}")
