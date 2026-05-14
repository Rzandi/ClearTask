import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactPlugin from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'react': reactPlugin
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: {
      react: { version: '19.0' },
    },
    rules: {
      'react/display-name': 'warn',
      // Warn on missing dependencies in useEffect/useCallback/useMemo
      'react-hooks/exhaustive-deps': 'warn',
      // Warn on unused variables and imports (ignore _ prefixed)
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      // Allow exporting context providers and custom hooks
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
])
