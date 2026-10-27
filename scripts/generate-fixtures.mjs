/**
 * Generates the fixture CSV set used by the regression tests (TRD §9).
 * Deterministic (seeded PRNG) so fixtures are stable across runs.
 *
 *   node scripts/generate-fixtures.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
mkdirSync(DIR, { recursive: true });

let seed = 1234567;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
// RFC-4180-style quoting: wrap a field in quotes if it contains a comma, quote,
// or newline, doubling any embedded quotes.
const field = (v) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows) => rows.map((r) => r.map(field).join(',')).join('\n') + '\n';
const write = (name, content) => {
  writeFileSync(join(DIR, name), content);
  console.log('wrote', name);
};

// 1. Sales export (currency, dates, categories, id, boolean, zip)
{
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
  const zips = ['10001', '90001', '60601', '77001', '85001'];
  const cats = ['Electronics', 'Home', 'Toys', 'Grocery', 'Apparel'];
  const rows = [['order_id', 'order_date', 'city', 'zip_code', 'category', 'units', 'revenue', 'fulfilled']];
  for (let i = 0; i < 400; i++) {
    const ci = Math.floor(rnd() * cities.length);
    const date = `2024-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`;
    const units = 1 + Math.floor(rnd() * 20);
    rows.push([`ORD-${1000 + i}`, date, cities[ci], zips[ci], pick(cats), units, `$${(units * (5 + rnd() * 95)).toFixed(2)}`, rnd() > 0.2 ? 'Y' : 'N']);
  }
  write('sales.csv', csv(rows));
}

// 2. Survey results (Likert + categorical + boolean-ish)
{
  const rows = [['respondent_id', 'age_group', 'satisfaction', 'would_recommend', 'channel']];
  const ages = ['18-24', '25-34', '35-44', '45-54', '55+'];
  const channels = ['email', 'social', 'search', 'referral'];
  for (let i = 0; i < 300; i++) {
    rows.push([`R${i}`, pick(ages), String(1 + Math.floor(rnd() * 5)), rnd() > 0.4 ? 'yes' : 'no', pick(channels)]);
  }
  write('survey.csv', csv(rows));
}

// 3. Event log (timestamps + event types + numeric duration)
{
  const events = ['login', 'click', 'purchase', 'logout', 'error'];
  const rows = [['timestamp', 'user', 'event', 'duration_ms']];
  for (let i = 0; i < 500; i++) {
    const d = `2025-0${1 + Math.floor(rnd() * 6)}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}T${String(Math.floor(rnd() * 24)).padStart(2, '0')}:00:00Z`;
    rows.push([d, `u_${Math.floor(rnd() * 80)}`, pick(events), Math.floor(rnd() * 5000)]);
  }
  write('events.csv', csv(rows));
}

// 4. Weather time series (date + multiple numerics)
{
  const rows = [['date', 'temp_c', 'humidity', 'wind_kph', 'pressure']];
  for (let i = 0; i < 365; i++) {
    const d = new Date(2024, 0, 1 + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const t = 15 + 10 * Math.sin((i / 365) * 2 * Math.PI) + (rnd() * 4 - 2);
    rows.push([iso, t.toFixed(1), (40 + rnd() * 50).toFixed(0), (rnd() * 30).toFixed(1), (990 + rnd() * 40).toFixed(0)]);
  }
  write('weather.csv', csv(rows));
}

// 5. Numeric-heavy (correlated pairs → scatter)
{
  const rows = [['x', 'y_linear', 'y_noisy', 'z_random']];
  for (let i = 0; i < 200; i++) {
    const x = rnd() * 100;
    rows.push([x.toFixed(2), (x * 2 + 3).toFixed(2), (x * 1.5 + rnd() * 40).toFixed(2), (rnd() * 100).toFixed(2)]);
  }
  write('numeric-heavy.csv', csv(rows));
}

// 6. ZIP / postal codes (numeric-but-categorical)
{
  const zips = ['10001', '90001', '60601', '77001', '85001', '02139'];
  const rows = [['customer', 'zip', 'state']];
  const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'MA'];
  for (let i = 0; i < 150; i++) {
    const zi = Math.floor(rnd() * zips.length);
    rows.push([`C${i}`, zips[zi], states[zi]]);
  }
  write('zip-codes.csv', csv(rows));
}

// 7. Booleans in many flavors
{
  const rows = [['a_yn', 'b_tf', 'c_10', 'd_truefalse', 'e_onoff']];
  for (let i = 0; i < 100; i++) {
    rows.push([rnd() > 0.5 ? 'Y' : 'N', rnd() > 0.5 ? 't' : 'f', rnd() > 0.5 ? '1' : '0', rnd() > 0.5 ? 'true' : 'false', rnd() > 0.5 ? 'on' : 'off']);
  }
  write('booleans.csv', csv(rows));
}

// 8. Identifiers (uuid + sequential id + hash)
{
  const rows = [['uuid', 'seq_id', 'sha']];
  for (let i = 0; i < 60; i++) {
    const uuid = `550e8400-e29b-41d4-a716-${String(446655440000 + i).padStart(12, '0')}`;
    const sha = Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(rnd() * 16)]).join('');
    rows.push([uuid, String(90000 + i), sha]);
  }
  write('identifiers.csv', csv(rows));
}

// 9. Ambiguous numeric dates (day-first, has day > 12)
{
  const rows = [['event', 'when']];
  const days = ['13/01/2025', '25/02/2025', '05/03/2025', '19/04/2025', '30/06/2025'];
  for (let i = 0; i < 40; i++) rows.push([`e${i}`, pick(days)]);
  write('ambiguous-dates.csv', csv(rows));
}

// 10. Month-name dates
{
  const rows = [['id', 'signed_up']];
  const dates = ['Jan 5, 2024', 'Feb 20, 2024', 'Mar 3, 2024', 'Dec 31, 2023', 'Jul 4, 2024'];
  for (let i = 0; i < 40; i++) rows.push([String(i), pick(dates)]);
  write('month-name-dates.csv', csv(rows));
}

// 11. Currency and percentages
{
  const rows = [['product', 'price', 'discount', 'margin']];
  for (let i = 0; i < 120; i++) {
    rows.push([`P${i}`, `$${(rnd() * 1000).toFixed(2)}`, `${(rnd() * 50).toFixed(0)}%`, `${(rnd() * 40 + 10).toFixed(1)}%`]);
  }
  write('currency.csv', csv(rows));
}

// 12. Mixed null representations
{
  const nulls = ['', 'NA', 'n/a', 'null', '-', 'NaN'];
  const rows = [['name', 'score', 'notes']];
  for (let i = 0; i < 80; i++) {
    rows.push([pick(['NA', 'Ada', 'Grace', '']), rnd() > 0.3 ? String(Math.floor(rnd() * 100)) : pick(nulls), pick(nulls)]);
  }
  write('mixed-nulls.csv', csv(rows));
}

// 13. Unicode content
{
  const rows = [['país', 'ciudad', 'población', 'emoji']];
  const data = [
    ['España', 'Málaga', '578460', '🌞'],
    ['日本', '東京', '13960000', '🗾'],
    ['France', 'Nîmes', '150610', '🥖'],
    ['Ελλάδα', 'Αθήνα', '664046', '🏛️'],
  ];
  for (let i = 0; i < 40; i++) rows.push(pick(data));
  write('unicode.csv', csv(rows));
}

// 14. High-cardinality free text (→ unknown)
{
  const rows = [['id', 'comment']];
  for (let i = 0; i < 100; i++) {
    rows.push([String(i), `free text comment number ${i}, with unique words ${Math.floor(rnd() * 1e6)}`]);
  }
  write('free-text.csv', csv(rows));
}

// 15. Single column
{
  const rows = [['temperature']];
  for (let i = 0; i < 100; i++) rows.push([(rnd() * 40).toFixed(1)]);
  write('single-column.csv', csv(rows));
}

// 16. Wide (many columns)
{
  const cols = Array.from({ length: 25 }, (_, i) => `col_${i}`);
  const rows = [cols];
  for (let i = 0; i < 50; i++) rows.push(cols.map((_, c) => String((i * (c + 1)) % 50)));
  write('wide.csv', csv(rows));
}

// 17. Constant / degenerate column
{
  const rows = [['const', 'varying']];
  for (let i = 0; i < 60; i++) rows.push(['SAME', String(Math.floor(rnd() * 100))]);
  write('constant-column.csv', csv(rows));
}

// 18. TSV (tab-separated)
{
  const rows = [['name', 'age', 'city'], ['Ada', '36', 'London'], ['Grace', '45', 'NYC'], ['Alan', '41', 'Manchester']];
  writeFileSync(join(DIR, 'tab-separated.tsv'), rows.map((r) => r.join('\t')).join('\n') + '\n');
  console.log('wrote tab-separated.tsv');
}

// 19. Categorical-heavy (several low-card categoricals + one numeric)
{
  const rows = [['region', 'segment', 'tier', 'score']];
  const regions = ['north', 'south', 'east', 'west'];
  const segments = ['smb', 'mid', 'enterprise'];
  const tiers = ['bronze', 'silver', 'gold'];
  for (let i = 0; i < 250; i++) rows.push([pick(regions), pick(segments), pick(tiers), (rnd() * 100).toFixed(1)]);
  write('categorical-heavy.csv', csv(rows));
}

// 20. Empty file
write('empty.csv', '');

// 21. Header-only
write('header-only.csv', 'a,b,c\n');

console.log('\nDone. Fixture set generated in fixtures/.');
