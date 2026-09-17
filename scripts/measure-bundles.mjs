import { build } from 'esbuild'
import { gzipSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
const entries = ['core', 'react', 'assist', 'explorer']
let report =
  '| Entry point | Minified JavaScript | Gzip |\n| --- | ---: | ---: |\n'
for (const entry of entries) {
  const output = await build({
    stdin: {
      contents: `import * as api from './packages/rcip/dist/${entry}/index.js'; globalThis.rcipExample = api;`,
      resolveDir: process.cwd(),
    },
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: ['react', 'react/jsx-runtime'],
    metafile: true,
  })
  const data = output.outputFiles[0].contents
  report += `| \`@binaried/rcip/${entry}\` | ${(data.length / 1024).toFixed(1)} KiB | ${(gzipSync(data).length / 1024).toFixed(1)} KiB |\n`
  if (
    entry === 'core' &&
    Object.keys(output.metafile.inputs).some((path) =>
      /\/(react|assist|explorer)\//.test(path),
    )
  ) {
    throw new Error('Core unexpectedly contains an optional UI surface.')
  }
}
const minimal = await build({
  stdin: {
    contents:
      "import { defineRcipScope } from './packages/rcip/dist/index.js'; globalThis.rcipExample = defineRcipScope({id:'example',title:'Example',description:'Example'});",
    resolveDir: process.cwd(),
  },
  bundle: true,
  minify: true,
  write: false,
  format: 'esm',
  external: ['react', 'react/jsx-runtime'],
  metafile: true,
})
const retainedInputs = Object.values(minimal.metafile.outputs).flatMap(
  (output) =>
    Object.entries(output.inputs)
      .filter(([, contribution]) => contribution.bytesInOutput > 0)
      .map(([path]) => path),
)
if (
  retainedInputs.some((path) =>
    /node_modules\/ajv|\/(assist|explorer)\//.test(path),
  )
)
  throw new Error(
    'Unused runtime or optional UI retained in definition-only import.',
  )
mkdirSync('docs/generated', { recursive: true })
writeFileSync('docs/generated/bundles.md', report)
console.log(report)
console.log('Definition-only tree-shaking and core/UI isolation passed.')
