import { build } from "esbuild";

// The vendored client bundles with Bun. This workspace builds with esbuild so
// Turbo, CI, and the server image do not need a second package manager.
const shared = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  external: ["electron"],
  sourcemap: true,
  legalComments: "none",
};

await build({
  ...shared,
  entryPoints: ["src/main.ts"],
  outfile: "bundle/main.js",
});

await build({
  ...shared,
  entryPoints: ["src/preload.ts"],
  outfile: "bundle/preload.js",
});
