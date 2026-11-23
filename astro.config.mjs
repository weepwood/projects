// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

const site = JSON.parse(readFileSync(new URL('./content/site.json', import.meta.url), 'utf8'));

// `astro build` and `astro dev` are distinguished by argv. (defineConfig's
// function form dropped `build.assets`, so the config stays a plain object.)
const isBuild = process.argv.includes('build');

export default defineConfig({
  site: site.url,
  // Pages serves this repository from /projects/, so every emitted URL needs the
  // prefix. src/lib/paths.js is the single consumer of import.meta.env.BASE_URL.
  // In dev the base stays "/" so localhost/ and the sandbox preview open at root.
  base: isBuild ? new URL(site.url).pathname : '/',
  outDir: './dist',
  build: { assets: 'assets' },
  compressHTML: true,
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  // The dev server is reachable through the sandbox preview proxy, whose host is
  // not localhost. Allow it explicitly; production is static, so this never ships.
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app', 'localhost'] },
  vite: {
    build: {
      assetsInlineLimit: 1024,
      rollupOptions: {
        output: {
          // Stable, content-hashed names: the stylesheet is always site.<hash>.css
          // rather than being named after whichever page happened to import it first.
          assetFileNames: (info) =>
            info.names?.[0]?.endsWith('.css') || info.name?.endsWith('.css')
              ? 'assets/site.[hash][extname]'
              : 'assets/[name].[hash][extname]',
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js',
        },
      },
    },
  },
});
