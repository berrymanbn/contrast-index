// Loads the product CSVs (the source of truth in /data) and normalizes
// the free-text spec cells into fields the filters and tables can use.
// Raw text is always kept so pages show exactly what the brand published.
import { parse } from 'csv-parse/sync';
// Imported as text at build time, so loading works in any build runtime.
import coldPlungesCsv from '../../data/cold-plunges.csv?raw';
import saunasCsv from '../../data/saunas.csv?raw';

const NP = 'Not published';
const CSV = { 'cold-plunges.csv': coldPlungesCsv, 'saunas.csv': saunasCsv };

function readCsv(file) {
  return parse(CSV[file], { columns: true, skip_empty_lines: true, trim: true });
}

export function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const isMissing = (v) => !v || v === NP || v === 'Not verified';
const num = (v) => {
  if (isMissing(v)) return null;
  const m = String(v).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

function volts(text) {
  if (isMissing(text)) return null;
  const hi = /\b(240|220)\s?V/i.test(text);
  const lo = /\b(110|120)(–120)?\s?V/i.test(text) || /110–120V/.test(text);
  if (hi && lo) return 'both';
  if (hi) return 240;
  if (lo) return 120;
  return null;
}

function circuitAmps(text) {
  if (isMissing(text)) return null;
  const ded = text.match(/dedicated\s+(?:standard\s+)?(?:outdoor-rated\s+)?(\d+)\s?A/i);
  if (ded) return Number(ded[1]);
  const any = text.match(/(\d+(\.\d+)?)\s?A\b/);
  return any ? Number(any[1]) : null;
}

function brandSlug(brand) {
  return slugify(brand.replace(/ Saunas$/, ''));
}

export function getColdPlunges() {
  return readCsv('cold-plunges.csv').map((r) => {
    const elec = r['Electrical'];
    const gal = r['Water capacity (gal)'];
    const coldSide = String(gal).match(/(\d+)\s*cold/);
    const type = r['Type'];
    const style = /tub only/i.test(type)
      ? 'Tub only'
      : /inflatable|portable/i.test(type)
        ? 'Inflatable or portable'
        : /stainless/i.test(type)
          ? 'Stainless steel'
          : /dual/i.test(type)
            ? 'Hot + cold combo'
            : 'Hard tub';
    return {
      category: 'cold-plunges',
      raw: r,
      brand: r['Brand'],
      brandSlug: brandSlug(r['Brand']),
      model: r['Model'],
      name: `${r['Brand']} ${r['Model']}`,
      slug: slugify(`${r['Brand']} ${r['Model']}`),
      type,
      style,
      price: num(r['Sale price (USD)']),
      listPrice: num(r['Regular price (USD)']),
      low: num(r['Lowest temp (°F)']),
      high: num(r['Highest temp (°F)']),
      heats: num(r['Highest temp (°F)']) !== null || /heats/i.test(r['Highest temp (°F)']),
      hp: num(r['Chiller HP']),
      gallons: coldSide ? Number(coldSide[1]) : num(gal),
      volts: volts(elec),
      amps: circuitAmps(elec),
      dedicated: /dedicated/i.test(elec || ''),
      hasChiller: !/tub only/i.test(type),
      source: r['Spec source URL'],
      checked: r['Date checked'],
      notes: r['Notes & conflicts'],
    };
  });
}

export function getSaunas() {
  return readCsv('saunas.csv').map((r) => {
    const elec = r['Electrical'];
    const type = r['Type'];
    const heat = /traditional/i.test(type) ? 'Traditional' : 'Infrared';
    const cap = String(r['Capacity (people)']);
    const capNums = (cap.match(/\d+/g) || []).map(Number);
    const v = volts(elec);
    const standardOutlet = v === 120 && /NEMA 5-15P|standard/i.test(elec) && !/dedicated (20|30)A/i.test(elec);
    const hardwired = /hardwired/i.test(elec || '');
    let power;
    if (hardwired && v === null) power = 'Hardwired (voltage not published)';
    else if (hardwired) power = '240V hardwired';
    else if (v === 240 && /NEMA/i.test(elec)) power = '240V plug-in';
    else if (v === 240) power = '240V (connection not published)';
    else if (standardOutlet) power = 'Standard 120V outlet';
    else if (v === 120) power = '120V dedicated circuit';
    else power = 'Not published';
    return {
      category: 'saunas',
      raw: r,
      brand: r['Brand'],
      brandSlug: brandSlug(r['Brand']),
      model: r['Model'],
      name: `${r['Brand']} ${r['Model']}`,
      slug: slugify(`${r['Brand']} ${r['Model']}`),
      type,
      heat,
      placement: /outdoor/i.test(r['Indoor / outdoor']) ? 'Outdoor' : 'Indoor',
      price: num(r['Sale price (USD)']),
      listPrice: num(r['Regular price (USD)']),
      capMin: capNums[0] ?? null,
      capMax: capNums[capNums.length - 1] ?? null,
      maxTemp: num(r['Max temp (°F)']),
      watts: (() => {
        const kw = String(r['Heater type & power']).match(/([\d.]+)\s?kW/);
        if (kw) return Number(kw[1]) * 1000;
        const w = String(r['Heater type & power']).replace(/,/g, '').match(/(\d{3,5})W/);
        return w ? Number(w[1]) : null;
      })(),
      volts: v,
      amps: circuitAmps(elec),
      power,
      standardOutlet,
      hardwired,
      source: r['Spec source URL'],
      checked: r['Date checked'],
      notes: r['Notes & conflicts'],
    };
  });
}

export function getAll() {
  return [...getColdPlunges(), ...getSaunas()];
}

export function getBrands() {
  const map = new Map();
  for (const p of getAll()) {
    if (!map.has(p.brandSlug)) map.set(p.brandSlug, { slug: p.brandSlug, name: p.brand, products: [] });
    map.get(p.brandSlug).products.push(p);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const usd = (n) => (n === null || n === undefined ? NP : `$${Math.round(n).toLocaleString('en-US')}`);
export const show = (v) => (isMissing(v) ? NP : v);
export { NP, isMissing };
