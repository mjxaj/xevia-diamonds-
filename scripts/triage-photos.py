"""Classify every PDF-extracted image: keep only real product photos,
discard sketches, spec sheets, technical drawings, and renders.

Uses Gemini 2.5 Flash (vision) — cheap, ~$0.001 per image.
Output: /tmp/xevia-all/triage.json
"""
import base64
import io
import json
import os
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

MODEL = "gemini-2.5-flash"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

ROOTS = [
    Path("/tmp/xevia-all/designsss"),
    Path("/tmp/xevia-all/bracelets"),
    Path("/tmp/xevia-all/rings_sketch"),
    Path("/tmp/xevia-all/rings1"),
    Path("/tmp/xevia-all/necklace"),
]
OUT = Path("/tmp/xevia-all/triage.json")

SCHEMA = (
    'Classify this image. Reply with strict JSON only, no markdown.\n'
    'Schema:\n'
    '{\n'
    '  "type": "real_photo" | "sketch" | "spec_sheet" | "render" | "model_shot" | "other",\n'
    '  "is_jewelry": true | false,\n'
    '  "design_name": short string or "" if not clear,\n'
    '  "category": "earring" | "ring" | "bracelet" | "necklace" | "" \n'
    '}\n'
    'Definitions: \n'
    '- real_photo = an actual product photograph (jewelry on fabric / stone / surface) suitable for an ecommerce site.\n'
    '- model_shot = a photograph showing a person wearing the jewelry.\n'
    '- sketch = hand-drawn or rendered line drawing.\n'
    '- spec_sheet = technical drafting page with diagrams, measurements, labels, tables.\n'
    '- render = 3D rendered (CGI) image of jewelry.\n'
)


def encode(p: Path, max_side: int = 512) -> dict:
    """Encode jpg or ppm at low res for vision classification."""
    img = Image.open(p).convert("RGB")
    w, h = img.size
    if max(w, h) > max_side:
        scale = max_side / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=80)
    return {"inlineData": {"mimeType": "image/jpeg", "data": base64.b64encode(buf.getvalue()).decode("ascii")}}


def classify(p: Path, attempt: int = 1) -> dict:
    body = {
        "contents": [{"parts": [encode(p), {"text": SCHEMA}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
    }
    data = json.dumps(body).encode("utf-8")
    req = Request(URL, data=data, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=60) as r:
            payload = json.loads(r.read())
    except HTTPError as e:
        if e.code == 429 and attempt < 5:
            time.sleep(2 ** attempt)
            return classify(p, attempt + 1)
        raise
    text = payload["candidates"][0]["content"]["parts"][0]["text"]
    try:
        return json.loads(text)
    except Exception:
        return {"type": "other", "raw": text}


def all_paths():
    out = []
    for root in ROOTS:
        if not root.exists(): continue
        out.extend(sorted(root.glob("*.jpg")))
        out.extend(sorted(root.glob("*.ppm")))
    return out


def main():
    paths = all_paths()
    print(f"Classifying {len(paths)} images in parallel …", flush=True)
    results = {}
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = {pool.submit(classify, p): p for p in paths}
        for i, fut in enumerate(as_completed(futs), 1):
            p = futs[fut]
            try:
                results[str(p)] = fut.result()
            except Exception as e:
                results[str(p)] = {"type": "error", "error": str(e)[:120]}
            if i % 10 == 0 or i == len(paths):
                print(f"  {i}/{len(paths)} ({time.time()-t0:.0f}s)", flush=True)

    OUT.write_text(json.dumps(results, indent=2))
    # Summary
    types = {}
    for v in results.values():
        t = v.get("type", "?")
        types[t] = types.get(t, 0) + 1
    print("\n=== Summary ===")
    for k, v in sorted(types.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")
    print(f"\nSaved → {OUT}")

if __name__ == "__main__":
    main()
