import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'

const files=['src/App.jsx','src/components/Navbar.jsx','src/components/Hero.jsx','src/components/HeroAquarium.jsx','src/components/AquariumDivePrototype.jsx','src/scenes/heroAquarium.js','src/animation/worldTime.js','src/main.jsx','src/index.css','index.html']
for(const file of files){
 const source=await readFile(new URL('../'+file,import.meta.url),'utf8')
 assert.doesNotMatch(source,/WORLD_TIME_PREVIEW|data-theme|prefers-color-scheme|setTheme|themeObs|toggleTheme|theme-toggle/,file+' has no active legacy appearance consumer')
 if(file!=='src/main.jsx')assert.doesNotMatch(source,/shane-theme/,file+' has no obsolete preference access')
 else {assert.match(source,/localStorage\.removeItem\('shane-theme'\)/);assert.doesNotMatch(source,/getItem|setItem/)}
}
assert.match(await readFile(new URL('../index.html',import.meta.url),'utf8'),/name="color-scheme" content="dark"/)
console.log('PASS production appearance source: no preview gate or manual-theme consumer; only scoped obsolete-key retirement')

if(process.argv.includes('--browser')){
 const {fresh,evaluate,send,until,click,delay,close,approach,activate,unlocked,setWorldTime,errors}=await import('./browser.mjs')
 const rows=[]
 const state=()=>evaluate(`(()=>{const b=document.querySelector('.hero__replay'),s=getComputedStyle(b),l=getComputedStyle(b.querySelector('span'));return{legacyAttribute:document.documentElement.hasAttribute('data-theme'),legacyKey:localStorage.getItem('shane-theme'),unrelated:localStorage.getItem('appearance-test-unrelated'),live:[...document.querySelectorAll('[aria-label="Time mode"] button')].find(b=>b.textContent==='Live')?.getAttribute('aria-pressed'),output:document.querySelector('.world-time-panel output')?.value,minutes:Number(document.querySelector('.hero-aquarium').dataset.worldTime),local:new Date().getHours()*60+new Date().getMinutes()+new Date().getSeconds()/60,manualControls:document.querySelectorAll('[aria-label="Switch to light mode"],[aria-label="Switch to dark mode"],.theme-toggle').length,themeMutations:window.__appearanceThemeMutations,legacyAccess:window.__appearanceLegacyAccess,replay:{rect:b.getBoundingClientRect().toJSON(),background:s.backgroundColor,border:s.borderWidth,shadow:s.boxShadow,labelOpacity:l.opacity,outline:s.outline,focus:b.matches(':focus-visible')}}})()`)
 const seed=await send('Page.addScriptToEvaluateOnNewDocument',{source:`
 localStorage.setItem('appearance-test-unrelated','preserve');
 window.__appearanceThemeMutations=[];window.__appearanceLegacyAccess=[];
 new MutationObserver(records=>{for(const r of records)if(r.target===document.documentElement)window.__appearanceThemeMutations.push(document.documentElement.getAttribute('data-theme'))}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-theme']});
 for(const method of ['getItem','setItem','removeItem']){const original=Storage.prototype[method];Storage.prototype[method]=function(key,...args){if(key==='shane-theme')window.__appearanceLegacyAccess.push(method);return original.call(this,key,...args)}}
 `})
 const controller=async()=>{await evaluate(`document.querySelector('.world-time-trigger').click()`);await until(`!!document.querySelector('.world-time-panel')`)}
 const closeController=()=>evaluate(`document.querySelector('.world-time-panel__head button').click()`)
 try{
  for(const width of [1440,390])for(const legacyTheme of [undefined,'light','dark','invalid']){
   const colorScheme=legacyTheme==='light'?'light':'dark'
   await fresh({width,height:width===390?844:900,legacyTheme,colorScheme,beforeEnter:async()=>{
    assert.equal(await evaluate(`document.documentElement.hasAttribute('data-theme')`),false)
    assert.equal(await evaluate(`getComputedStyle(document.documentElement).colorScheme`),'dark')
   }})
   await controller();const start=await state()
   assert.equal(start.live,'true');assert.ok(Math.abs(((start.minutes-start.local+2160)%1440)-720)<1.1)
   assert.equal(start.legacyKey,null);assert.equal(start.legacyAttribute,false);assert.equal(start.manualControls,0);assert.equal(start.unrelated,'preserve');assert.deepEqual(start.themeMutations,[])
   assert.ok(start.legacyAccess.filter(m=>m==='setItem').length<=(legacyTheme===undefined?0:1),'no writes beyond the optional test seed')
   assert.equal(start.legacyAccess.filter(m=>m==='getItem').length,1,'only this state probe reads the obsolete preference')
   assert.equal(start.legacyAccess.filter(m=>m==='removeItem').length,1,'startup retires the key once')
   await closeController()
   if(width===1440&&legacyTheme==='light'){
    await approach();await activate();await until(unlocked);await setWorldTime(1080)
    for(const selector of ['#about','#skills','#projects','#contact','.footer','#home']){
     await evaluate(`document.querySelector('${selector}').scrollIntoView({behavior:'instant'})`);await delay(200)
     assert.equal((await state()).minutes,1080,'Manual selection survives navigation')
    }
    await evaluate(`document.querySelector('#contact').scrollIntoView({behavior:'instant'});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__appearanceCopied=value}}})`)
    await delay(750);await click('.contact__copy');await until(`document.querySelector('.contact__copy').textContent.includes('Copied')`)
    assert.equal(await evaluate(`window.__appearanceCopied`),await evaluate(`document.querySelector('.contact__value').textContent`))
    await until(`document.querySelector('.contact__copy').textContent.trim()==='Copy'`,4000)
    await send('Page.reload',{ignoreCache:false});await until(`!!document.querySelector('.loading-screen__enter:not(:disabled)')`,90000);await click('.loading-screen__enter');await until(`!document.querySelector('.loading-screen')`)
    await controller();const reloaded=await state();assert.equal(reloaded.live,'true');assert.ok(Math.abs(((reloaded.minutes-reloaded.local+2160)%1440)-720)<1.1);assert.equal(reloaded.unrelated,'preserve');rows.push({reload:reloaded});await closeController()
   }
   await approach();await activate();await until(unlocked)
   await setWorldTime(720);await evaluate(`scrollTo({top:innerHeight*.15,behavior:'instant'});document.activeElement?.blur()`);await delay(300)
   const replay=(await state()).replay
   assert.equal(replay.background,'rgba(0, 0, 0, 0)');assert.equal(replay.border,'0px');assert.equal(replay.shadow,'none');assert.equal(replay.labelOpacity,'0.9');assert.ok(replay.rect.height>=44)
   for(let i=0;i<25;i++){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});if(await evaluate(`document.activeElement===document.querySelector('.hero__replay')`))break}
   await until(`getComputedStyle(document.querySelector('.hero__replay-label')).opacity==='0.95'`,3000)
   const focused=(await state()).replay;assert.equal(focused.focus,true);assert.match(focused.outline,/solid 2px/);assert.equal(focused.labelOpacity,'0.95');assert.deepEqual(focused.rect,replay.rect)
   rows.push({width,legacyTheme:legacyTheme??'absent',colorScheme,start,replay,focused})
   console.log('PASS production startup / legacy storage / frameless replay',width,legacyTheme??'absent',colorScheme)
  }
  await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:seed.identifier})
  const blocked=await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('shane-theme','light');const remove=Storage.prototype.removeItem;Storage.prototype.removeItem=function(key){if(key==='shane-theme')throw new DOMException('Blocked','SecurityError');return remove.call(this,key)}`})
  await fresh({width:390,height:844,reduced:true});await controller();const unavailable=await state();assert.equal(unavailable.live,'true');assert.equal(unavailable.legacyKey,'light','blocked retirement is harmless; the old value stays ignored');assert.equal(unavailable.legacyAttribute,false);assert.equal(unavailable.manualControls,0);rows.push({blockedRemoval:unavailable})
  await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:blocked.identifier})
  assert.equal(errors.filter(e=>!JSON.stringify(e).includes('favicon')).length,0,JSON.stringify(errors))
 }finally{await writeFile(new URL('./measurements/appearance-migration.json',import.meta.url),JSON.stringify({rows,errors},null,2));await close()}
}
