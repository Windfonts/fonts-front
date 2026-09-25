#!/usr/bin/env node
/**
 * N8：导出本仓许可 + 谱系可同步快照（给 vault / 静态 dump，不进页面运行时）。
 *
 * 用法：node scripts/export-license-lineage.mjs > /tmp/license-lineage.json
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fonts = JSON.parse(readFileSync(join(ROOT, 'data', 'fonts.json'), 'utf8'));
const lineage = JSON.parse(readFileSync(join(ROOT, 'data', 'font-lineage.json'), 'utf8'));
const byName = lineage.byName || {};

function lineageOf(font) {
  const name = String(font.name || '');
  const keys = Object.keys(byName).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (name.includes(k)) return { key: k, ...byName[k] };
  }
  return font.lineage || null;
}

const rows = fonts.map((f) => ({
  family: f.family,
  normalized: f.normalized || null,
  name: f.name,
  license: f.license || null,
  licenseName: f.licenseName || null,
  licenseUrl: f.licenseUrl || null,
  licenseFileUrl: f.licenseFileUrl || null,
  licenseVerified: !!f.licenseVerified,
  licenseNotes: f.licenseNotes || null,
  rfn: f.rfn || null,
  copyright: f.copyright || null,
  foundry: f.foundry || null,
  brand: f.brand
    ? { name: f.brand.name, slug: f.brand.slug, website: f.brand.website || null }
    : null,
  lineage: lineageOf(f),
}));

process.stdout.write(
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: rows.length,
      fields:
        'family,normalized,name,license*,rfn,copyright,foundry,brand,lineage — vault 详情同步优先这些键',
      fonts: rows,
    },
    null,
    2
  ) + '\n'
);
console.error('exported', rows.length);
