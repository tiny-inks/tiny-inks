/* Lighthouse mobile audit for the quality loop.
   Usage: node scripts/lighthouse-run.mjs [url]  (default: http://localhost:3000/en) */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const url = process.argv[2] || 'http://localhost:3000/en';
const chromePath = (await import('playwright-core')).chromium.executablePath();

const out = 'lh-report.json';
execSync(
  [
    'npx --yes lighthouse',
    `"${url}"`,
    '--quiet',
    '"--chrome-flags=--headless=new --no-sandbox"',
    '--only-categories=performance,accessibility,best-practices,seo',
    '--form-factor=mobile',
    '--output=json',
    `--output-path=${out}`,
  ].join(' '),
  { env: { ...process.env, CHROME_PATH: chromePath }, stdio: 'inherit' }
);

const r = JSON.parse(readFileSync(out, 'utf8'));
const s = (k) => Math.round((r.categories[k]?.score ?? 0) * 100);
console.log(
  JSON.stringify({
    url,
    performance: s('performance'),
    accessibility: s('accessibility'),
    bestPractices: s('best-practices'),
    seo: s('seo'),
    lcp: r.audits['largest-contentful-paint']?.displayValue,
    cls: r.audits['cumulative-layout-shift']?.displayValue,
    tbt: r.audits['total-blocking-time']?.displayValue,
  })
);
