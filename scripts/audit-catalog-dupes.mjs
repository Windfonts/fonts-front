#!/usr/bin/env node
/**
 * 扫描目录双卡 / 同 family / 同 normalized / 近义 stub。
 * 用法：node scripts/audit-catalog-dupes.mjs
 * 产出：docs/_catalog-dupe-audit.json（不入库也可）
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const list = JSON.parse(readFileSync(join(ROOT, 'data/fonts-list.json'), 'utf8'));
const fonts = JSON.parse(readFileSync(join(ROOT, 'data/fonts.json'), 'utf8'));
const slugDir = join(ROOT, 'data/fonts-by-slug');
const stems = new Set(readdirSync(slugDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')));

function group(arr, keyFn) {
  const m = new Map();
  for (const f of arr) {
    const k = keyFn(f);
    if (!k) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(f);
  }
  return [...m.entries()].filter(([, v]) => v.length > 1);
}

const report = {
  generatedAt: new Date().toISOString(),
  listCount: list.length,
  fontsJsonCount: fonts.length,
  slugFileCount: stems.size,
  dupNormalized: group(list, (f) => f.normalized).map(([k, v]) => ({ key: k, rows: v.map(slim) })),
  dupFamily: group(list, (f) => f.family).map(([k, v]) => ({ key: k, rows: v.map(slim) })),
  dupId: group(list, (f) => f.id).map(([k, v]) => ({ key: k, rows: v.map(slim) })),
  dupName: group(list, (f) => f.name).map(([k, v]) => ({ key: k, rows: v.map(slim) })),
  /** 同 en 多卡：多为产品变体，人工确认，勿自动合并 */
  sameEnVariants: group(list, (f) => (f.en || '').toLowerCase()).map(([k, v]) => ({
    key: k,
    rows: v.map(slim),
    note: 'product-variant-or-review',
  })),
  stubsZeroGlyph: list.filter((f) => !(f.charCount || 0) && !(f.glyphCount || 0)).map(slim),
  retiredAliasesSuggested: [],
};

function slim(f) {
  return {
    id: f.id,
    name: f.name,
    en: f.en,
    family: f.family,
    normalized: f.normalized,
    charCount: f.charCount || 0,
  };
}

/* 近义：A 名包含 B，或 stub 与 fat 同 en */
const byEn = new Map();
for (const f of list) {
  const en = (f.en || '').toLowerCase();
  if (!en) continue;
  if (!byEn.has(en)) byEn.set(en, []);
  byEn.get(en).push(f);
}
for (const [en, rows] of byEn) {
  const fat = rows.filter((f) => (f.charCount || 0) > 0);
  const stub = rows.filter((f) => !(f.charCount || 0));
  if (fat.length && stub.length) {
    report.retiredAliasesSuggested.push({
      en,
      keep: slim(fat[0]),
      retire: stub.map(slim),
      action: 'alias-or-drop-stub',
    });
  }
}

/* slug alias 文件：Cq → Chuanqu 类 */
if (stems.has('Cq') && stems.has('Chuanqu')) {
  report.retiredAliasesSuggested.push({
    note: 'slug-files Cq+Chuanqu both present',
    action: 'keep Chuanqu; alias Cq in family-aliases + bySlug',
  });
}

const out = join(ROOT, 'docs/_catalog-dupe-audit.json');
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log('wrote', out);
console.log('dupNormalized', report.dupNormalized.length);
console.log('dupFamily', report.dupFamily.length);
console.log('sameEnVariants', report.sameEnVariants.length);
console.log('stubsZeroGlyph', report.stubsZeroGlyph.length);
console.log('retiredAliasesSuggested', report.retiredAliasesSuggested.length);
