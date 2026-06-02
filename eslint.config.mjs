import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

const rules = {
  ...tseslint.configs.recommended.rules,
  '@typescript-eslint/no-explicit-any': 'warn',
  // Leading-underscore args/vars are an intentional "unused" signal
  // (matches tsconfig's noUnusedParameters convention).
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
  ],
};

export default [
  {
    // Source is covered by each package's tsconfig — use typed parsing.
    files: ['packages/*/src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules,
  },
  {
    // Tests are intentionally excluded from tsconfig `include` so the build never
    // compiles them into dist/. None of the enabled rules require type info, so
    // parse them without a project to avoid "file not found in project" errors.
    files: ['packages/*/test/**/*.{ts,tsx}'],
    languageOptions: { parser: tsparser },
    plugins: { '@typescript-eslint': tseslint },
    rules,
  },
  prettier,
];
