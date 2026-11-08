import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import glsl from "vite-plugin-glsl";

// https://vite.dev/config/
export default defineConfig({
  // glsl(): import .glsl/.vert/.frag shader files as strings (supports #include chunks).
  plugins: [react(), tailwindcss(), glsl()],
  server: {
    port: 5173,
  },
  build: {
    // The 3D scene chunk (three.js + R3F + scene code, ~1.1 MB minified / ~295 KB
    // gzipped) is lazy-loaded after the page has rendered, so it never blocks first
    // paint. Manual vendor splitting was tried and rejected: it made the main bundle
    // import three.js eagerly.
    chunkSizeWarningLimit: 1250,
  },
});
