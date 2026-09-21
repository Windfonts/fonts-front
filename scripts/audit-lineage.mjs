#!/usr/bin/env node
/**
 * 谱系归属审计：fork 的 owner 不得等于上游机构；列出无 lineage 但 metadata 像派生的字体。
 * 用法：node scripts/audit-lineage.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = (name) => JSON.parse(readFileSync(join(ROOT, 'data', name), 'utf8'));

const fonts = data('fonts.json');
const { byName } = data('font-lineage.json');
const { foundries } = data('foundries.json');
const foundryIds = new Set(foundries.map((f) => f.id));

const UPSTREAM = {
  'source-han-sans': 'adobe',
  'source-han-serif': 'adobe',
  'droid-sans': 'google-fonts',
  'ipa-mincho': 'ipa',
  longcang: 'zhongqi',
};

function matchLineage(name) {
  const keys = Object.keys(byName).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (String(name || '').includes(k)) return { key: k, rec: byName[k] };
  }
  return { key: null, rec: null };
}

let exit = 0;
const forkBad = [];
const missingOwner = [];
const noRule = [];

for (const f of fonts) {
  const { key, rec } = matchLineage(f.name);
  if (!rec) {
    const blob = [f.name, f.description, f.copyright, f.designer].join(' ');
    if (/思源|Source Han|IPA|龙藏|Glow Sans|mengshen|猫啃|霞鹜|寒蝉|派生|改自|基于/i.test(blob)) {
      noRule.push(f.name);
    }
    continue;
  }
  if (!foundryIds.has(rec.ownerId)) missingOwner.push({ name: f.name, ownerId: rec.ownerId, key });
  const upstreamId = rec.upstreamOwnerId || (rec.group && UPSTREAM[rec.group]) || '';
  if (rec.relation === 'fork' && upstreamId && rec.ownerId === upstreamId) {
    forkBad.push({ name: f.name, key, ownerId: rec.ownerId, upstreamId });
    exit = 1;
  }
}

console.log('=== fork owner === upstream (应修) ===');
forkBad.forEach((r) => console.log(`  ${r.name}  rule=${r.key}  owner=${r.ownerId}`));
if (!forkBad.length) console.log('  (无)');

console.log('\n=== ownerId 不在 foundries.json ===');
missingOwner.forEach((r) => console.log(`  ${r.name}  ${r.ownerId}`));
if (!missingOwner.length) console.log('  (无)');

console.log('\n=== 无 lineage 但 metadata 像派生 (待补) ===');
noRule.slice(0, 40).forEach((n) => console.log(`  ${n}`));
if (noRule.length > 40) console.log(`  … 还有 ${noRule.length - 40} 款`);
console.log(`共 ${noRule.length} 款`);

process.exit(exit);
