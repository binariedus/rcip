import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from 'rollup-plugin-typescript2'

export default {
    input: 'src/lib/index.ts',
    output: [
        {
            file: 'dist/index.esm.js',
            format: 'esm',
            sourcemap: true
        },
        {
            file: 'dist/index.cjs.js',
            format: 'cjs',
            sourcemap: true
        }
    ],
    external: ['react', 'react-dom'],
    plugins: [
        peerDepsExternal(),
        resolve(),
        commonjs(),
        typescript({
            tsconfig: 'tsconfig.app.json',
            useTsconfigDeclarationDir: true
        })
    ]
}
