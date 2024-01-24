import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from "rollup-plugin-dts";

export default [
  {
    input: "src/index.ts",
    output: {
      file: "dist/canvas-table-core.js",
      format: "es",
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript(),
    ]
  },
  {
    input: "src/index.ts",
    output: {
      file: "dist/canvas-table-core.d.ts",
      format: "es"
    },
    plugins: [dts()]
  }
]
