# The Contrast Index

A static comparison site for home saunas and cold plunges, built with [Astro](https://astro.build).

## How it works

- **Product data lives in two CSV files:** `data/cold-plunges.csv` and `data/saunas.csv`. Each row is one model. Open them in Excel or Google Sheets, edit, and save as CSV.
- Every page (finders, product pages, brand pages, guides) is generated from those files at build time, so a spec changed once updates everywhere.
- `src/lib/data.js` reads the CSVs and turns free-text cells (like "120V, dedicated 20A circuit") into fields the filters use. The original text is always what's shown on the page.

## Data rules

- Specs come only from the manufacturer's own pages. Put the page in `Spec source URL` and the date in `Date checked` (YYYY-MM-DD).
- If a brand doesn't publish a spec, write `Not published`. Never estimate.
- Conflicts on a brand's own pages go in `Notes & conflicts`.
- `Affiliate program` is internal only and is never shown on the site.

## Commands

```
npm install       # once
npm run dev       # local preview at http://localhost:4321
npm run build     # builds the site into dist/
```

## Before launch

- Set `SITE_URL` (in the host's environment settings) to the live domain, and update `public/robots.txt`.
- Add a contact email for corrections on `/how-we-rate/`.
- Swap brand links for affiliate links as programs approve.
