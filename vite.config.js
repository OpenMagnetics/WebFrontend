import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import viteCompression from 'vite-plugin-compression';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Plugin to resolve MVB.js before package.json exports
function mvbResolverPlugin() {
    const mvbSrcPath = '/home/alf/OpenMagnetics/MVB.js/src/index.js';
    return {
        name: 'mvb-resolver',
        enforce: 'pre',
        resolveId(id) {
            if (id === '@openmagnetics/magnetic-virtual-builder') {
                console.log('[MVB Resolver] Intercepting import:', id);
                console.log('[MVB Resolver] Returning:', mvbSrcPath);
                return mvbSrcPath;
            }
        }
    };
}

// Plugin to reload page when MVB.js changes
function mvbReloadPlugin() {
    const mvbPath = '/home/alf/OpenMagnetics/MVB.js/src';
    return {
        name: 'mvb-reload',
        configureServer(server) {
            server.watcher.add(mvbPath);
            server.watcher.on('change', (path) => {
                if (path.includes('MVB.js')) {
                    console.log('[MVB Reload] File changed:', path);
                    server.ws.send({ type: 'full-reload' });
                }
            });
            console.log('[MVB Reload] Watching:', mvbPath);
        }
    };
}

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
                {
                    find: '@openmagnetics/magnetic-virtual-builder',
                    replacement: fileURLToPath(new URL('../MVB.js/src/index.js', import.meta.url))
                }
            ],
        },
    },
    publicDir: 'src/public',
    optimizeDeps: {
        exclude: ['@openmagnetics/magnetic-virtual-builder']
    },
    plugins: [
        mvbResolverPlugin(),
        mvbReloadPlugin(),
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
        alias: [
            {
                find: '@',
                replacement: fileURLToPath(new URL('./src', import.meta.url))
            }
            //,
            //{
                //find: '@openmagnetics/magnetic-virtual-builder',
                //replacement: fileURLToPath(new URL('../MVB.js/src/index.js', import.meta.url))
            //}
        ],
    },
    server: {
        // Enable symlinks to be followed
        fs: {
            allow: ['..'],
        },
        watch: {
            usePolling: true,
            interval: 1000,
            //ignored: ['**/node_modules/**', '!**/node_modules/@openmagnetics/magnetic-virtual-builder/src/**']
        },
        // Force worker to reload when MVB.js changes
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
