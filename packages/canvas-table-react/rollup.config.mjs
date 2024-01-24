import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from "rollup-plugin-dts";
import { cleandir } from "rollup-plugin-cleandir";

export default [
  {
    input: "src/index.ts",
    output: {
      file: "dist/canvas-table-react.js",
      format: "es",
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript(),
      cleandir("./dist")
    ],
    external: [
      "react",
      "react/jsx-runtime"
    ]
  },
  {
    input: "src/index.ts",
    output: {
      file: "dist/canvas-table-react.d.ts",
      format: "es"
    },
    plugins: [dts()]
  }
]
