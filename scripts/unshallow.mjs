// Runs automatically before `npm run build` (the "prebuild" script).
// Cloudflare Pages clones the repo with only the latest commit, which would make
// every page look changed today. Fetching the full history lets the sitemap use
// each page's real last-changed date. Never fails the build: if this can't run,
// the sitemap just leaves those dates out.
import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

try {
  if (git('rev-parse', '--is-shallow-repository') === 'true') {
    git('fetch', '--unshallow', '--quiet');
    console.log('[unshallow] fetched full git history for sitemap dates');
  }
} catch (e) {
  console.warn('[unshallow] skipped; sitemap will omit git-based dates:', String(e.message).split('\n')[0]);
}
