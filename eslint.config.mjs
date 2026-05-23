import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'

export default defineConfig(
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/out',
      'src/renderer/src/core/projection/compiled/**',
      'src/renderer/src/core/projection/legacy/**',
      'src/renderer/src/core/projection/verification/**',
      'src/renderer/src/core/projection/**/*.js'
    ]
  },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],
  {
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules,
      // Compiled architecture enforcement from policy
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/verification/**'],
              message: 'Runtime cannot import verification code',
              allowTypeImports: false
            },
            {
              group: ['instrumentation.ts'],
              message: 'Runtime cannot import instrumentation code',
              allowTypeImports: false
            },
            {
              group: ['**/verification/**'],
              message: 'Instrumentation cannot import verification code',
              allowTypeImports: false
            }
          ]
        }
      ]
    }
  },
  eslintConfigPrettier
)
