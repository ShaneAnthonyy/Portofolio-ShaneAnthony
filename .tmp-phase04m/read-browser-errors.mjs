import { errors, delay, close } from '../scripts/dive-browser.mjs'
await delay(300)
console.log(JSON.stringify(errors, null, 2))
await close()
