import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Vendored shadcn/ui files, kept as the CLI writes them so `npx shadcn add` can update them.
    // Our own kit (ui/index.jsx) stays under the full rules.
    files: ['src/components/ui/*.jsx', 'src/hooks/*.js'],
    ignores: ['src/components/ui/index.jsx'],
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^(_|React$)', argsIgnorePattern: '^_' }],
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  { files: ['*.config.js', 'vite.config.js'], languageOptions: { globals: globals.node } },
  { files: ['**/*.test.{js,jsx}', 'src/test/**'], languageOptions: { globals: globals.node } },
];
