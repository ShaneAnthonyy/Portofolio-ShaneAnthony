const fs = require('fs')
const vm = require('vm')
const text = fs.readFileSync(require('path').join(process.cwd(),'src','components','Projects.jsx'), 'utf8')
const piece = text.slice(text.indexOf('function distance('), text.indexOf('export default function Projects()'))
const scope = {}
vm.createContext(scope)
vm.runInContext(piece + '\nthis.api = { distance, clamp, interpolate, getLayout, geometry }', scope)
const { distance, getLayout, geometry, interpolate } = scope.api
const widths = [375, 390, 568, 768, 900, 1024, 1440, 1920]
let assertions = 0
function assert(cond, message) { assertions++; if (!cond) throw new Error(message) }
for (const width of widths) {
  const layout = getLayout(width)
  assert(layout.stageHeight > 0, `${width} stage height`)
  const pos0 = geometry(0, layout)
  const left = geometry(-1, layout)
  const right = geometry(1, layout)
  assert(pos0.width <= width+0.1 && pos0.width >= right.width, `${width} width constraint`)
  assert(left.x >= -0.1 && right.x+right.width <= width+0.1, `${width} side overflow`)
  for (const dir of [-1, 1]) {
    const oldStart=geometry(0,layout)
    const oldEnd=geometry(-dir,layout)
    const incomingStart=geometry(dir,layout)
    const incomingEnd=geometry(0,layout)
    for (const t of [0,0.1,0.25,0.5,0.75,0.9,1]) {
      const a={},b={}
      for (const key of Object.keys(oldStart)) {
        a[key]=interpolate(oldStart[key],oldEnd[key],t)
        b[key]=interpolate(incomingStart[key],incomingEnd[key],t)
      }
      assert(a.width>0&&b.width>0,`${width}:${dir}:${t} nonzero`)
      assert(Math.abs(a.reveal-(1-t))<0.001,`${width}:${dir}:${t} outgoing panel`)
      assert(Math.abs(b.reveal-t)<0.001,`${width}:${dir}:${t} incoming panel`)
      assert(a.alpha>=0&&b.alpha>=0,`${width}:${dir}:${t} visible`)
      if (!layout.below) {
        const outgoingRight=a.mediaWidth + a.reveal*layout.bodyWidth
        const incomingRight=b.mediaWidth + b.reveal*layout.bodyWidth
        assert(Math.abs(outgoingRight-a.width)<1.1,`${width}:${dir}:${t} outgoing panel aligned ${outgoingRight}/${a.width}`)
        assert(Math.abs(incomingRight-b.width)<1.1,`${width}:${dir}:${t} incoming panel aligned ${incomingRight}/${b.width}`)
      }
    }
    assert(dir===1?oldEnd.x+oldEnd.width/2<oldStart.x+oldStart.width/2:oldEnd.x+oldEnd.width/2>oldStart.x+oldStart.width/2,`${width}:${dir} correct outgoing direction`)
    assert(dir===1?incomingStart.x+incomingStart.width/2>incomingEnd.x+incomingEnd.width/2:incomingStart.x+incomingStart.width/2<incomingEnd.x+incomingEnd.width/2,`${width}:${dir} incoming direction`)
  }
}
console.log(`Geometry checks: ${assertions} passed across ${widths.length} widths, both navigation directions and 7 sampled progress points`)
