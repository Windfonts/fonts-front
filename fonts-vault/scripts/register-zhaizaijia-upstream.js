#!/usr/bin/env node
/**
 * Register 天天宅在家 (Zhaizaijia) author-brand stub into vault prod.db.
 * Wave: 2026-09-27 zhaizaijia-upstream-c5 · CDN STOPPED · lineage-stub (no single TTF).
 *
 *   CONFIRM_ZHAIZAIJIA_REGISTER=1 docker exec fonts-vault node /app/register-zhaizaijia-upstream.js
 *
 * License: 作者声明完全免费 — NOT OFL. FWHP trio remains OFL separately.
 */
'use strict';

const { createClient } = require('@libsql/client');

const FACE = {
  norm: 'Zhaizaijia', family: 'wenfeng-zhaizaijia', name: '天天宅在家', en: 'Star Love (author brand)',
  glyphs: 0, chars: 0, brand: 'starlove', version: 'lineage-stub',
  copyright: 'Copyright 2019-2026 天天宅在家 starlove0425 (FULLY FREE to USE)',
  pin: null,
};

async function main() {
  console.log('DRAFT ONLY — refuse to run unless CONFIRM_ZHAIZAIJIA_REGISTER=1');
  if (process.env.CONFIRM_ZHAIZAIJIA_REGISTER !== '1') {
    console.error('Refusing: set CONFIRM_ZHAIZAIJIA_REGISTER=1 after prod.db backup. CDN remains STOPPED.');
    process.exit(2);
  }
  if (!FACE.pin) {
    console.error('Refusing prod write: author-brand stub has no binary pin. Lab catalog stub only.');
    process.exit(3);
  }
  const url = process.env.DATABASE_URL || 'file:/app/data/prod.db';
  const client = createClient({ url });
  const brandRows = await client.execute({
    sql: 'SELECT id, slug FROM brands WHERE slug = ? LIMIT 1',
    args: [FACE.brand],
  });
  const brandId = brandRows.rows[0] && brandRows.rows[0].id;
  if (!brandId) {
    console.error('brand missing:', FACE.brand, '— create starlove manually first');
    process.exit(1);
  }
  console.log('would UPSERT', FACE.norm, 'brand', brandId, '(not reached without pin)');
}

main().catch((e) => { console.error(e); process.exit(1); });
