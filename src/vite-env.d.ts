/// <reference types="vite/client" />

// Minimal ambient declarations for the sliver of Node built-ins the theme test
// touches when reading its stylesheet off disk. The project doesn't depend on
// `@types/node` (it's a browser SPA), so we declare only the two functions used
// rather than pulling the whole Node type surface into the build.
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}

declare module "node:path" {
  export function join(...paths: string[]): string;
}

declare const process: { cwd(): string };
