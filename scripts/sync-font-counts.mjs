#!/usr/bin/env node
/**
 * 从 vault GET /api/fonts 分页拉 viewCount/downloadCount/apiCallCount 写回 fonts.json。
 * 匿名配额紧（约 100/天）——默认 dry-run 只拉第 1 页；正式跑需 API Key。
 *
 *   node scripts/sync-font-counts.mjs              # dry-run 第 1 页
 *   WF_API_KEY=... node scripts/sync-font-counts.mjs --write
 *   WF_API_ORIGIN=https://vault.windfonts.com node scripts/sync-font-counts.mjs --write --max-pages=20
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/* 过渡期 vault DNS 未通时可：WF_API_ORIGIN=https://app.windfonts.com */
const ORIGIN = process.env.WF_API_ORIGIN || 'https://vault.windfonts.com';
const KEY = (process.env.WF_API_KEY || '').trim();
const WRITE = process.argv.includes('--write');
const maxPages = Number(
  (process.argv.find((a) => a.startsWith('--max-pages=')) || '').split('=')[1] ||
    (WRITE && KEY ? 50 : 1)
);
const size = 50;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fontsPath = join(ROOT, 'data', 'fonts.json');
const fonts = JSON.parse(readFileSync(fontsPath, 'utf8'));
const byFamily = new Map(fonts.map((f) => [String(f.family || '').toLowerCase(), f]));
const byNorm = new Map(
  fonts.map((f) => [String(f.normalized || '').toLowerCase(), f]).filter(([k]) => k)
);

let page = 1;
let total = 0;
let updated = 0;
while (page <= maxPages) {
  const url = `${ORIGIN}/api/fonts?page=${page}&size=${size}&sort=viewCount`;
  const headers = { Accept: 'application/json' };
  if (KEY) headers.Authorization = `Bearer ${KEY}`;
  const res = await fetch(url, { headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code !== 200) {
    console.error('fail', res.status, body.message || body);
    process.exit(1);
  }
  const list = (body.data && body.data.dataList) || [];
  total = (body.data && body.data.total) || total;
  for (const row of list) {
    const fam = String(row.fontFamily || row.family || '').toLowerCase();
    const norm = String(row.normalizedName || row.normalized || '').toLowerCase();
    const hit = byFamily.get(fam) || byNorm.get(norm);
    if (!hit) continue;
    const v = Number(row.viewCount) || 0;
    const d = Number(row.downloadCount) || 0;
    const a = Number(row.apiCallCount) || 0;
    if (
      hit.viewCount === v &&
      hit.downloadCount === d &&
      hit.apiCallCount === a &&
      hit.apiCount === a
    ) {
      continue;
    }
    hit.viewCount = v;
    hit.downloadCount = d;
    hit.apiCallCount = a;
    hit.apiCount = a; /* wf-proto baseFontStats 读 apiCount */
    updated++;
  }
  console.error(`page ${page} got ${list.length} updated=${updated} total=${total}`);
  if (!list.length || page * size >= total) break;
  page++;
  await sleep(KEY ? 200 : 800);
}

if (WRITE) {
  writeFileSync(fontsPath, JSON.stringify(fonts, null, 2) + '\n');
  console.log('wrote fonts.json updated', updated);
} else {
  console.log('dry-run updated(would)', updated, '— pass --write to save');
}
