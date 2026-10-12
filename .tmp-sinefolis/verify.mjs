import { writeFile, mkdir } from 'node:fs/promises'
import { fresh, approach, activate, until, unlocked, send, evaluate, delay, scroll, close, errors } from '../scripts/dive-browser.mjs'

const output = new URL('./', import.meta.url)
await mkdir(output, { recursive: true })
const out = {}
try {
  await fresh({ width: 1440, height: 900 })
  await approach()
  await activate()
  await until(unlocked)
  await evaluate(`document.querySelector('#projects').scrollIntoView({block:'start',behavior:'instant'})`)
  await delay(1200)
  out.banner = await evaluate(`(() => {
    const card = document.querySelector('.tidal-card[data-position="0"]');
    const img = card.querySelector('.tidal-card__media img');
    const frame = card.querySelector('.tidal-card__prototype-frame');
    const r = img ? img.getBoundingClientRect().toJSON() : null;
    return { index: card.dataset.projectIndex, imgSrc: img?.getAttribute('src'), imgComplete: img?.complete && img?.naturalWidth > 0, natural: img ? [img.naturalWidth, img.naturalHeight] : null, rect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null, fit: img ? getComputedStyle(img).objectFit + ' ' + getComputedStyle(img).objectPosition : null, bannerIframe: !!frame, stageIframes: document.querySelectorAll('.tidal-stage iframe').length };
  })()`)
  console.log('BANNER', JSON.stringify(out.banner))
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
  await writeFile(new URL('featured-1440.jpg', output), Buffer.from(data, 'base64'))
  await evaluate(`document.querySelector('.tidal-card[data-position="0"]').click()`)
  await until('!!document.querySelector("[role=dialog]")')
  await delay(1500)
  out.modal = await evaluate(`(() => {
    const dlg = document.querySelector('[role=dialog]');
    const top = dlg.querySelector('.slider-card__banner img');
    const embed = dlg.querySelector('.case-study__section--prototype iframe');
    const fb = dlg.querySelector('.case-study__section--prototype a[href^="https://"]');
    const r = top ? top.getBoundingClientRect().toJSON() : null;
    return { topSrc: top?.getAttribute('src'), topComplete: top?.complete && top?.naturalWidth > 0, rect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null, embedSrc: embed?.getAttribute('src')?.slice(0, 60), embedLoading: embed?.getAttribute('loading'), fallback: !!fb, modalIframes: dlg.querySelectorAll('iframe').length };
  })()`)
  console.log('MODAL', JSON.stringify(out.modal))
  await evaluate(`document.querySelector('.case-study__section--prototype')?.scrollIntoView({block:'center',behavior:'instant'})`)
  await delay(800)
  const shot2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
  await writeFile(new URL('modal-embed-1440.jpg', output), Buffer.from(shot2.data, 'base64'))
  await evaluate(`document.querySelector('.slider-detail__close').click()`)
  await delay(400)

  await fresh({ width: 390, height: 844 })
  await approach()
  await activate()
  await until(unlocked)
  await evaluate(`document.querySelector('#projects').scrollIntoView({block:'start',behavior:'instant'})`)
  await delay(1200)
  out.mobile = await evaluate(`(() => {
    const card = document.querySelector('.tidal-card[data-position="0"]');
    const img = card.querySelector('.tidal-card__media img');
    const r = img ? img.getBoundingClientRect().toJSON() : null;
    return { imgSrc: img?.getAttribute('src'), ok: img?.complete && img?.naturalWidth > 0, rect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null, fit: img ? getComputedStyle(img).objectFit + ' ' + getComputedStyle(img).objectPosition : null, overflow: document.documentElement.scrollWidth > innerWidth };
  })()`)
  console.log('MOBILE', JSON.stringify(out.mobile))
  const shot3 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
  await writeFile(new URL('featured-390.jpg', output), Buffer.from(shot3.data, 'base64'))
  out.errors = [...errors]
  await writeFile(new URL('verify.json', output), JSON.stringify(out, null, 2))
} finally {
  await close()
}
