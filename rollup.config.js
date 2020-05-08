import { eslint } from "rollup-plugin-eslint";
import filesize from "rollup-plugin-filesize";
import babel from "@rollup/plugin-babel";
import pkg from "./package.json";

const formats = ["umd", "esm"];
const globals = {};
const [, pkgName] = pkg.name.split("/");

export default {
  input: "src/index.ts",
  output: formats.map((format) => ({
    file: `dist/${pkgName}.${format}.js`,
    format,
    name: pkgName,
    sourcemap: true,
    globals,
  })),
  external: Object.keys(globals),
  plugins: [
    eslint({
      throwOnWarning: true,
      throwOnError: true,
    }),
    babel({
      extensions: [".js", ".jsx", ".es6", ".es", ".mjs", ".ts"],
      babelHelpers: "bundled",
    }),
    filesize(),
  ],
};
