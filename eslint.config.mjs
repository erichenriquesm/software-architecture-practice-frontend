import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

const contexts = ['identity', 'market', 'orderTicket', 'orders', 'wallet'];

// A context never imports another one: shared data moves to entities/ or the page composes both.
const contextBoundaries = contexts.map((context) => ({
  files: [`src/contexts/${context}/**/*.{ts,vue}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          { group: contexts.filter((other) => other !== context).flatMap((other) => [`@/contexts/${other}`, `@/contexts/${other}/**`]), message: 'A context does not import another context.' },
          { group: ['@/pages/**', '@/app/**'], message: 'Contexts sit below pages and app.' },
        ],
      },
    ],
  },
}));

export default [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'test-results/**', 'playwright-report/**'] },
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parser: vueParser, parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'], sourceType: 'module' } },
  },
  {
    files: ['**/*.{ts,vue}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-else-return': ['error', { allowElseIf: false }],
      'no-console': 'error',
      'vue/no-v-html': 'error',
      'vue/multi-word-component-names': 'off',
      // Optional typed props are undefined when absent; a default would hide that.
      'vue/require-default-prop': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': ['error', { html: { void: 'always', normal: 'never', component: 'always' } }],
    },
  },
  {
    files: ['src/**/domain/**/*.ts', 'src/entities/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['vue', 'pinia', '@tanstack/*', 'vue-router'], message: 'Domain code is plain TypeScript.' }] }],
    },
  },
  ...contextBoundaries,
];
