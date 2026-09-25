#!/usr/bin/env node
/**
 * 扫 CDN 预计算 CSS Content-Length → data/package-sizes.json（P3）。
 *
 * 用法：node scripts/build-package-sizes.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CDN = process.env.WF_CDN_ORIGIN || 'https://cn.windfonts.com';
const CONCURRENCY = Number(process.env.WF_SIZE_CONCURRENCY || 12);
const SUBSETS = ['en', 'zh-common', 'zh', 'full'];
const WEIGHT_FALLBACK = ['Regular', 'Normal', 'Medium', 'Light', 'Bold'];

const fonts = JSON.parse(readFileSync(join(ROOT, 'data', 'fonts.json'), 'utf8'));

async function cssBytes(url) {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return buf.byteLength > 0 ? buf.byteLength : null;
}

async function sizeFor(normalized, weight, subset) {
  const url = `${CDN}/fonts-packages/${encodeURIComponent(normalized)}/${encodeURIComponent(weight)}/${subset}/result.css`;
  return cssBytes(url);
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

const unique = [];
const seen = new Set();
for (const f of fonts) {
  const n = String(f.normalized || '').trim();
  if (!n || seen.has(n)) continue;
  seen.add(n);
  unique.push(f);
}

console.error('scan', unique.length, 'fonts ×', SUBSETS.length, 'subsets');

const byNormalized = {};
await mapPool(unique, CONCURRENCY, async (font, idx) => {
  const normalized = font.normalized;
  const weights = Array.isArray(font.weights) && font.weights.length
    ? [...new Set([...font.weights, ...WEIGHT_FALLBACK])]
    : WEIGHT_FALLBACK;
  let weightHit = null;
  for (const w of weights) {
    const full = await sizeFor(normalized, w, 'full');
    if (full != null) {
      weightHit = w;
      break;
    }
  }
  if (!weightHit) {
    if ((idx + 1) % 40 === 0) console.error(`… ${idx + 1}/${unique.length} (miss)`);
    return;
  }
  const entry = { weight: weightHit, subsets: {} };
  for (const subset of SUBSETS) {
    const bytes = await sizeFor(normalized, weightHit, subset);
    if (bytes != null) entry.subsets[subset] = { cssBytes: bytes };
  }
  if (Object.keys(entry.subsets).length) {
    byNormalized[normalized] = entry;
    // also index by family slug for front
    const fam = String(font.family || '').toLowerCase();
    if (fam) byNormalized[fam] = entry;
  }
  if ((idx + 1) % 40 === 0 || idx === unique.length - 1) {
    console.error(`… ${idx + 1}/${unique.length} hit=${Object.keys(byNormalized).length}`);
  }
});

const out = {
  note: '预计算 CSS Content-Length（fonts-packages/.../result.css）。不含 woff2 分片合计；预算条用 cssBytes 作 CSS 档体积。',
  generatedAt: new Date().toISOString(),
  cdn: CDN,
  byNormalized,
  count: Object.keys(byNormalized).filter((k) => !k.startsWith('wenfeng-')).length,
};

const path = join(ROOT, 'data', 'package-sizes.json');
writeFileSync(path, JSON.stringify(out) + '\n');
console.error('wrote', path, 'entries', out.count);
