from PIL import Image, ImageChops
import numpy as np

for c in ['original', 'n1', 'n2', 'n2b', 'q90']:
    vals = []
    for i in range(2):
        a = Image.open(f'.tmp-phase05d/shots/{c}-motion{i}.jpg').convert('L')
        b = Image.open(f'.tmp-phase05d/shots/{c}-motion{i+1}.jpg').convert('L')
        vals.append(round(float(np.asarray(ImageChops.difference(a, b)).mean()), 2))
    print(c, vals)
