import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@lib': resolve(__dirname, 'src/lib'),
            '@examples': resolve(__dirname, 'src/examples')
        }
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/lib/index.ts'),
            name: 'rcip',
            fileName: (format) => `rcip.${format}.js`,
            formats: ['es', 'cjs']
        },
        rollupOptions: {
            external: ['react', 'react-dom']
        }
    }
});
