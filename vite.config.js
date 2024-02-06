import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig({
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
 
                    // default value
                    // ref: https://rollupjs.org/guide/en/#outputassetfilenames
                    return 'assets/[name]-[hash][extname]';
                },
            },
        },
        commonjsOptions: { include: [] },
    },
    optimizeDeps: {
        disabled: false,
    },
    publicDir: 'src/public',
    plugins: [
        vue(),
        viteCompression({filter: '/\.(js|mjs|json|css|html|wasm)$/i'}),
    ],
    server: {
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
