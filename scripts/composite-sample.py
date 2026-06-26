"""Composite a real jewellery cutout onto an AI-generated satin backdrop
with a soft cast shadow, for one sample image."""

from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parent.parent
BACKDROP = Path("/tmp/ai-sample/satin-backdrop.jpg")
SRC = ROOT / "public" / "images" / "products" / "_originals" / "design-1-1.jpg"
OUT = Path("/tmp/ai-sample/teardrop-on-ai-satin.jpg")

print("Loading backdrop + source…")
bg = Image.open(BACKDROP).convert("RGB")
src = Image.open(SRC).convert("RGB")

print("Removing background from source jewellery…")
session = new_session("u2net")
cutout = remove(src, session=session)  # RGBA, original size

# Resize cutout to fit nicely on backdrop
bw, bh = bg.size
cw, ch = cutout.size
# scale so the cutout occupies ~70% of backdrop height
scale = (bh * 0.70) / ch
new_size = (int(cw * scale), int(ch * scale))
cutout = cutout.resize(new_size, Image.LANCZOS)
cw, ch = cutout.size

# Place centered, slightly above center
px = (bw - cw) // 2
py = int((bh - ch) * 0.40)

print("Building soft shadow…")
# Build a soft shadow underneath
shadow_mask = cutout.split()[3]  # alpha channel
shadow = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
# Use the alpha as a mask for a black-translucent shape
black_layer = Image.new("RGBA", (cw, ch), (40, 28, 12, 180))
shadow.paste(black_layer, (0, 0), shadow_mask)
shadow = shadow.filter(ImageFilter.GaussianBlur(28))
# darken shadow further by re-pasting with offset
out = bg.copy().convert("RGBA")
out.alpha_composite(shadow, (px + 14, py + 30))  # offset shadow down-right
out.alpha_composite(cutout, (px, py))

# Convert + save
out.convert("RGB").save(OUT, "JPEG", quality=92, optimize=True)
print(f"Saved → {OUT}")
