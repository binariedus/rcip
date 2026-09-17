import { cpSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
function run(args, env = process.env) {
  execFileSync('npm', ['run', ...args], { stdio: 'inherit', env })
}
run(['build:lib'])
execFileSync('node', ['scripts/build-reference.mjs'], { stdio: 'inherit' })
execFileSync('node', ['scripts/measure-bundles.mjs'], { stdio: 'inherit' })
run(['build:pilot'], { ...process.env, VITE_RCIP_STATIC_DEMO: 'true' })
run(['docs:build'])
cpSync('examples/pilot-web/dist', 'docs/.vitepress/dist/demo', {
  recursive: true,
})
