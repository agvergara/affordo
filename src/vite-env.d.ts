/// <reference types="vitest/globals" />

// Vite's `?raw` suffix imports a file's contents as a string. We declare only
// the narrow case we use (an .html shell read in a test) rather than pulling in
// all of `vite/client`, keeping the ambient surface minimal.
declare module "*.html?raw" {
  const content: string;
  export default content;
}
