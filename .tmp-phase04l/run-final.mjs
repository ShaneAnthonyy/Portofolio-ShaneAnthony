import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
const results = []
for (const script of ['check-arrival.mjs', 'check-hero.mjs', 'check-dive-mobile.mjs', 'check-dive-landing.mjs', 'check-dive-replay.mjs', 'check-dive-webgl.mjs', 'capture-dive-motion.mjs']) {
  const run = spawnSync(process.execPath, ['scripts/' + script], { encoding: 'utf8', env: { ...process.env, DIVE_URL: 'http://127.0.0.1:4173/' } })
  results.push({ script, exitCode: run.status, output: run.stdout, error: run.error?.message || run.stderr })
  writeFileSync('.tmp-phase04l/final-checks.json', JSON.stringify(results, null, 2))
  console.log(script, 'EXIT', run.status, '\n' + run.stdout + run.stderr)
  if (run.status !== 0) process.exit(run.status || 1)
}
