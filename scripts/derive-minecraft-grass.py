from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parent.parent
source=root/'public/aquarium/terrain/grass_ground/Minecraft_Ground.jpg'
target=root/'public/aquarium/terrain/grass_ground/minecraft_grass_v2.png'
image=Image.open(source)
assert image.size==(1920,800)
tile=image.crop((0,0,800,800)).resize((20,20),Image.NEAREST)
tile.save(target,optimize=True)
assert tile.size==(20,20)
assert target.stat().st_size<1024
print(target.name,target.stat().st_size,'bytes')
