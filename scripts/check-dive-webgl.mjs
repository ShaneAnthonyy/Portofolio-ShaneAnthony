import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { fresh, approach, activate, until, unlocked, send, evaluate, delay, snap, close, url, output } from './dive-browser.mjs'

const probe = await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__diveDraws = { dive: 0, hero: 0 };
  for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const draw = type.prototype[name];
      if (!draw) continue;
      type.prototype[name] = function(...args) {
        const host = this.canvas.parentElement;
        if (host?.classList.contains('hero-aquarium')) window.__diveDraws.hero++;
        if (host?.classList.contains('webgl-backdrop')) window.__diveDraws.dive++;
        return draw.apply(this, args);
      };
    }
  }
` })
const counts = () => evaluate('({...window.__diveDraws})')
try {
  await fresh()
  await approach()
  await delay(600)
  const before = await counts()
  await delay(700)
  const waiting = await counts()
  assert.ok(before.hero > 0 && waiting.hero === before.hero && waiting.dive > before.dive, 'prewarm prepares Hero once while Dive continues')
  await evaluate(`window.__preparedHeroCanvas = document.querySelector('.hero-aquarium canvas'); true`)
  await activate()
  await until(unlocked)
  await delay(500)
  const landed = await counts()
  await delay(700)
  const after = await counts()
  assert.ok(after.hero > landed.hero && after.dive === landed.dive, 'only Hero renders after handoff')
  assert.equal(await evaluate(`window.__preparedHeroCanvas === document.querySelector('.hero-aquarium canvas')`), true, 'prepared canvas survives landing without recreation or flash')
  await writeFile(new URL('webgl-draws.json', output), JSON.stringify({ before, waiting, landed, after, state: await snap() }, null, 2))
  console.log('PASS WebGL handoff', { before, waiting, landed, after })
  await send('Page.navigate', { url: new URL('?webgl-poc=1', url).href })
  await until(`!!document.querySelector('canvas')`)
  await evaluate(`window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })`)
  await until(`!!document.querySelector('.hero__title')`)
  assert.match(await evaluate(`document.querySelector('.hero__title').textContent`), /Shane Anthony/)
  console.log('PASS standalone Dive reveal remains functional')
} finally {
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: probe.identifier })
  await close()
}
