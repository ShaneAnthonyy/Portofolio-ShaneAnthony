"""Phase 15G/15H: build Lite derivatives (fish-a/b/c + floor).

Re-encodes ONLY the embedded PNG image bufferViews at 512px.
Geometry buffers, accessors, materials, samplers, extensions, and all
other chunks are copied byte-identically, so UVs/transforms/animation
compatibility cannot change. flipY handling lives in the three.js loader
path, which is untouched.

Usage (run once from Portfolio-Shane/):
    python scripts/build-lite-fish.py

Outputs: public/aquarium/lite/{fish_a,fish_b,fish_c,floor}.glb
Requires: Python 3 + Pillow (stdlib json/struct otherwise).
"""

import io
import json
import struct
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "public" / "aquarium"
OUT_DIR = SRC_DIR / "lite"
FISH = ["fish_a", "fish_b", "fish_c"]
ASSETS = FISH + ["floor"]
TARGET = 512


def read_glb(path):
    data = path.read_bytes()
    assert data[0:4] == b"glTF", f"not a GLB: {path}"
    json_len = struct.unpack("<I", data[12:16])[0]
    js = json.loads(data[20 : 20 + json_len])
    bin_off = 20 + json_len
    bin_len = struct.unpack("<I", data[bin_off : bin_off + 4])[0]
    blob = data[bin_off + 8 : bin_off + 8 + bin_len]
    assert len(blob) == bin_len, f"truncated BIN in {path}"
    return js, blob


def write_glb(path, js, blob):
    raw = json.dumps(js, separators=(",", ":")).encode("utf-8")
    pad = (-len(raw)) % 4
    raw += b" " * pad
    out = bytearray()
    out += b"glTF"
    out += struct.pack("<I", 2)
    out += struct.pack("<I", 12 + 8 + len(raw) + 8 + len(blob))
    out += struct.pack("<I", len(raw)) + b"JSON" + raw
    bin_pad = (-len(blob)) % 4
    out += struct.pack("<I", len(blob) + bin_pad) + b"BIN\x00" + blob + b"\x00" * bin_pad
    path.write_bytes(bytes(out))


def main():
    OUT_DIR.mkdir(exist_ok=True)
    for name in ASSETS:
        src = SRC_DIR / f"{name}.glb"
        js, blob = read_glb(src)
        image_bvs = sorted({img["bufferView"] for img in js.get("images", [])})
        assert image_bvs, f"no images in {name}"
        # Geometry bufferViews are everything the images don't use.
        geo_bvs = [i for i in range(len(js["bufferViews"])) if i not in set(image_bvs)]
        new_blob = bytearray()
        offsets = {}
        new_lens = {}
        # Geometry first, byte-identical, original order.
        for i in geo_bvs:
            bv = js["bufferViews"][i]
            start = bv.get("byteOffset") or 0
            chunk = blob[start : start + bv["byteLength"]]
            assert len(chunk) == bv["byteLength"], f"short view {i} in {name}"
            offsets[i] = len(new_blob)
            new_lens[i] = len(chunk)
            new_blob += chunk
        # Images re-encoded at TARGET px, original order.
        for i in sorted(image_bvs):
            bv = js["bufferViews"][i]
            start = bv.get("byteOffset") or 0
            raw = blob[start : start + bv["byteLength"]]
            im = Image.open(io.BytesIO(raw))
            if max(im.size) > TARGET:
                scale = TARGET / max(im.size)
                im = im.resize(
                    (max(1, round(im.size[0] * scale)), max(1, round(im.size[1] * scale))),
                    Image.LANCZOS,
                )
            buf = io.BytesIO()
            im.save(buf, format="PNG", optimize=True)
            offsets[i] = len(new_blob)
            new_lens[i] = len(buf.getvalue())
            new_blob += buf.getvalue()
            print(f"  image bv{i}: {im.size[0]}x{im.size[1]} {len(buf.getvalue()) // 1024}KB")
        # Rewrite offsets/lengths; accessors untouched (geometry identical).
        for i, bv in enumerate(js["bufferViews"]):
            bv["byteOffset"] = offsets[i]
            bv["byteLength"] = new_lens[i]
        out = OUT_DIR / f"{name}.glb"
        write_glb(out, js, bytes(new_blob))
        # Report.
        before = src.stat().st_size
        after = out.stat().st_size
        print(f"{name}: {before / 1048576:.2f}MB -> {after / 1048576:.2f}MB")


if __name__ == "__main__":
    sys.exit(main())
