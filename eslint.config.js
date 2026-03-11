import withNuxt from './.nuxt/eslint.config.mjs'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import vueParser from 'vue-eslint-parser'

export default withNuxt([
  {
    ignores: ['functions/lib/**']
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue']
      }
    },
    rules: {
      'vue/html-self-closing': 'off',
      'vue/require-default-prop': 'off'
    }
  },
  {
    files: ['**/*.{ts,tsx,vue}'],
    plugins: {
      prettier
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
])
