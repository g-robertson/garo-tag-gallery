import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact({swcReactOptions: {
    "importSource": "static-react"
  }})],
  output: {
    minify: false,
    distPath: {
      root: "../../dist"
    },
    cleanDistPath: true
  },
  root: "./src/client",
  source: {
    entry: {
      index: "./index.jsx"
    }
  }
});
