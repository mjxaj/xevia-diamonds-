"""
Full Xevia pipeline:
- Combine 15 existing earrings (already-named via seed.js) + 14 new designs from
  the just-processed PDFs.
- For every design, generate 3 variants via Gemini 2.5 Flash Image:
    · satin  — champagne gold satin backdrop, prismatic light reflections
    · white  — clean white studio backdrop, soft shadow
    · model  — woman wearing the piece, soft natural light
- Save to public/images/products/ as design-<slug>-{satin,white,model}.jpg
- Run in parallel (5 workers) for speed.
"""
import base64
import io
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

from PIL import Image

API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
if not API_KEY:
    print("GEMINI_API_KEY missing", file=sys.stderr); sys.exit(1)

MODEL = "gemini-2.5-flash-image"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

ROOT = Path(__file__).resolve().parent.parent
ORIG_DIR = ROOT / "public" / "images" / "products" / "_originals"
OUT_DIR = ROOT / "public" / "images" / "products"
REF_SATIN = ROOT / "public" / "images" / "site" / "satin-reference.jpg"
MANIFEST = Path("/tmp/xevia-all/manifest.json")

# Slugs and source files for the 15 existing earrings (close-up source)
EXISTING = [
    ("diamond-teardrop-stud", "earring", ORIG_DIR / "design-1-1.jpg"),
    ("green-apatite-diamond-drop", "earring", ORIG_DIR / "design-2-1.jpg"),
    ("pink-amethyst-teardrop-dangle", "earring", ORIG_DIR / "design-3-1.jpg"),
    ("morganite-blossom-drop", "earring", ORIG_DIR / "design-4-1.jpg"),
    ("lotus-blossom-drop", "earring", ORIG_DIR / "design-5-1.jpg"),
    ("butterfly-floral-drop", "earring", ORIG_DIR / "design-6-1.jpg"),
    ("butterfly-blossom-climber", "earring", ORIG_DIR / "design-7-1.jpg"),
    ("dainty-blossom-drop", "earring", ORIG_DIR / "design-8-1.jpg"),
    ("lavender-blossom-drop", "earring", ORIG_DIR / "design-9-1.jpg"),
    ("golden-ribbon-drops", "earring", ORIG_DIR / "design-10-1.jpg"),
    ("geometric-green-chevron", "earring", ORIG_DIR / "design-11-1.jpg"),
    ("solar-drop-canary-yellow", "earring", ORIG_DIR / "design-12-1.jpg"),
    ("tulip-drop-rose-gold", "earring", ORIG_DIR / "design-13-1.jpg"),
    ("rose-amethyst-cluster", "earring", ORIG_DIR / "design-14-1.jpg"),
    ("cats-eye-floral", "earring", ORIG_DIR / "design-15-1.jpg"),
]


def slugify(s):
    s = re.sub(r"[^a-z0-9 ]+", "", s.lower())
    return re.sub(r"\s+", "-", s.strip())[:60]


# Load new designs from triage manifest
def load_new():
    if not MANIFEST.exists():
        return []
    data = json.loads(MANIFEST.read_text())["designs"]
    items = []
    for name, info in data.items():
        if name == "unknown": continue  # Skip unnamed
        cat = info.get("category", "") or ""
        if not cat: continue
        # Pick the best source: real_photo > model_shot > render
        for k in ("real_photo", "model_shot", "render"):
            if info.get(k):
                src = Path(info[k][0])
                items.append((slugify(name), cat, src))
                break
    return items


