#!/usr/bin/env node
/**
 * 只刷授权字段 + 厂商生成头像：font-licenses 仓 license-info.json → data/fonts.json
 * （列表 API 限流时的增量通道；授权仓更新后也可单独跑）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'data', 'fonts.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cravatarAvatar(seed) {
  const s = String(seed || '').trim().toLowerCase();
  if (!s) return '';
  const hash = createHash('sha256').update(s).digest('hex');
  return `https://cravatar.com/avatar/${hash}?s=144&d=identicon`;
}

async function fetchLicenseInfo(normalized, tries = 3) {
  const url = `https://feicode.com/Windfonts/font-licenses/raw/branch/main/licenses/${encodeURIComponent(normalized)}/license-info.json`;
  for (let i = 0; ; i++) {
    const res = await fetch(url);
    if (res.ok) {
      await sleep(80);
      try {
        return await res.json();
      } catch {
        return null;
      }
    }
    if (res.status === 404) return null; // 仓里没有该字体 = 未建档
    if (i < tries - 1) {
      await sleep(1500 * (i + 1));
      continue;
    }
    throw new Error(`GET ${url} → ${res.status}`);
  }
}

const fonts = JSON.parse(readFileSync(OUT, 'utf8'));
let merged = 0;
let missing = 0;
for (const f of fonts) {
  const seedName = (f.brand && f.brand.name) || f.foundry || f.designerShort || '';
  f.foundryAvatar = seedName ? cravatarAvatar(seedName) : '';
  if (f.brand && f.brand.name && !f.brand.logoUrl) {
    f.brand.avatarUrl = f.foundryAvatar;
  }
  const info = await fetchLicenseInfo(f.normalized);
  if (!info) {
    f.licenseFileUrl = '';
    f.licenseNotes = '';
    f.licenseVerified = null;
    missing++;
    continue;
  }
  f.licenseUrl = info.licenseUrl || f.licenseUrl || '';
  f.licenseFileUrl = info.licenseFile
    ? `https://feicode.com/Windfonts/font-licenses/src/branch/main/${info.licenseFile}`
    : '';
  f.licenseNotes = info.notes || '';
  f.licenseVerified = Boolean(info.verified);
  f.purchaseUrl = info.purchaseUrl || f.purchaseUrl || null;
  merged++;
}

writeFileSync(OUT, JSON.stringify(fonts, null, 1) + '\n');
console.log(`✅ license fields merged for ${merged} fonts (${missing} without license-info)`);
