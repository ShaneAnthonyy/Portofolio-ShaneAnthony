import { writeFile } from 'node:fs/promises'
import { fresh, approach, activate, until, unlocked, send, evaluate, socket, delay, startFrames, stopFrames, output, screenshot, close } from './dive-browser.mjs'

const evidence = []
try {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    await fresh({ width, height })
    await approach()
    const origin = await evaluate('performance.timeOrigin')
    const captures = [], acknowledgements = []
    const receive = event => {
      const message = JSON.parse(event.data)
      if (message.method !== 'Page.screencastFrame') return
      captures.push(message.params)
      acknowledgements.push(send('Page.screencastFrameAck', { sessionId: message.params.sessionId }))
    }
    socket.addEventListener('message', receive)
    await startFrames()
    await send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: 1200, maxHeight: 900, everyNthFrame: 1 })
    await delay(150)
    await activate()
    await until(unlocked)
    await delay(2200)
    await send('Page.stopScreencast')
    socket.removeEventListener('message', receive)
    await Promise.all(acknowledgements)
    const frames = await stopFrames(`film-${width}`)
    const samples = [frames[0], ...[.2, .4, .6, .8, 1].map(p => frames.find(f => f.progress >= p)), frames.at(-1)]
    const labels = ['before', '20', '40', '60', '80', '100', 'settled']
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i]
      const capture = captures.reduce((a, b) => Math.abs(a.metadata.timestamp * 1000 - origin - sample.time) < Math.abs(b.metadata.timestamp * 1000 - origin - sample.time) ? a : b)
      const file = `motion-${width}-${labels[i]}.jpg`
      await writeFile(new URL(file, output), Buffer.from(capture.data, 'base64'))
      evidence.push({ width, label: labels[i], file, timestampDifference: capture.metadata.timestamp * 1000 - origin - sample.time, sample })
    }
    console.log('CAPTURED', width, `${captures.length} actual rendered frames`)
  }
  await writeFile(new URL('motion-evidence.json', output), JSON.stringify(evidence, null, 2))
  await writeFile(new URL('motion-review.html', output), `<!doctype html><meta charset="utf-8"><title>Dive-to-Hero motion evidence</title><style>body{background:#071b26;color:#e8eff5;font:15px system-ui;margin:32px}section{display:flex;gap:14px;overflow:auto}figure{margin:0;min-width:280px;max-width:420px}img{width:100%}figcaption{padding:12px 0;line-height:1.6}</style><h1>Phase 04L · actual browser frames</h1><p>Desktop and touch emulation in headless Edge. Capturing frames slows rendering; performance measurements use separate runs.</p>${[1440,390].map(width => `<h2>${width}px</h2><section>${evidence.filter(e=>e.width===width).map(e=>`<figure><img src="${e.file}"><figcaption>${e.label}: progress ${(e.sample.progress*100).toFixed(1)}%<br>scrollY ${e.sample.y}; title center ${e.sample.titleCY.toFixed(2)}<br>Hero top ${e.sample.hero.top}; dock x ${e.sample.dock.x.toFixed(2)}</figcaption></figure>`).join('')}</section>`).join('')}`)
} finally {
  await close()
}
