#!/usr/bin/env node
/**
 * N5：把 vault 热度写回 data/fonts.json（构建期 / 手动，不进页面运行时）。
 *
 * 用法：
 *   node scripts/sync-font-counts.mjs                  # 默认 ssh feicode-prod 查库
 *   node scripts/sync-font-counts.mjs --host feicode-prod
 *   node scripts/sync-font-counts.mjs --from-json counts.json
 *   node scripts/sync-font-counts.mjs --dry-run
 *
 * counts.json 形态：[{ "family": "wenfeng-xxx", "viewCount": 1, "downloadCount": 0, "apiCallCount": 0 }, ...]
 * 或 vault 行：[{ "font_family", "view_count", "download_count", "api_call_count" }, ...]
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS_PATH = join(ROOT, 'data', 'fonts.json');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i < 0) return fallback;
  const v = process.argv[i + 1];
  if (!v || v.startsWith('--')) return true;
  return v;
}

function normalizeRow(row) {
  const family = String(row.family || row.font_family || row.fontFamily || '').trim();
  if (!family) return null;
  return {
    family,
    viewCount: Number(row.viewCount ?? row.view_count ?? 0) || 0,
    downloadCount: Number(row.downloadCount ?? row.download_count ?? 0) || 0,
    apiCallCount: Number(row.apiCallCount ?? row.api_call_count ?? 0) || 0,
  };
}

function loadFromJson(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const list = Array.isArray(raw) ? raw : raw.dataList || raw.data || [];
  return list.map(normalizeRow).filter(Boolean);
}

function loadFromSsh(host) {
  const remote = `
docker exec fonts-vault node -e '
const {createClient}=require("@libsql/client");
(async()=>{
  const c=createClient({url:"file:/app/data/prod.db"});
  const r=await c.execute(
    "select font_family, view_count, download_count, api_call_count from fonts where status=?",
    ["published"]
  );
  process.stdout.write(JSON.stringify(r.rows));
})().catch(e=>{console.error(e);process.exit(1)})
'
`.trim();
  const res = spawnSync('ssh', ['-o', 'BatchMode=yes', host, remote], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout || 'ssh failed');
    process.exit(res.status || 1);
  }
  const rows = JSON.parse(res.stdout.trim() || '[]');
  return rows.map(normalizeRow).filter(Boolean);
}

function main() {
  const dry = process.argv.includes('--dry-run');
  const fromJson = arg('--from-json');
  const host = arg('--host', 'feicode-prod');

  const rows = fromJson ? loadFromJson(fromJson) : loadFromSsh(host);
  const byFamily = new Map();
  for (const r of rows) byFamily.set(r.family.toLowerCase(), r);

  const fonts = JSON.parse(readFileSync(FONTS_PATH, 'utf8'));
  if (!Array.isArray(fonts)) {
    console.error('fonts.json must be an array');
    process.exit(1);
  }

  let matched = 0;
  let changed = 0;
  const missing = [];

  for (const f of fonts) {
    const fam = String(f.family || '').trim().toLowerCase();
    const hit = byFamily.get(fam);
    if (!hit) {
      missing.push(f.family || f.name);
      continue;
    }
    matched += 1;
    const before = {
      viewCount: f.viewCount ?? 0,
      downloadCount: f.downloadCount ?? 0,
      apiCallCount: f.apiCallCount ?? 0,
    };
    if (
      before.viewCount !== hit.viewCount ||
      before.downloadCount !== hit.downloadCount ||
      before.apiCallCount !== hit.apiCallCount
    ) {
      changed += 1;
    }
    f.viewCount = hit.viewCount;
    f.downloadCount = hit.downloadCount;
    f.apiCallCount = hit.apiCallCount;
  }

  console.error(
    JSON.stringify(
      {
        source: fromJson || `ssh:${host}`,
        vaultRows: rows.length,
        catalog: fonts.length,
        matched,
        changed,
        missingInVault: missing.length,
        sampleMissing: missing.slice(0, 8),
        dryRun: dry,
      },
      null,
      2
    )
  );

  if (dry) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const bak = join(ROOT, 'data', `fonts.json.bak-counts-${stamp}`);
  copyFileSync(FONTS_PATH, bak);
  writeFileSync(FONTS_PATH, JSON.stringify(fonts, null, 2) + '\n');
  console.error('wrote', FONTS_PATH, 'backup', bak);
}

main();