VARIANTS = {
    "satin": (
        "TASK: Generate a new photograph of the jewelry piece in this image, "
        "placed on a luxurious champagne gold satin silk fabric backdrop.\n"
        "RULES: 1. Keep the jewelry EXACTLY as shown — same design, same stones, "
        "same metal colour, same diamond count, same gemstone count, same proportions. "
        "2. The background is warm cream-and-gold satin silk with soft natural folds, "
        "bright prismatic sunlit refraction patterns, water-like sparkle reflections "
        "across the fabric, soft natural cast shadow beneath the jewelry. "
        "3. The jewelry rests naturally on the satin, top-lit. "
        "4. Photorealistic editorial product photography lighting. "
        "5. No text, no watermarks, no models. Same aspect ratio as input."
    ),
    "white": (
        "TASK: Generate a new photograph of ONLY the jewelry piece from IMAGE 1 "
        "placed on a clean white seamless studio backdrop.\n"
        "RULES: 1. Keep the jewelry EXACTLY as shown in IMAGE 1 — same design, stones, metal. "
        "2. Pure white seamless paper background, bright even studio lighting. "
        "3. Soft subtle drop shadow directly beneath the jewelry. "
        "4. Photorealistic, ecommerce product photography, no text/watermarks. "
        "5. Same aspect ratio as IMAGE 1."
    ),
    "model": (
        "TASK: Generate a photograph of an elegant Indian woman model wearing the "
        "jewelry piece from IMAGE 1.\n"
        "RULES: 1. The jewelry on the model MUST be EXACTLY the piece in IMAGE 1 — "
        "same design, stones, metal, proportions. 2. Soft natural window light, "
        "warm cream/beige background, shallow depth of field. 3. Editorial fashion "
        "photography, model gazing softly, jewelry clearly visible. 4. Photorealistic, "
        "no text/watermarks. 5. Same aspect ratio as IMAGE 1."
    ),
}


def encode_image(p: Path, max_side: int = 1024) -> dict:
    img = Image.open(p).convert("RGB")
    w, h = img.size
    if max(w, h) > max_side:
        sc = max_side / max(w, h)
        img = img.resize((int(w * sc), int(h * sc)), Image.LANCZOS)
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=90)
    return {"inlineData": {"mimeType": "image/jpeg", "data": base64.b64encode(buf.getvalue()).decode("ascii")}}


def generate(src: Path, variant: str, attempt: int = 1) -> bytes:
    # Text-only prompts for every variant (no reference image — the reference
    # was confusing Gemini into copying jewelry from it).
    parts = [encode_image(src), {"text": VARIANTS[variant]}]
    body = {"contents": [{"parts": parts}], "generationConfig": {"responseModalities": ["IMAGE"]}}
    data = json.dumps(body).encode("utf-8")
    req = Request(URL, data=data, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=180) as resp:
            payload = json.loads(resp.read())
    except HTTPError as e:
        if e.code == 429 and attempt < 6:
            wait = (2 ** attempt) + (attempt * 0.3)
            time.sleep(wait)
            return generate(src, variant, attempt + 1)
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode('utf-8', errors='replace')[:300]}")
    cands = payload.get("candidates") or []
    if not cands:
        raise RuntimeError("no candidates")
    for part in cands[0].get("content", {}).get("parts", []):
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            return base64.b64decode(inline["data"])
    raise RuntimeError("no image returned")


def job(slug: str, category: str, src: Path, variant: str):
    out = OUT_DIR / f"design-{slug}-{variant}.jpg"
    t0 = time.time()
    try:
        img = generate(src, variant)
        out.write_bytes(img)
        return slug, variant, True, time.time() - t0, ""
    except Exception as e:
        return slug, variant, False, time.time() - t0, str(e)[:160]


def main():
    designs = []
    seen = set()
    for slug, cat, src in EXISTING + load_new():
        if slug in seen: continue
        seen.add(slug)
        if not src.exists():
            print(f"  skip {slug}: source missing {src}")
            continue
        designs.append((slug, cat, src))

    only = set(sys.argv[1:])  # e.g. python ... satin  → only run satin
    variants_to_run = [v for v in VARIANTS if not only or v in only]
    jobs = [(slug, cat, src, v) for slug, cat, src in designs for v in variants_to_run]
    print(f"{len(designs)} designs × {len(VARIANTS)} variants = {len(jobs)} jobs", flush=True)

    t0 = time.time()
    done = 0; fail = 0
    with ThreadPoolExecutor(max_workers=5) as pool:
        futs = {pool.submit(job, *j): j for j in jobs}
        for fut in as_completed(futs):
            slug, variant, ok, dt, err = fut.result()
            done += 1
            if ok:
                print(f"[{done}/{len(jobs)}] ✓ {slug}-{variant} ({dt:.1f}s)", flush=True)
            else:
                fail += 1
                print(f"[{done}/{len(jobs)}] ✗ {slug}-{variant}: {err}", flush=True)

    print(f"\nTotal {time.time()-t0:.0f}s — {len(jobs)-fail} ok, {fail} failed.")
    # Save design manifest for seed update
    Path("/tmp/xevia-all/final-designs.json").write_text(
        json.dumps([{"slug": s, "category": c, "source": str(src)} for s, c, src in designs], indent=2)
    )

if __name__ == "__main__":
    main()
