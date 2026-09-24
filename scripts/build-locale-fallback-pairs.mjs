#!/usr/bin/env node
/**
 * 从 font-products + 目录命名启发式生成简繁 localeFallback 配对表。
 * 输出 data/locale-fallback-pairs.json（构建期；vault 同步同文件）。
 *
 * 用法：node scripts/build-locale-fallback-pairs.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fonts = JSON.parse(readFileSync(join(ROOT, 'data', 'fonts.json'), 'utf8'));
const products = JSON.parse(readFileSync(join(ROOT, 'data', 'font-products.json'), 'utf8'));

const byFamily = new Map(fonts.map((f) => [String(f.family || '').toLowerCase(), f]));

const SC = new Set(['sc', 'cn', 'hans', 'gb']);
const TC = new Set(['tc', 'tw', 'hant']);

/** @type {Map<string, { sc: string, tc: string, productId?: string, source: string }>} */
const pairs = new Map();

function addPair(sc, tc, meta) {
  const a = String(sc || '').trim();
  const b = String(tc || '').trim();
  if (!a || !b || a === b) return;
  if (!byFamily.has(a.toLowerCase()) || !byFamily.has(b.toLowerCase())) return;
  const key = [a.toLowerCase(), b.toLowerCase()].sort().join('|');
  if (pairs.has(key)) return;
  pairs.set(key, {
    scFamily: a,
    tcFamily: b,
    productId: meta.productId || null,
    source: meta.source,
    localeFallbackAllowed: true,
  });
}

/* 1) font-products axes.charset */
for (const prod of products.products || []) {
  const bucket = { sc: [], tc: [] };
  for (const m of prod.members || []) {
    const cs = String((m.axes && m.axes.charset) || '').toLowerCase();
    if (SC.has(cs)) bucket.sc.push(m.family);
    if (TC.has(cs)) bucket.tc.push(m.family);
  }
  /* full/std 主款也可对 TC（霞鹜文楷） */
  const fullish = (prod.members || [])
    .filter((m) => {
      const cs = String((m.axes && m.axes.charset) || '').toLowerCase();
      return !cs || cs === 'full';
    })
    .map((m) => m.family);
  for (const sc of bucket.sc.length ? bucket.sc : fullish) {
    for (const tc of bucket.tc) addPair(sc, tc, { productId: prod.id, source: 'font-products' });
  }
}

/* 2) 短码后缀启发式：同 stem 下所有 sc|cn|… 与所有 tc|tw|… 两两配对 */
const stemMap = new Map();
for (const f of fonts) {
  const fam = String(f.family || '');
  const m = /^(wenfeng-.+?)(sc|tc|cn|tw|hans|hant|gb)$/i.exec(fam);
  if (!m) continue;
  const stem = m[1].toLowerCase();
  const suf = m[2].toLowerCase();
  if (!stemMap.has(stem)) stemMap.set(stem, { sc: [], tc: [] });
  const slot = stemMap.get(stem);
  if (SC.has(suf)) slot.sc.push(fam);
  if (TC.has(suf)) slot.tc.push(fam);
}
for (const [stem, slot] of stemMap) {
  for (const sc of slot.sc) {
    for (const tc of slot.tc) {
      addPair(sc, tc, { source: 'family-suffix:' + stem });
    }
  }
}

/* 3) 显式补强：主推 SC 正名 ↔ 繁体（避免只落到 CN 变体） */
const EXPLICIT = [
  ['wenfeng-syhtsc', 'wenfeng-syhttw'],
  ['wenfeng-systsc', 'wenfeng-systtc'],
  ['wenfeng-xwwk', 'wenfeng-xwwktc'],
];
for (const [sc, tc] of EXPLICIT) {
  addPair(sc, tc, { source: 'explicit' });
}

const list = [...pairs.values()].sort((a, b) =>
  a.scFamily.localeCompare(b.scFamily)
);

/* 按 family 反查：任一端 → 兄弟 */
const byMember = {};
for (const p of list) {
  byMember[p.scFamily] = {
    peer: p.tcFamily,
    role: 'sc',
    peerRole: 'tc',
    localeFallbackAllowed: p.localeFallbackAllowed,
    productId: p.productId,
  };
  byMember[p.tcFamily] = {
    peer: p.scFamily,
    role: 'tc',
    peerRole: 'sc',
    localeFallbackAllowed: p.localeFallbackAllowed,
    productId: p.productId,
  };
}

const out = {
  $schema: './locale-fallback-pairs.schema.json',
  note: '简繁兄弟配对。localeFallback=auto|sc|tc 由 vault 展开为第二 family；不做码点转换。',
  generatedAt: new Date().toISOString().slice(0, 10),
  pairs: list,
  byFamily: byMember,
};

const path = join(ROOT, 'data', 'locale-fallback-pairs.json');
writeFileSync(path, JSON.stringify(out, null, 2) + '\n');
console.error('wrote', path, 'pairs', list.length, 'members', Object.keys(byMember).length);
