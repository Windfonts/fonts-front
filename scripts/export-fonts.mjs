#!/usr/bin/env node
/**
 * 导出字体目录：现网 vault API → data/fonts.json（前台静态数据）
 *
 * 真源选择（为什么不是 font-metadata 仓）：
 *  - prod API 的 fontFamily 与 /api/css 自洽（wenfeng-<slug>），预览/嵌入直接可用
 *  - font-metadata 仓（499 条）是超集，含未上 OSS 的字体，family 也未定稿
 *  - 补货进 prod 后重跑本脚本即可扩容货架
 *
 * 用法：
 *   node scripts/export-fonts.mjs            # 拉 https://app.windfonts.com
 *   WF_API=http://127.0.0.1:16015 node scripts/export-fonts.mjs   # 指向本地 vault
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = process.env.WF_API || 'https://app.windfonts.com';
const PAGE_SIZE = 50;
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'data', 'fonts.json');
const OUT_META = join(ROOT, 'data', 'fonts.meta.json');

function designerShort(designer) {
  return String(designer || '').split(/[;；,，]/)[0].trim() || '—';
}

function mapFont(raw) {
  const weights =
    raw.weights && typeof raw.weights === 'object' && !Array.isArray(raw.weights)
      ? Object.keys(raw.weights)
      : Array.isArray(raw.weights)
        ? raw.weights.map((w) => (typeof w === 'object' ? w.weight_name : String(w)))
        : [];
  return {
    id: raw.id,
    name: raw.chineseName || raw.name,
    en: raw.englishName || raw.name,
    family: raw.fontFamily,
    normalized: raw.normalizedName,
    designer: raw.designer || '',
    designerShort: designerShort(raw.designer),
    category: raw.fontCategory || raw.category?.name || '',
    tags: Array.isArray(raw.fontTags) ? raw.fontTags : [],
    weights: weights.length ? weights : ['Regular'],
    description: raw.description || '',
    license: raw.licenseType || '',
    // 增益字段：normalizeFont 为 spread，前台不读不碍事，详情页可用
    licenseName: raw.license || '',
    foundry: raw.foundry || raw.brand?.name || '',
    releaseYear: raw.releaseYear ?? null,
    version: raw.version || '',
    languages: Array.isArray(raw.languages) ? raw.languages : [],
    useCases: Array.isArray(raw.useCases) ? raw.useCases : [],
  };
}

async function fetchAll() {
  const all = [];
  let page = 1;
  for (;;) {
    const url = `${API}/api/fonts?page=${page}&pageSize=${PAGE_SIZE}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    const body = await res.json();
    const data = body?.data?.dataList;
    if (!Array.isArray(data)) throw new Error(`unexpected shape at page ${page}`);
    all.push(...data);
    const pageTotal = body?.data?.pageTotal ?? 1;
    if (page >= pageTotal || data.length === 0) break;
    page++;
  }
  return all;
}

function validate(list) {
  const problems = [];
  const seen = new Map();
  for (const f of list) {
    for (const key of ['id', 'name', 'family', 'normalized']) {
      if (!f[key]) problems.push(`${f.normalized || f.id}: missing ${key}`);
    }
    for (const key of ['id', 'family', 'normalized']) {
      if (seen.has(key + ':' + f[key])) problems.push(`dup ${key} ${f[key]}`);
      seen.set(key + ':' + f[key], true);
    }
  }
  return problems;
}

const raw = await fetchAll();
const published = raw.filter((f) => !f.status || f.status === 'published');
const mapped = published.map(mapFont).sort((a, b) => a.normalized.localeCompare(b.normalized));

const problems = validate(mapped);
if (!mapped.length) throw new Error('0 fonts exported — refusing to overwrite');
if (problems.length) {
  console.error('validation failed:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

writeFileSync(OUT, JSON.stringify(mapped, null, 1) + '\n');
writeFileSync(
  OUT_META,
  JSON.stringify(
    { source: `${API}/api/fonts`, generatedAt: new Date().toISOString(), count: mapped.length },
    null,
    1,
  ) + '\n',
);
console.log(`✅ exported ${mapped.length} fonts → data/fonts.json (from ${raw.length} raw, ${raw.length - published.length} non-published skipped)`);
