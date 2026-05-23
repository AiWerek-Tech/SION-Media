import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

const alias = {
  '@renderer': resolve('src/renderer/src'),
  '@shared': resolve('src/shared'),
  '@main': resolve('src/main'),
  '@preload': resolve('src/preload'),
  '@features': resolve('src/renderer/src/features'),
  '@core': resolve('src/renderer/src/core'),
  '@app': resolve('src/renderer/src/app'),
  '@infrastructure': resolve('src/renderer/src/infrastructure')
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias
    }
  },
  renderer: {
    resolve: {
      alias
    },
    plugins: [react(), tailwindcss(), svgr()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          projection: resolve(__dirname, 'src/renderer/projection.html'),
          stageDisplay: resolve(__dirname, 'src/renderer/stageDisplay.html')
        }
      }
    }
  }
})
