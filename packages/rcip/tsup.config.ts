import { defineConfig } from 'tsup'

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    'assist/index': 'src/assist/index.tsx',
    index: 'src/index.ts',
    'core/index': 'src/core/index.ts',
    'explorer/index': 'src/explorer/index.tsx',
    'react/index': 'src/react/index.tsx',
  },
  external: ['react', 'react/jsx-runtime'],
  format: ['esm', 'cjs'],
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' }
  },
  sourcemap: true,
  splitting: false,
  target: 'es2022',
  treeshake: true,
  tsconfig: 'tsconfig.build.json',
})
