"""Group classified images by design name, count unique designs,
output a manifest for the satin pipeline."""
import json, sys, re
from pathlib import Path
from collections import defaultdict

DATA = json.loads(Path("/tmp/xevia-all/triage.json").read_text())

# Keep only product-photo + model + render
KEEP = {"real_photo", "model_shot", "render"}

# Normalize design names
def norm(s: str) -> str:
    s = (s or "").lower().strip()
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

designs = defaultdict(lambda: {"category": "", "real_photo": [], "model_shot": [], "render": [], "other": []})

for path, meta in DATA.items():
    t = meta.get("type", "")
    if t not in KEEP: continue
    name = meta.get("design_name") or "unknown"
    key = norm(name) or "unknown"
    cat = meta.get("category") or ""
    d = designs[key]
    if not d["category"] and cat: d["category"] = cat
    d.setdefault(t, []).append(path)

# Group by category
by_cat = defaultdict(list)
for k, v in designs.items():
    by_cat[v["category"] or "uncategorised"].append((k, v))

print("=== Unique designs by category ===")
total_designs = 0
for cat, items in sorted(by_cat.items()):
    print(f"\n{cat.upper()} ({len(items)})")
    for name, info in sorted(items):
        rp = len(info["real_photo"]); ms = len(info["model_shot"]); rd = len(info["render"])
        print(f"  · {name[:60]:60s}  photo:{rp} model:{ms} render:{rd}")
        total_designs += 1

print(f"\nTotal unique designs found: {total_designs}")
print(f"Total usable images (photos+models+renders): "
      f"{sum(len(v['real_photo']) + len(v['model_shot']) + len(v['render']) for v in designs.values())}")

manifest = {"designs": {k: v for k, v in designs.items()}}
Path("/tmp/xevia-all/manifest.json").write_text(json.dumps(manifest, indent=2))
print(f"\nManifest saved → /tmp/xevia-all/manifest.json")
