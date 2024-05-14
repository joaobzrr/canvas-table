// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import solid from 'eslint-plugin-solid';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    files: [
      'packages/canvas-table-solid/**/*.{ts,tsx}',
      'apps/canvas-table-solid-test/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: [
          './packages/canvas-table-solid/tsconfig.json',
          './apps/canvas-table-solid-test/tsconfig.json',
        ],
      },
    },
    plugins: {
      solid,
    },
    // Note: Typescript complains about:
    //
    // Property '"solid/jsx-no-undef"' is incompatible with index signature.
    //
    // We're ignoring it for now.
    //
    // @ts-ignore-next-line
    rules: solid.configs.typescript.rules,
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/dist/**/*'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: [
          './packages/canvas-table-core/tsconfig.json',
          './packages/canvas-table-react/tsconfig.json',
          './packages/canvas-table-solid/tsconfig.json',
          './apps/canvas-table-demo/tsconfig.json',
          './apps/canvas-table-solid-test/tsconfig.json',
          './apps/text-rendering-test/tsconfig.json',
        ],
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Prefer named exports',
        },
      ],
    },
  },
  prettier,
);
