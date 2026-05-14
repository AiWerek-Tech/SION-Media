import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  test: {
    projects: [
      // Node environment — main process, database, shared utilities
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/main/**/*.test.ts', 'src/shared/**/*.test.ts']
        }
      },
      // jsdom environment — renderer stores, components, utilities
      {
        plugins: [react()],
        resolve: {
          alias: {
            '@renderer': resolve(__dirname, 'src/renderer/src')
          }
        },
        test: {
          name: 'renderer',
          environment: 'jsdom',
          include: ['src/renderer/**/*.test.ts', 'src/renderer/**/*.test.tsx'],
          setupFiles: ['src/renderer/src/test-utils/setup.ts'],
          globals: true
        }
      }
    ]
  }
})
