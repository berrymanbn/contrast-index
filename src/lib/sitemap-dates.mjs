// Works out a <lastmod> date for each URL in the sitemap.
// Runs in astro.config.mjs (plain Node), so it reads the CSVs directly.
//
// Rules (lastmod should mean "the content changed", not "the site rebuilt"):
// - Model pages: that model's "Date checked" in the CSV.
// - Brand pages: the latest "Date checked" across that brand's models.
// - Pages built from the data (finders, best-of, guides with spec tables):
//   the later of the page file's last commit and the latest relevant "Date checked".
// - Other pages: the page file's last commit.
// - If no trustworthy date exists, the URL gets no lastmod (better than a wrong one).
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parse } from 'csv-parse/sync';

const ROOT = new URL('../../', import.meta.url);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Must match slugify/brandSlug in src/lib/data.js.
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
const brandSlug = (brand) => slugify(brand.replace(/ Saunas$/, ''));

function readRows(file, category) {
  const text = readFileSync(new URL(`data/${file}`, ROOT), 'utf8');
  return parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true }).map((r) => ({
    category,
    slug: slugify(`${r['Brand']} ${r['Model']}`),
    brand: brandSlug(r['Brand']),
    checked: ISO.test(r['Date checked']) ? r['Date checked'] : null,
  }));
}

const latest = (dates) => dates.filter(Boolean).sort().at(-1) ?? null;

// Git dates are only trusted with full history. Cloudflare Pages clones shallowly,
// so scripts/unshallow.mjs deepens the clone before the build.
let gitOk = false;
try {
  gitOk = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: ROOT, encoding: 'utf8' }).trim() === 'false';
} catch {}

function gitDate(file) {
  if (!gitOk) return null;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: ROOT, encoding: 'utf8' }).trim();
    return ISO.test(out) ? out : null;
  } catch {
    return null;
  }
}

// URL path -> [page source file, which data it shows]
const PAGES = {
  '/': ['src/pages/index.astro', 'all'],
  '/saunas/': ['src/pages/saunas/index.astro', 'sauna'],
  '/saunas/indoor/': ['src/pages/saunas/indoor.astro', 'sauna'],
  '/saunas/2-person-sauna-dimensions/': ['src/pages/saunas/2-person-sauna-dimensions.astro', 'sauna'],
  '/best-home-sauna/': ['src/pages/best-home-sauna.astro', 'sauna'],
  '/cold-plunges/': ['src/pages/cold-plunges/index.astro', 'plunge'],
  '/cold-plunges/chillers/': ['src/pages/cold-plunges/chillers.astro', 'plunge'],
  '/cold-plunges/cost/': ['src/pages/cold-plunges/cost.astro', 'plunge'],
  '/best-cold-plunge/': ['src/pages/best-cold-plunge.astro', 'plunge'],
  '/brands/': ['src/pages/brands/index.astro', 'all'],
  '/guides/cold-plunge-vs-ice-bath/': ['src/pages/guides/cold-plunge-vs-ice-bath.astro', 'plunge'],
  '/guides/sauna-electrical-requirements/': ['src/pages/guides/sauna-electrical-requirements.astro', 'sauna'],
  '/guides/infrared-vs-traditional-sauna/': ['src/pages/guides/infrared-vs-traditional-sauna.astro', 'sauna'],
  '/guides/': ['src/pages/guides/index.astro', null],
  '/tools/sauna-heater-size-calculator/': ['src/pages/tools/sauna-heater-size-calculator.astro', null],
  '/how-we-rate/': ['src/pages/how-we-rate.astro', 'all'],
  '/privacy/': ['src/pages/privacy.astro', null],
};

export function buildLastmod() {
  const rows = [...readRows('saunas.csv', 'sauna'), ...readRows('cold-plunges.csv', 'plunge')];
  const dataDate = (scope) =>
    scope ? latest(rows.filter((r) => scope === 'all' || r.category === scope).map((r) => r.checked)) : null;

  return function lastmodFor(url) {
    const path = new URL(url).pathname;

    const model = path.match(/^\/(saunas|cold-plunges)\/([^/]+)\/$/);
    if (model) {
      const category = model[1] === 'saunas' ? 'sauna' : 'plunge';
      const row = rows.find((r) => r.category === category && r.slug === model[2]);
      if (row) return row.checked;
    }

    const brand = path.match(/^\/brands\/([^/]+)\/$/);
    if (brand) return latest(rows.filter((r) => r.brand === brand[1]).map((r) => r.checked));

    const page = PAGES[path];
    if (page) return latest([gitDate(page[0]), dataDate(page[1])]);

    // New page not listed above: fall back to the source file's commit date if we can find it.
    const base = `src/pages${path.replace(/\/$/, '')}`;
    return gitDate(`${base}.astro`) ?? gitDate(`${base}/index.astro`);
  };
}
