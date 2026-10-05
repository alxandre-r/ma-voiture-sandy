import { createRequire } from 'module';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { FlatCompat } from '@eslint/eslintrc';
import importPlugin from 'eslint-plugin-import';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// eslint-config-next already registers the jsx-a11y plugin but enables only a few of its rules.
// Load the plugin from there (no extra dependency) to turn on its whole recommended set.
const requireFromNextConfig = createRequire(import.meta.resolve('eslint-config-next'));
const jsxA11y = requireFromNextConfig('eslint-plugin-jsx-a11y');

const eslintConfig = [
  // -----------------------------
  // GLOBAL IGNORES (Flat Config)
  // -----------------------------
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'build/**',
      '__tests__/**',
      'coverage/**',
      'next-env.d.ts',
      'package.json',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
    ],
  },

  // -----------------------------
  // NEXT + TYPESCRIPT + PRETTIER
  // -----------------------------
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),

  // -----------------------------
  // GLOBAL RULES
  // -----------------------------
  {
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImportsPlugin,
    },

    rules: {
      // ---------------------
      // IMPORT STRUCTURE
      // ---------------------
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // fs, path
            'external', // react, next, libs
            'internal', // @/lib, @/types
            'parent', // ../
            'sibling', // ./
            'index', // ./index
            'type', // import type
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      'import/no-cycle': 'error',
      'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],

      // ---------------------
      // UNUSED IMPORTS CLEAN
      // ---------------------
      'unused-imports/no-unused-imports': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

      '@typescript-eslint/explicit-function-return-type': 'off',

      '@typescript-eslint/no-explicit-any': 'error',

      // ---------------------
      // ACCESSIBILITY
      // ---------------------
      ...jsxA11y.configs.recommended.rules,
      // autoFocus is only used right after a user action opens an inline editor or a dialog
      'jsx-a11y/no-autofocus': 'off',
    },
  },

  // -----------------------------
  // DEMO MODE ISOLATION
  // -----------------------------
  {
    files: ['lib/demo/**/*.{ts,tsx}', 'app/api/demo/**/*.{ts,tsx}', 'app/demo/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/supabase/*', '@/lib/data/*'],
              message: 'Demo code must never reach Supabase or the real data layer.',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
