import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET

  return {
    plugins: [
      vue(),
      mode === 'development' && vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: apiProxyTarget
        ? {
            '/api': {
              target: apiProxyTarget,
              changeOrigin: true,
              ws: true,
            },
          }
        : undefined,
    },
  }
})
