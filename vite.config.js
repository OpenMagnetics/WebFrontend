import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import viteCompression from 'vite-plugin-compression';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
    // Include WASM-related files as assets so they're copied to the build output
    assetsInclude: ['**/*.wasm'],
    build: {
        rollupOptions: {
            output: {
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
                
                assetFileNames: ({name}) => {
                    if (/\.(gif|jpe?g|png|svg)$/.test(name ?? '')){
                        return 'assets/images/[name]-[hash][extname]';
                    }
                    
                    if (/\.css$/.test(name ?? '')) {
                        return 'assets/css/[name]-[hash][extname]';
                    }
                    
                    // Keep WASM files in assets/wasm without hash for predictable paths
                    if (/\.wasm$/.test(name ?? '')) {
                        return 'assets/wasm/[name][extname]';
                    }
 
                    return 'assets/[name]-[hash][extname]';
                },
            },
        },
    },
    // Worker configuration - use ES modules format instead of IIFE
    worker: {
        format: 'es',
        rollupOptions: {
            output: {
                entryFileNames: 'assets/workers/[name]-[hash].js',
                chunkFileNames: 'assets/workers/[name]-[hash].js',
            },
        },
        resolve: {
            alias: [
                {
                    find: '@',
                    replacement: fileURLToPath(new URL('./src', import.meta.url))
                },
            ],
        },
    },
    publicDir: 'src/public',
    plugins: [
        vue(),
        viteCompression({filter: /\.(js|mjs|json|css|html|wasm)$/i}),
        // Copy WASM files from assets to wasm/ folder served at /wasm/
        viteStaticCopy({
            targets: [
                { src: 'src/assets/js/libMKF.wasm.js',   dest: 'wasm' },
                { src: 'src/assets/js/libMKF.wasm.wasm',  dest: 'wasm' },
                { src: 'src/assets/js/mvbpp.js',           dest: 'wasm' },
                { src: 'src/assets/js/mvbpp.wasm',         dest: 'wasm' },
            ]
        }),
    ],
    resolve: {
        alias: [
            {
                find: '@',
                replacement: fileURLToPath(new URL('./src', import.meta.url))
            },
            {
                find: '/WebSharedComponents',
                replacement: fileURLToPath(new URL('./WebSharedComponents', import.meta.url))
            },
        ],
    },
    server: {
        fs: { allow: ['..'] },
        watch: { usePolling: true, interval: 1000 },
        hmr: {
            protocol: 'ws',
            host: 'localhost',
            port: 5173
        },
        proxy: {
            '/api': {
                target: 'https://localhost:8888',
                changeOrigin: true,
                secure: false,      
                ws: true,
            }
        
        }
    }
})
