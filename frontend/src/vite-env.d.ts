/// <reference types="vite/client" />

// Lets TypeScript understand `import shader from "./x.glsl"` (handled by vite-plugin-glsl).
declare module "*.glsl" {
  const source: string;
  export default source;
}
declare module "*.vert" {
  const source: string;
  export default source;
}
declare module "*.frag" {
  const source: string;
  export default source;
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
