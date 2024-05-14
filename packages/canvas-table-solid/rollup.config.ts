import { cwd } from 'node:process';
import { readFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { RollupOptions } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import dts from 'rollup-plugin-dts';

function findClosestPackageJson(start = cwd(), level = 0): Record<string, unknown> {
  try {
    const path = resolve(start, 'package.json');
    const content = readFileSync(path, { encoding: 'utf8' });
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return level >= 10 ? {} : findClosestPackageJson(dirname(start), level + 1);
  }
}

rmSync(resolve(cwd(), 'dist'), {
  force: true,
  recursive: true,
});

const pkg = findClosestPackageJson(cwd());
const babelTargets = pkg.browserslist || 'last 2 years';

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

const extensions = ['.js', '.ts', '.jsx', '.tsx'];

const config: RollupOptions[] = [
  {
    input: 'src/index.ts',
    external: ['solid-js', 'solid-js/web', 'solid-js/store', ...external],
    output: {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      babel({
        extensions,
        babelHelpers: 'bundled',
        presets: [
          'babel-preset-solid',
          '@babel/preset-typescript',
          [
            '@babel/preset-env',
            {
              bugfixes: true,
              targets: babelTargets,
            },
          ],
        ],
      }),
      nodeResolve({ extensions }),
      typescript({ tsconfig: resolve(cwd(), 'tsconfig.dts.json') }),
    ],
  },
  {
    input: 'dist/types/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es',
    },
    plugins: [
      dts(),
      {
        name: 'removeTypesDir',
        buildEnd: () =>
          rmSync(resolve(cwd(), 'dist/types'), {
            force: true,
            recursive: true,
          }),
      },
    ],
  },
];

// eslint-disable-next-line no-restricted-syntax
export default config;
