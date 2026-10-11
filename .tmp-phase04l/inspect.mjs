import {evaluate,socket} from '../scripts/dive-browser.mjs'
console.log(await evaluate(`({url:location.href, hidden:document.hidden, visibility:document.visibilityState, render:document.querySelector('.webgl-backdrop')?.dataset.renderState, text:document.body.innerText.slice(-200), root:document.querySelector('#root')?.innerHTML.slice(0,100)})`))
socket.close()
