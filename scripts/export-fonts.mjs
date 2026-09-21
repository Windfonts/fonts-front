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
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = process.env.WF_API || 'https://app.windfonts.com';
const PAGE_SIZE = 50;
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'data', 'fonts.json');
const OUT_META = join(ROOT, 'data', 'fonts.meta.json');

/** 预抓头像清单（fetch-avatars.mjs 产出）：slug → 本地 WebP 路径 */
const AVATARS = existsSync(join(ROOT, 'data', 'avatars.json'))
  ? JSON.parse(readFileSync(join(ROOT, 'data', 'avatars.json'), 'utf8'))
  : {};

function designerShort(designer) {
  return String(designer || '').split(/[;；,，]/)[0].trim() || '—';
}

/** 厂商头像：本地预抓 WebP（motuicons pack-media 打法）；无则空，前端走字标 */

async function fetchDetail(normalized) {
  const url = `${API}/api/fonts/${encodeURIComponent(normalized)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const body = await res.json();
  return body?.data || null;
}

/** font-licenses 仓的 license-info.json（授权核实状态/授权原文/须知） */
async function fetchLicenseInfo(normalized) {
  const url = `https://feicode.com/Windfonts/font-licenses/raw/branch/main/licenses/${encodeURIComponent(normalized)}/license-info.json`;
  try {
    const res = await fetchPolite(url, { gap: 80 });
    return await res.json();
  } catch {
    return null;
  }
}

function maxCharCount(detail) {
  let chars = 0;
  let glyphs = 0;
  const weights = detail?.weights || {};
  for (const w of Object.values(weights)) {
    for (const v of Object.values(w.versions || {})) {
      if (v.char_count > chars) chars = v.char_count;
      if (v.glyph_count > glyphs) glyphs = v.glyph_count;
    }
  }
  return { chars, glyphs };
}

function mapFont(raw, detail, licInfo) {
  const weights =
    raw.weights && typeof raw.weights === 'object' && !Array.isArray(raw.weights)
      ? Object.keys(raw.weights)
      : Array.isArray(raw.weights)
        ? raw.weights.map((w) => (typeof w === 'object' ? w.weight_name : String(w)))
        : [];
  const brand = raw.brand || {};
  const cov = detail ? maxCharCount(detail) : { chars: 0, glyphs: 0 };
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
    licenseName: raw.license || '',
    licenseUrl: detail?.licenseUrl || licInfo?.licenseUrl || '',
    licenseFileUrl: licInfo?.licenseFile
      ? `https://feicode.com/Windfonts/font-licenses/src/branch/main/${licInfo.licenseFile}`
      : '',
    licenseNotes: licInfo?.notes || '',
    licenseVerified: licInfo ? Boolean(licInfo.verified) : null,
    purchaseUrl: licInfo?.purchaseUrl || raw.purchaseUrl || null,
    copyright: detail?.copyright || '',
    foundry: raw.foundry || brand.name || '',
    brand: brand.name
      ? {
          name: brand.name,
          slug: brand.slug || '',
          logoUrl: brand.logoUrl || '',
          avatarUrl: brand.logoUrl ? '' : (AVATARS[brand.slug] || ''),
          website: brand.website || '',
          description: brand.description || '',
        }
      : null,
    releaseYear: raw.releaseYear ?? null,
    version: raw.version || '',
    languages: Array.isArray(raw.languages) ? raw.languages : [],
    useCases: Array.isArray(raw.useCases) ? raw.useCases : [],
    charCount: cov.chars,
    glyphCount: cov.glyphs,
    viewCount: raw.viewCount ?? 0,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 429/5xx 退避重试；请求间隔保持礼貌 */
async function fetchPolite(url, { tries = 4, gap = 250 } = {}) {
  for (let i = 0; ; i++) {
    const res = await fetch(url);
    if (res.ok) {
      if (gap) await sleep(gap);
      return res;
    }
    if ((res.status === 429 || res.status >= 500) && i < tries - 1) {
      const wait = Number(res.headers.get('retry-after')) * 1000 || 2000 * (i + 1);
      console.warn(`  ${res.status} on ${url} — wait ${wait}ms`);
      await sleep(wait);
      continue;
    }
    throw new Error(`GET ${url} → ${res.status}`);
  }
}

async function fetchAll() {
  const all = [];
  let page = 1;
  for (;;) {
    const url = `${API}/api/fonts?page=${page}&pageSize=${PAGE_SIZE}`;
    const res = await fetchPolite(url);
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
const mapped = [];
for (const f of published) {
  const [detail, licInfo] = await Promise.all([
    fetchDetail(f.normalizedName).catch(() => null),
    fetchLicenseInfo(f.normalizedName).catch(() => null),
  ]);
  mapped.push(mapFont(f, detail, licInfo));
}
mapped.sort((a, b) => a.normalized.localeCompare(b.normalized));

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
