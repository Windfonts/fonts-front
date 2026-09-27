#!/usr/bin/env node
/**
 * Register littlelimit bitmap faces (Misaki / k8x12 / k12x8) into vault prod.db.
 * Wave: 2026-09-27 littlelimit-bitmap-missing · CDN STOPPED · DO NOT run until Bot gate.
 *
 *   CONFIRM_LITTLELIMIT_REGISTER=1 docker exec fonts-vault node /app/register-littlelimit-bitmap.js
 *
 * - UPSERT by normalized_name
 * - oss_path=/fonts-packages/{Norm} (NO CDN upload)
 * - brand: littlelimit
 * Red lines: backup prod.db first; SELECT readback; do not touch CDN / ANALYSIS_META_VER.
 * License: littlelimit free software — NOT OFL (same text as k6x8 / font.htm).
 */
'use strict';

const { createClient } = require('@libsql/client');

const FACES = [
  { norm: 'Misakig', family: 'wenfeng-misakig', name: '美咲ゴシック', en: 'Misaki Gothic', glyphs: 7174, chars: 7192, version: '2021.0505', copyright: 'Copyright (C) 2002-2021 Num Kadoma', pin: 'misaki_ttf_2021-05-05' },
  { norm: 'Misakim', family: 'wenfeng-misakim', name: '美咲明朝', en: 'Misaki Mincho', glyphs: 7174, chars: 7192, version: '2021.0505', copyright: 'Copyright (C) 2002-2021 Num Kadoma', pin: 'misaki_ttf_2021-05-05' },
  { norm: 'Misakig2nd', family: 'wenfeng-misakig2nd', name: '美咲ゴシック第2', en: 'Misaki Gothic 2nd', glyphs: 7173, chars: 7191, version: '2021.0505', copyright: 'Copyright (C) 2002-2021 Num Kadoma', pin: 'misaki_ttf_2021-05-05' },
  { norm: 'K8x12', family: 'wenfeng-k8x12', name: 'k8x12', en: 'k8x12', glyphs: 7173, chars: 7192, version: '2021.0505', copyright: 'Copyright (C) 2015-2021 Num Kadoma', pin: 'k8x12_ttf_2021-05-05' },
  { norm: 'K8x12l', family: 'wenfeng-k8x12l', name: 'k8x12L', en: 'k8x12L', glyphs: 7173, chars: 7192, version: '2021.0505', copyright: 'Copyright (C) 2015-2021 Num Kadoma', pin: 'k8x12_ttf_2021-05-05' },
  { norm: 'K8x12s', family: 'wenfeng-k8x12s', name: 'k8x12S', en: 'k8x12S', glyphs: 7173, chars: 7192, version: '2021.0505', copyright: 'Copyright (C) 2015-2021 Num Kadoma', pin: 'k8x12_ttf_2021-05-05' },
  { norm: 'K12x8', family: 'wenfeng-k12x8', name: 'k12x8', en: 'k12x8', glyphs: 3784, chars: 3802, version: '2021.0505', copyright: 'Copyright (C) 2021 Num Kadoma', pin: 'k12x8_ttf_2021-05-05' },
];

async function main() {
  console.log('DRAFT ONLY — refuse to run unless CONFIRM_LITTLELIMIT_REGISTER=1');
  if (process.env.CONFIRM_LITTLELIMIT_REGISTER !== '1') {
    console.error('Refusing: set CONFIRM_LITTLELIMIT_REGISTER=1 after prod.db backup. CDN remains STOPPED.');
    process.exit(2);
  }
  const url = process.env.DATABASE_URL || 'file:/app/data/prod.db';
  const client = createClient({ url });
  const brandRows = await client.execute({
    sql: 'SELECT id, slug FROM brands WHERE slug = ? LIMIT 1',
    args: ['littlelimit'],
  });
  const brandId = brandRows.rows[0] && brandRows.rows[0].id;
  if (!brandId) {
    console.error('brand missing: littlelimit — create manually first');
    process.exit(1);
  }
  for (const f of FACES) {
    const existing = await client.execute({
      sql: 'SELECT id FROM fonts WHERE normalized_name = ? OR font_family = ? LIMIT 1',
      args: [f.norm, f.family],
    });
    const desc = `${f.name}（${f.en}）。littlelimit free software（非 OFL）。钉 ${f.pin}。CDN STOPPED。`;
    if (existing.rows.length) {
      await client.execute({
        sql: `UPDATE fonts SET
          license_name = ?, license_url = ?, copyright = ?, description = ?,
          version = ?, glyph_count = ?, char_count = ?, brand_id = ?,
          oss_path = ?, updated_at = datetime('now')
          WHERE id = ?`,
        args: [
          'littlelimit free software (M+ lineage note)',
          'https://littlelimit.net/font.htm',
          f.copyright,
          desc,
          f.version,
          f.glyphs,
          f.chars,
          brandId,
          `/fonts-packages/${f.norm}`,
          existing.rows[0].id,
        ],
      });
      console.log('updated', f.norm, existing.rows[0].id);
    } else {
      console.log('INSERT path not fully implemented in draft — create row manually or extend script. Missing', f.norm);
    }
  }
  console.log('done (CDN still STOPPED)');
}

main().catch((e) => { console.error(e); process.exit(1); });
