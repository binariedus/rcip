import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from 'rollup-plugin-typescript2'

export default {
    input: 'src/lib/index.ts',
    external: ['react', 'react-dom'],
    output: [
        { file: 'dist/index.esm.js', format: 'es' },
        { file: 'dist/index.cjs.js', format: 'cjs', exports: 'named' }
    ],
    plugins: [
        resolve(),
        commonjs(),
        typescript({
            tsconfig: 'tsconfig.app.json',
            useTsconfigDeclarationDir: true,
        })
    ]
}
