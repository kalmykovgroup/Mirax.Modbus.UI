import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

import MakeCert from 'vite-plugin-mkcert';
import path from 'path';

// @ts-ignore
export default defineConfig({
    plugins: [
        react(),
        MakeCert()
    ],

    server: {
        port: 5173,
    },
    resolve: {

        alias: {
            "@": path.resolve(__dirname, "src"),
            '@shared': path.resolve(__dirname, './src/shared'),
            '@features': path.resolve(__dirname, './src/features'),
            '@entities': path.resolve(__dirname, './src/entities'),
            '@widgets': path.resolve(__dirname, './src/widgets'),
            '@pages': path.resolve(__dirname, './src/pages'),
            '@app': path.resolve(__dirname, './src/app'),
            '@ui': path.resolve(__dirname, './src/ui'),
            '@assets': path.resolve(__dirname, './src/ui/assets'),
        },
    },
});