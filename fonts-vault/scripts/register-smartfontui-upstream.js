#!/usr/bin/env node
/**
 * Register 03スマートフォントUI (SmartFontUI) into vault prod.db.
 * Wave: 2026-09-27 smartfontui-upstream-c4 · CDN STOPPED · lineage-stub (no binary pin).
 *
 *   CONFIRM_SMARTFONTUI_REGISTER=1 docker exec fonts-vault node /app/register-smartfontui-upstream.js
 *
 * Red lines: backup prod.db first; do not touch CDN / ANALYSIS_META_VER.
 * License: IPA Font License 1.0 — NOT OFL. FLOP webfont/APP embed banned without kit.
 * This draft refuses to invent oss glyphs while packages missing.
 */
'use strict';

const { createClient } = require('@libsql/client');

const FACE = {
  norm: 'SmartFontUI', family: 'wenfeng-smartfontui', name: '03スマートフォントUI', en: 'Smart Font UI',
  glyphs: 0, chars: 0, brand: 'flopdesign', version: 'lineage-stub',
  copyright: 'Copyright(c) Information-technology Promotion Agency, Japan (IPA), 2003-2014. / Copyright (C) 1998-2014 FLOP DESIGN',
  pin: null,
};

async function main() {
  console.log('DRAFT ONLY — refuse to run unless CONFIRM_SMARTFONTUI_REGISTER=1');
  if (process.env.CONFIRM_SMARTFONTUI_REGISTER !== '1') {
    console.error('Refusing: set CONFIRM_SMARTFONTUI_REGISTER=1 after prod.db backup. CDN remains STOPPED.');
    process.exit(2);
  }
  if (!FACE.pin) {
    console.error('Refusing prod write: no binary pin this wave (BOOTH login / freefont 403). Catalog stub only on lab.');
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
    console.error('brand missing:', FACE.brand, '— create flopdesign manually first');
    process.exit(1);
  }
  console.log('would UPSERT', FACE.norm, 'brand', brandId, '(not reached without pin)');
}

main().catch((e) => { console.error(e); process.exit(1); });
