import { mkdir, writeFile } from 'node:fs/promises'
import { fresh, approach, activate, until, unlocked, send, socket, evaluate, delay, scroll, close, errors } from './dive-browser.mjs'

const label = process.argv[2] || 'after'
const output = new URL(`../.tmp-phase04m/${label}/`, import.meta.url)
await mkdir(output, { recursive: true })
const probe = await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__surfaceDraws = { hero: 0, dive: 0, created: 0, lost: 0 };
  window.__surfaceRenderers = [];
  const contexts = new WeakSet();
  for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const draw = type.prototype[name];
      if (!draw) continue;
      type.prototype[name] = function(...args) {
        if (!contexts.has(this)) {
          contexts.add(this); window.__surfaceDraws.created++;
          const info = this.getExtension('WEBGL_debug_renderer_info');
          window.__surfaceRenderers.push(info ? this.getParameter(info.UNMASKED_RENDERER_WEBGL) : this.getParameter(this.RENDERER));
          this.canvas.addEventListener('webglcontextlost', () => window.__surfaceDraws.lost++);
        }
        if (this.canvas.closest('.hero-aquarium')) window.__surfaceDraws.hero++;
        if (this.canvas.closest('.webgl-backdrop')) window.__surfaceDraws.dive++;
        return draw.apply(this, args);
      };
    }
  }
` })
const stages = [0, .15, .3, .45, .6, .75, .9, 1]
const reports = []
const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]))
const quantile = (a, p) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]
try {
  await send('Performance.enable')
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    await fresh({ width, height })
    await approach()
    await activate()
    await until(unlocked)
    await delay(1200)
    const heightPx = await evaluate(`document.querySelector('#home').offsetHeight`)
    const trace = []
    const receive = event => {
      const message = JSON.parse(event.data)
      if (message.method === 'Tracing.dataCollected') trace.push(...message.params.value)
    }
    socket.addEventListener('message', receive)
    await send('Tracing.start', { categories: 'devtools.timeline', transferMode: 'ReportEvents' })
    const before = await metrics()
    const frames = await evaluate(`new Promise(resolve => {
      const frames = []; let start;
      const tick = now => {
        start ??= now;
        const t = Math.min((now - start) / 6000, 1);
        const p = t <= .5 ? t * 2 : (1 - t) * 2;
        window.scrollTo({ top: p * ${heightPx}, behavior: 'instant' });
        const hero = document.querySelector('.hero-aquarium');
        frames.push({ t: now, p, y: scrollY, hero: hero.dataset.state, dive: document.querySelector('.webgl-backdrop')?.dataset.renderState, draws: {...window.__surfaceDraws} });
        if (t < 1) requestAnimationFrame(tick); else resolve(frames);
      }; requestAnimationFrame(tick);
    })`)
    const after = await metrics()
    const traceDone = new Promise(resolve => {
      const listener = event => {
        if (JSON.parse(event.data).method === 'Tracing.tracingComplete') {
          socket.removeEventListener('message', listener); resolve();
        }
      }; socket.addEventListener('message', listener);
    })
    await send('Tracing.end')
    await traceDone
    socket.removeEventListener('message', receive)
    const dt = frames.slice(1).map((f, i) => f.t - frames[i].t)
    const work = name => trace.filter(e => e.name === name && e.ph === 'X').reduce((total, e) => total + (e.dur || 0), 0) / 1000
    const summary = {
      width, height, frames: frames.length, medianMs: quantile(dt, .5), p95Ms: quantile(dt, .95), longFrames: dt.filter(t => t > 50).length,
      scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000,
      layoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000,
      styleMs: (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000,
      paintMs: work('Paint'), compositeMs: work('Layerize'),
      heapDeltaBytes: after.JSHeapUsedSize - before.JSHeapUsedSize,
      drawCalls: { hero: frames.at(-1).draws.hero - frames[0].draws.hero, dive: frames.at(-1).draws.dive - frames[0].draws.dive },
      dualDrawFrames: frames.slice(1).filter((f, i) => f.draws.hero > frames[i].draws.hero && f.draws.dive > frames[i].draws.dive).length,
      overlapMs: frames.slice(1).reduce((total, f, i) => total + (frames[i].hero === 'running' && frames[i].dive === 'running' ? f.t - frames[i].t : 0), 0),
      contexts: frames.at(-1).draws,
      renderers: await evaluate('window.__surfaceRenderers'),
    }
    await writeFile(new URL(`${width}-frames.json`, output), JSON.stringify(frames))
    const states = []
    for (const [direction, values] of [['forward', stages], ['reverse', [...stages].reverse()]]) {
      for (const p of values) {
        await scroll(p * heightPx)
        await delay(220)
        const state = await evaluate(`(() => {
          const h = document.querySelector('#home'); const a = document.querySelector('.hero-aquarium');
          const title = document.querySelector('.hero__title');
          return { p: ${p}, y: scrollY, heroTop: h.getBoundingClientRect().top, titleTop: title.getBoundingClientRect().top, titleTransform: getComputedStyle(title).transform, aquarium: {...a.dataset}, world: document.querySelector('.hero-surface')?.getBoundingClientRect().toJSON(), surface: document.querySelector('.hero-surface')?.getAttribute('style'), overflow: document.documentElement.scrollWidth > innerWidth, draws: {...window.__surfaceDraws} };
        })()`)
        const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
        const file = `${width}-${direction}-${Math.round(p * 100)}.jpg`
        await writeFile(new URL(file, output), Buffer.from(data, 'base64'))
        states.push({ direction, file, ...state })
      }
    }
    reports.push({ ...summary, states })
    console.log(label, summary)
  }
  await writeFile(new URL('profile.json', output), JSON.stringify({ reports, errors }, null, 2))
} finally {
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: probe.identifier })
  await close()
}
