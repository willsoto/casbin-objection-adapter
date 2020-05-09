import filesize from "rollup-plugin-filesize";
import typescript from "@rollup/plugin-typescript";
import pkg from "./package.json";
import slugify from "@sindresorhus/slugify";

const formats = ["cjs", "esm"];
const globals = Object.keys(pkg.peerDependencies).reduce((obj, dependency) => {
  obj[dependency] = slugify(dependency);

  return obj;
}, {});
const [, pkgName] = pkg.name.split("/");

console.log(globals);

export default {
  input: "src/index.ts",
  output: formats.map((format) => ({
    file: `dist/${format}.js`,
    format,
    name: pkgName,
    sourcemap: true,
    globals,
  })),
  external: Object.keys(globals),
  plugins: [
    typescript({
      tsconfig: "./tsconfig.build.json",
    }),
    filesize(),
  ],
};
