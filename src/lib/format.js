export function plungePower(p) {
  if (p.volts === 'both') return '120V cold side + 240V hot side';
  if (p.volts === 120) {
    if (p.dedicated && p.amps) return `120V, dedicated ${p.amps}A circuit`;
    return '120V standard outlet';
  }
  if (!p.hasChiller) return 'None (no chiller)';
  return 'Not published';
}

export function priceBand(price) {
  if (price == null) return 'unknown';
  if (price < 2000) return 'under-2k';
  if (price < 5000) return '2k-5k';
  if (price < 10000) return '5k-10k';
  return 'over-10k';
}

export const fmtHp = (hp) => {
  if (hp == null) return null;
  if (Math.abs(hp - 0.33) < 0.01) return '1/3 HP';
  if (hp === 0.25) return '1/4 HP';
  return `${hp} HP`;
};
