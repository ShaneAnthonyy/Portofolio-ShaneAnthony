from pathlib import Path
import hashlib,json,difflib,subprocess
root=Path(__file__).resolve().parent.parent;out=Path(__file__).resolve().parent
manifest=json.loads((out/'source-before.json').read_text());changed=[]
for rel,data in manifest.items():
 p=root/rel;assert p.is_file(),f'Missing {rel}'
 if hashlib.sha256(p.read_bytes()).hexdigest()!=data['sha256']:changed.append(rel)
assert set(changed)=={'src/components/AquariumDivePrototype.jsx','src/components/FishSkill.jsx','src/components/Skills.jsx'},changed
old=(out/'AquariumDivePrototype.jsx.before').read_text(encoding='utf-8');new=(root/'src/components/AquariumDivePrototype.jsx').read_text(encoding='utf-8')
replacement='''          for (const resource of [trans.sceneRT, trans.skyRT, trans.quadScene.children[0].geometry, trans.quadMat]) {
            resource.dispose()
            const index = disposables.indexOf(resource)
            if (index >= 0) disposables.splice(index, 1)
          }'''
assert new.replace(replacement,'          trans.sceneRT.dispose()\n          trans.skyRT.dispose()')==old
old_skills=(out/'Skills.jsx.before').read_text(encoding='utf-8');new_skills=(root/'src/components/Skills.jsx').read_text(encoding='utf-8')
assert new_skills.replace('<img loading="lazy" decoding="async" src={d.img}','<img src={d.img}')==old_skills
assert 'Current highest proficiency: <strong>Intermediate</strong>'in new_skills
for name in ['check-projects','check-dive-landing','check-dive-webgl','check-dive-replay','check-dive-interruptions','check-dive-mobile','check-surface-integration','check-audio','check-forest-lifecycle']:assert (out/f'{name}.mjs').read_bytes()==(root/'.tmp-phase05q'/f'{name}.mjs').read_bytes(),f'Modified existing assertions: {name}'
patch=''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='Phase06A-before/AquariumDivePrototype.jsx',tofile='Phase06A-after/AquariumDivePrototype.jsx'))+''.join(difflib.unified_diff(old_skills.splitlines(True),new_skills.splitlines(True),fromfile='Phase06A-before/Skills.jsx',tofile='Phase06A-after/Skills.jsx'))
(out/'phase06a-only.patch').write_text(patch,encoding='utf-8')
result={'changedSourceFiles':changed,'preservedSourceAssetAndConfigFiles':len(manifest)-len(changed),'assetsPreserved':True,'cameraCharactersForestShadersChoreographyAndLegendUnchanged':True,'originalAssertionsUnchanged':True,'diffCheckExitCode':subprocess.run(['git','diff','--check'],cwd=root).returncode}
(out/'measurements/preservation.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
