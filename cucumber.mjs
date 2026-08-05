/**
 * Cucumber configuration (#151).
 *
 * Steps are TypeScript, loaded through `tsx` — the same esbuild-backed loader
 * Vite already pulls in, rather than adding `ts-node` and a second TS pipeline
 * to keep in step with `tsconfig.json`.
 *
 * `tsx` is registered via `NODE_OPTIONS=--import tsx` in the `test:bdd` script,
 * not as a `loader` here: `--loader` has been deprecated since Node 18.19 and
 * tsx refuses to start under it.
 */
export default {
  import: ["features/**/*.ts"],
  format: ["summary", "progress-bar"],
  formatOptions: { snippetInterface: "async-await" },
  strict: true,
};
