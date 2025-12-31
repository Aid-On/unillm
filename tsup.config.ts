import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  external: ['@anthropic-ai/sdk', '@google/generative-ai', 'openai', 'groq-sdk'],
  treeshake: true,
  minify: false,
});