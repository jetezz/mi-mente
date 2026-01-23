import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import bun from '@astrojs/bun';

// https://astro.build/config

export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'server',
  adapter: bun()
});