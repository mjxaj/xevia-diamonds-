"""
Gemini 2.5 Flash Image (Nano Banana) — image-to-image:
take an original product photo + a reference satin photo + a prompt,
produce a new photo that keeps the exact jewelry but matches the
reference satin scene.

Usage:
    GEMINI_API_KEY=... python gemini-satin.py one design-1-1.jpg
    GEMINI_API_KEY=... python gemini-satin.py all
"""

import base64
import io
import json
import os
import random
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

from PIL import Image

API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
if not API_KEY:
    print("Missing GEMINI_API_KEY env var.", file=sys.stderr)
    sys.exit(1)

MODEL = "gemini-2.5-flash-image"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "public" / "images" / "products" / "_originals"
OUT_DIR = ROOT / "public" / "images" / "products"
REF = ROOT / "public" / "images" / "site" / "satin-reference.jpg"

PROMPT = (
    "TASK: Generate a new photograph that shows ONLY the jewelry piece from IMAGE 1 "
    "(the FIRST image) placed on a champagne gold satin fabric backdrop styled like "
    "IMAGE 2 (the SECOND image).\n\n"
    "RULES:\n"
    "1. The jewelry MUST be the exact same piece shown in IMAGE 1: same shape, same "
    "stones, same metal colour, same diamond count, same gemstone count, same design. "
    "Do NOT use the jewelry from IMAGE 2.\n"
    "2. The background MUST be champagne / warm gold satin silk fabric with soft folds, "
    "prismatic sunlit refraction patterns, water-like sparkle reflections, soft shadows "
    "— matching the lighting and texture of IMAGE 2 (but NOT containing the bracelet "
    "from IMAGE 2).\n"
    "3. The jewelry from IMAGE 1 should rest naturally on the satin with realistic cast "
    "shadows underneath.\n"
    "4. Output ONLY the new photorealistic photograph. No text, no watermarks, no "
    "borders.\n"
    "5. Match the aspect ratio of IMAGE 1."
)


def encode_image_inline(p: Path, max_side: int = 1024) -> dict:
    img = Image.open(p).convert("RGB")
    w, h = img.size
    if max(w, h) > max_side:
        scale = max_side / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=92)
    return {
        "inlineData": {
            "mimeType": "image/jpeg",
            "data": base64.b64encode(buf.getvalue()).decode("ascii"),
        }
    }


def generate(src: Path, attempt: int = 1) -> bytes:
    body = {
        "contents": [
            {
                "parts": [
                    encode_image_inline(src),
                    encode_image_inline(REF, max_side=768),
                    {"text": PROMPT},
                ]
            }
        ],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    data = json.dumps(body).encode("utf-8")
    req = Request(URL, data=data, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=180) as resp:
            payload = json.loads(resp.read())
    except HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:500]
        if e.code == 429 and attempt < 6:
            wait = (2 ** attempt) + random.random()
            print(f"   429 rate-limited, sleeping {wait:.1f}s …", flush=True)
            time.sleep(wait)
            return generate(src, attempt + 1)
        raise RuntimeError(f"HTTP {e.code}: {err_body}") from e

    cands = payload.get("candidates") or []
    if not cands:
        raise RuntimeError(f"No candidates: {payload}")
    parts = cands[0].get("content", {}).get("parts", [])
    for part in parts:
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            return base64.b64decode(inline["data"])
    raise RuntimeError(f"No inline image returned. Parts: {parts}")


def process_one(src: Path, out: Path):
    print(f"   → {src.name}", flush=True, end=" ")
    t0 = time.time()
    img_bytes = generate(src)
    out.write_bytes(img_bytes)
    print(f"({time.time() - t0:.1f}s)", flush=True)


def cmd_one(name: str):
    src = SRC_DIR / name
    if not src.exists():
        raise SystemExit(f"Not found: {src}")
    out = Path("/tmp/ai-sample") / f"gemini-{name}"
    out.parent.mkdir(parents=True, exist_ok=True)
    process_one(src, out)
    print(f"Saved → {out}")


def cmd_all():
    files = sorted(SRC_DIR.glob("design-*.jpg"))
    print(f"Processing {len(files)} originals via Gemini …", flush=True)
    t0 = time.time()
    fails = []
    for i, src in enumerate(files, 1):
        out = OUT_DIR / src.name
        print(f"[{i}/{len(files)}]", end=" ", flush=True)
        try:
            process_one(src, out)
        except Exception as e:
            print(f" FAILED — {e}", flush=True)
            fails.append((src.name, str(e)))
        # Gentle pacing — free tier limits vary
        time.sleep(0.6)
    print(f"\nDone in {time.time() - t0:.1f}s. Failures: {len(fails)}")
    for name, err in fails:
        print(f"  ✗ {name}: {err[:120]}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python gemini-satin.py one <filename> | all", file=sys.stderr)
        sys.exit(1)
    if sys.argv[1] == "one":
        cmd_one(sys.argv[2])
    elif sys.argv[1] == "all":
        cmd_all()
    else:
        print(f"Unknown command: {sys.argv[1]}", file=sys.stderr)
        sys.exit(1)
