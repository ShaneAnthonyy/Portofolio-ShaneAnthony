import sys, json
import numpy as np
from PIL import Image

def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)

def ang(a, b):
    va = a / 255.0 * 2.0 - 1.0
    vb = b / 255.0 * 2.0 - 1.0
    na = np.linalg.norm(va, axis=-1, keepdims=True)
    nb = np.linalg.norm(vb, axis=-1, keepdims=True)
    cosang = np.sum(va * vb, axis=-1) / np.maximum(na[..., 0] * nb[..., 0], 1e-9)
    return np.degrees(np.arccos(np.clip(cosang, -1.0, 1.0)))

def stats(name, ref, cand):
    d = np.abs(ref - cand)
    a = ang(ref, cand)
    print(json.dumps({ 'pair': name,
        'maxAbs': round(float(d.max()), 3), 'meanAbs': round(float(d.mean()), 4),
        'p99Abs': round(float(np.quantile(d, 0.99)), 3),
        'maxAngDeg': round(float(a.max()), 4), 'meanAngDeg': round(float(a.mean()), 5),
        'p99AngDeg': round(float(np.quantile(a, 0.99)), 4),
        'fracAngGt1deg': round(float((a > 1.0).mean()), 6) }))

orig = load('public/aquarium/terrain/grass_ground/grass_ground_nor_gl_2k.png')
n1 = load('.tmp-phase05d/nor_2048_lossless.webp')
stats('N1-lossless2048-vs-orig2048', orig, n1)
ref512 = np.asarray(Image.open('public/aquarium/terrain/grass_ground/grass_ground_nor_gl_2k.png').convert('RGB').resize((512, 512), Image.BILINEAR)).astype(np.float32)
n2 = load('.tmp-phase05d/nor_512_lossless.webp')
stats('N2-lossless512-vs-PILbilinear512', ref512, n2)
for q in (90, 80, 70):
    p = f'.tmp-phase05d/nor_512_q{q}.webp'
    Image.open('public/aquarium/terrain/grass_ground/grass_ground_nor_gl_2k.png').convert('RGB').resize((512, 512), Image.LANCZOS).save(p, 'WEBP', quality=q, method=6)
    stats(f'N3-lossy512-q{q}-vs-PILbilinear512', ref512, load(p))
print('sizes:', {f: __import__('os').path.getsize('.tmp-phase05d/' + f) for f in ['nor_2048_lossless.webp', 'nor_512_lossless.webp', 'nor_512_q90.webp', 'nor_512_q80.webp', 'nor_512_q70.webp']})
