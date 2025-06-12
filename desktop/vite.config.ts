import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    const env = loadEnv(mode, process.cwd(), '')

    return {
        plugins: [react()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@shared': path.resolve(__dirname, '../shared'),
            },
        },
        base: './',
        build: {
            outDir: 'dist/renderer',
            emptyOutDir: true,
        },
        server: {
            port: 19858,
        },
        envDir: './',
        envPrefix: 'VITE_',
        define: {
            // Properly define environment variables
            'import.meta.env.VITE_API_URL': JSON.stringify(
                mode === 'development' ? 'http://localhost:3003' : env.VITE_API_URL
            ),
            'import.meta.env.VITE_ENVIRONMENT': JSON.stringify(env.VITE_ENVIRONMENT || mode),
            'import.meta.env.MODE': JSON.stringify(mode),
            'import.meta.env.DEV': mode === 'development',
            'import.meta.env.PROD': mode === 'production'
        }
    }
})
