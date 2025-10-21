import {defineConfig, type TerserOptions, type UserConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }): UserConfig => {
    const isDev = mode === 'development';

    const aliases = {
        '@': path.resolve(__dirname, 'src'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@entities': path.resolve(__dirname, './src/entities'),
        '@widgets': path.resolve(__dirname, './src/widgets'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@app': path.resolve(__dirname, './src/app'),
        '@ui': path.resolve(__dirname, './src/ui'),
        '@assets': path.resolve(__dirname, './src/ui/assets'),
        '@chartsPage': path.resolve(__dirname, './src/features/chartsPage'),
        '@login': path.resolve(__dirname, './src/features/login'),
        '@scenario': path.resolve(__dirname, './src/features/scenarioEditor'),
    };

    const rollupOptions = {
        output: {
            manualChunks: {
                'react-core': ['react', 'react-dom'],
                'react-router': ['react-router-dom'],
                'redux-core': ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
                charts: ['echarts', 'echarts-for-react'],
                utils: ['axios', 'axios-retry', 'lodash', 'classnames', 'zod', 'qs'],
                'ui-libs': [
                    'lucide-react',
                    'react-hot-toast',
                    '@xyflow/react',
                    'localforage',
                ],
                files: ['xlsx'],
            },
            entryFileNames: 'assets/[name].[hash].js',
            chunkFileNames: 'assets/[name].[hash].js',
            assetFileNames: 'assets/[name].[hash].[ext]',
        },
    };

    // DEV конфигурация
    if (isDev) {
        return {
            plugins: [react()],
            base: '/',
            resolve: { alias: aliases },
            server: {
                port: 5173,
                strictPort: true,
                sourcemapIgnoreList: false, // ⬅️ ВАЖНО для debugger
            },
            build: {
                outDir: 'dist',
                assetsDir: 'assets',
                minify: false, // ⬅️ Отключаем минификацию в dev
                sourcemap: true,
                rollupOptions,
                chunkSizeWarningLimit: 1000,
                target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
                cssCodeSplit: true,
                cssMinify: false, // ⬅️ Отключаем минификацию CSS в dev
            },
            optimizeDeps: {
                include: [
                    'react',
                    'react-dom',
                    'react-router-dom',
                    '@reduxjs/toolkit',
                    'echarts',
                ],
            },
            preview: {
                port: 4173,
                strictPort: true,
            },
            esbuild: {
                drop: [], // ⬅️ НЕ удаляем console/debugger в dev
            },
        };
    }

    // Terser опции для продакшена
    const terserOptions = {
        compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info'],
        },
        format: {
            comments: false,
        },
    };

    // PROD конфигурация
    return {
        plugins: [react()],
        base: '/',
        resolve: { alias: aliases },
        server: {
            port: 5173,
            strictPort: true,
        },
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            minify: 'terser',
            terserOptions: terserOptions as TerserOptions,
            sourcemap: 'hidden',
            rollupOptions,
            chunkSizeWarningLimit: 1000,
            target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
            cssCodeSplit: true,
            cssMinify: true,
        },
        optimizeDeps: {
            include: [
                'react',
                'react-dom',
                'react-router-dom',
                '@reduxjs/toolkit',
                'echarts',
            ],
        },
        preview: {
            port: 4173,
            strictPort: true,
        },
    };
});