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
    },
    publicDir: 'src/public',
    plugins: [
        vue(),
        viteCompression({filter: /\.(js|mjs|json|css|html|wasm)$/i}),
        // Copy WASM files from assets to wasm/ folder in build output
        viteStaticCopy({
            targets: [
                {
                    src: 'src/assets/js/libMKF.wasm.js',
                    dest: 'wasm'
                },
                {
                    src: 'src/assets/js/libMKF.wasm.wasm',
                    dest: 'wasm'
                }
            ]
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            // '@openmagnetics/magnetic-virtual-builder': fileURLToPath(new URL('../MVB.js/src', import.meta.url)),
            // use "@openmagnetics/magnetic-virtual-builder": "file:../MVB.js", in package.json
        },
    },
    server: {
        // Enable symlinks to be followed
        fs: {
            allow: ['..'],
        },
        watch: {
            ignored: ['**/node_modules/**', '!**/MVB.js/src/**']
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
