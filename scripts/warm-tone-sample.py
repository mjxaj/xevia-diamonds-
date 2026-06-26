"""Color-tone shift: keep the real photo, push dark tones to warm gold/bronze."""
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "images" / "products" / "_originals" / "design-1-1.jpg"
OUT = Path("/tmp/ai-sample/warm-tone-sample.jpg")
OUT.parent.mkdir(parents=True, exist_ok=True)

src = Image.open(SRC).convert("RGB")
arr = np.array(src).astype(np.float32) / 255.0

# 1. Boost overall warmth (R up, B down) — strongest in shadows, gentle in highlights
lum = arr.mean(axis=2)
shadow_mask = np.clip(1.0 - lum / 0.6, 0, 1) ** 1.5   # 1 in dark, 0 in light
mid_mask = 1.0 - shadow_mask

# Shadow gets pushed strongly to warm champagne (#c89a52)
shadow_tint = np.array([0.86, 0.65, 0.34])
# Midtones get gentle gold warmth (#e8c285)
mid_tint = np.array([0.95, 0.78, 0.55])

blended = (
    arr * 0.35
    + (shadow_tint * shadow_mask[..., None]) * 0.55
    + (mid_tint * mid_mask[..., None]) * 0.10
)
blended = np.clip(blended, 0, 1)

# 2. Re-add highlights from the jewellery so it stays bright
highlight = np.clip((lum - 0.55) * 2.5, 0, 1)[..., None]
blended = blended * (1 - highlight * 0.7) + arr * (highlight * 0.7)

out = Image.fromarray(np.clip(blended * 255, 0, 255).astype(np.uint8))

# 3. Slight saturation + contrast tweaks
out = ImageEnhance.Color(out).enhance(1.15)
out = ImageEnhance.Contrast(out).enhance(1.05)
out = ImageEnhance.Brightness(out).enhance(1.08)

out.save(OUT, "JPEG", quality=92, optimize=True)
print("Saved →", OUT)
