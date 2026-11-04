import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { buildLastmod } from './src/lib/sitemap-dates.mjs';

const lastmodFor = buildLastmod();

// Set SITE_URL to the live domain once it's bought (used for canonical URLs and the sitemap).
export default defineConfig({
  site: process.env.SITE_URL || 'https://contrastindex.com',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // Adds <lastmod> to each URL. See src/lib/sitemap-dates.mjs for the rules.
      serialize(item) {
        const date = lastmodFor(item.url);
        if (date) item.lastmod = date;
        return item;
      },
    }),
  ],
});
