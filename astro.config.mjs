import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Set SITE_URL to the live domain once it's bought (used for canonical URLs and the sitemap).
export default defineConfig({
  site: process.env.SITE_URL || 'https://contrastindex.com',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
