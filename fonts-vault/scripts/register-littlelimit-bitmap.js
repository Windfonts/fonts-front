#!/usr/bin/env node
/**
 * Register littlelimit bitmap faces (Misaki / k8x12 / k12x8) into vault prod.db.
 * Wave: 2026-09-27 littlelimit-bitmap-missing · CDN STOPPED · tip catalog 095e7e3
 *
 *   CONFIRM_LITTLELIMIT_REGISTER=1 docker exec -e CONFIRM_LITTLELIMIT_REGISTER fonts-vault \
 *     node /app/register-littlelimit-bitmap.js
 *
 * - UPSERT by normalized_name / font_family / id
 * - oss_path=/fonts-packages/{Norm} (NO CDN upload)
 * - brand: littlelimit (reuse from k6x8 wave)
 * Red lines: backup prod.db first; SELECT readback; do not touch CDN / ANALYSIS_META_VER.
 * License: littlelimit free software (M+ lineage note) — NOT OFL (same as k6x8 / font.htm).
 */
'use strict';

const { createClient } = require('@libsql/client');

const TIP = '095e7e3';
const LICENSE = 'littlelimit free software (M+ lineage note)';
const LICENSE_TYPE = '开源商用';
const LICENSE_URL = 'https://littlelimit.net/font.htm';

const BRAND = {
  id: '7d17944c-5112-5a59-8a07-b58ccf985e5f',
  slug: 'littlelimit',
  name: 'littlelimit',
  website: 'https://littlelimit.net/',
  description:
    '門真なむ（Num Kadoma）。k6x8 / 美咲フォント / k8x12 / k12x8 等极小点阵；站点自由软件许可（非 OFL）。CDN STOPPED。tip ' +
    TIP +
    '。',
};

const CAT_SANS = { name: '无衬线字体', id: '34a366d5-8fce-4372-9621-c77161d1947c' };
const CAT_SONG = { name: '宋体', id: 'f08be474-1b71-4a22-95cd-7a9963ba3dcd' };

const FAMILIES = [
  {
    id: '7b1fe6cf-14ce-4982-83f7-49733f24967e',
    norm: 'Misakig',
    family: 'wenfeng-misakig',
    name: '美咲ゴシック',
    en: 'Misaki Gothic',
    glyphs: 7174,
    chars: 7192,
    cat: CAT_SANS,
    version: '2021.0505',
    copyright: 'Copyright (C) 2002-2021 Num Kadoma',
    pin: 'misaki_ttf_2021-05-05',
    year: 2021,
    tags: ['像素', '位图', '美咲', '日文', '开源', '自由软件'],
  },
  {
    id: 'a60b6dbd-83ac-47cd-bad6-649fbb532c2e',
    norm: 'Misakim',
    family: 'wenfeng-misakim',
    name: '美咲明朝',
    en: 'Misaki Mincho',
    glyphs: 7174,
    chars: 7192,
    cat: CAT_SONG,
    version: '2021.0505',
    copyright: 'Copyright (C) 2002-2021 Num Kadoma',
    pin: 'misaki_ttf_2021-05-05',
    year: 2021,
    tags: ['像素', '位图', '美咲', '日文', '开源', '自由软件', '明朝'],
  },
  {
    id: '78812b21-81bd-4889-ad98-d8f5190fa52c',
    norm: 'Misakig2nd',
    family: 'wenfeng-misakig2nd',
    name: '美咲ゴシック第2',
    en: 'Misaki Gothic 2nd',
    glyphs: 7173,
    chars: 7191,
    cat: CAT_SANS,
    version: '2021.0505',
    copyright: 'Copyright (C) 2002-2021 Num Kadoma',
    pin: 'misaki_ttf_2021-05-05',
    year: 2021,
    tags: ['像素', '位图', '美咲', '日文', '开源', '自由软件'],
  },
  {
    id: '7ef8b8f5-827e-4c76-ade0-ee4f936062db',
    norm: 'K8x12',
    family: 'wenfeng-k8x12',
    name: 'k8x12',
    en: 'k8x12',
    glyphs: 7173,
    chars: 7192,
    cat: CAT_SANS,
    version: '2021.0505',
    copyright: 'Copyright (C) 2015-2021 Num Kadoma',
    pin: 'k8x12_ttf_2021-05-05',
    year: 2021,
    tags: ['像素', '位图', 'k8x12', '日文', '开源', '自由软件'],
  },
  {
    id: 'a8ec0bbf-be9c-4eaf-94e2-acaa5cfcaeaf',
    norm: 'K8x12l',
    family: 'wenfeng-k8x12l',
    name: 'k8x12L',
    en: 'k8x12L',
    glyphs: 7173,
    chars: 7192,
    cat: CAT_SANS,
    version: '2021.0505',
    copyright: 'Copyright (C) 2015-2021 Num Kadoma',
    pin: 'k8x12_ttf_2021-05-05',
    year: 2021,
    tags: ['像素', '位图', 'k8x12', '日文', '开源', '自由软件'],
  },
  {
    id: '44ce8d06-e36b-4778-bfa1-1409ee253342',
    norm: 'K8x12s',
    family: 'wenfeng-k8x12s',
    name: 'k8x12S',
    en: 'k8x12S',
    glyphs: 7173,
    chars: 7192,
    cat: CAT_SANS,
    version: '2021.0505',
    copyright: 'Copyright (C) 2015-2021 Num Kadoma',
    pin: 'k8x12_ttf_2021-05-05',
    year: 2021,
    tags: ['像素', '位图', 'k8x12', '日文', '开源', '自由软件'],
  },
  {
    id: 'cf7cf503-cb0a-4a30-a1c7-ded3474402f9',
    norm: 'K12x8',
    family: 'wenfeng-k12x8',
    name: 'k12x8',
    en: 'k12x8',
    glyphs: 3784,
    chars: 3802,
    cat: CAT_SANS,
    version: '2021.0505',
    copyright: 'Copyright (C) 2021 Num Kadoma',
    pin: 'k12x8_ttf_2021-05-05',
    year: 2021,
    tags: ['像素', '位图', 'k12x8', '日文', '开源', '自由软件', 'alpha'],
    extraNote: 'α版：JIS 第一水準のみ；第二水準未実装。',
  },
];

function buildWeights(fam) {
  return JSON.stringify({
    Regular: {
      font_family: fam.family,
      weight_name: 'Regular',
      font_weight: 400,
      versions: {
        original: {
          file: 'Regular.ttf',
          char_count: fam.chars,
          glyph_count: fam.glyphs,
          subfamily_name: 'Regular',
          typographic_subfamily: 'Regular',
        },
      },
    },
  });
}

function desc(fam) {
  const extra = fam.extraNote ? ` ${fam.extraNote}` : '';
  return `${fam.name}（${fam.en}）。littlelimit free software（非 OFL）。钉 ${fam.pin}。CDN STOPPED。tip ${TIP}。${extra}`;
}

function licenseNotes(fam) {
  return `littlelimit free software pin ${fam.pin}. NOT OFL. ${LICENSE_URL}. Same text as k6x8 / font.htm. CDN STOPPED. tip ${TIP}.`;
}

(async () => {
  console.log('DRAFT FIXED — refuse unless CONFIRM_LITTLELIMIT_REGISTER=1');
  if (process.env.CONFIRM_LITTLELIMIT_REGISTER !== '1') {
    console.error(
      'Refusing: set CONFIRM_LITTLELIMIT_REGISTER=1 after prod.db backup. CDN remains STOPPED.',
    );
    process.exit(2);
  }

  const url = process.env.DATABASE_URL || 'file:/app/data/prod.db';
  const c = createClient({ url });

  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);
  const bak = `/app/data/prod.db.bak-${stamp}-preLittlelimit`;
  try {
    await c.execute(`VACUUM INTO '${bak}'`);
    console.log('backup', bak);
  } catch (e) {
    console.warn('VACUUM INTO failed, continue:', e.message || e);
  }

  const before = await c.execute('select count(*) n from fonts');
  const n0 = Number(before.rows[0].n ?? before.rows[0][0]);
  console.log('fonts rows before:', n0);

  const now = Math.floor(Date.now() / 1000);
  let brandOp = 'reuse';
  const brandRows = await c.execute({
    sql: 'SELECT id, slug, name FROM brands WHERE slug = ? OR id = ? LIMIT 1',
    args: [BRAND.slug, BRAND.id],
  });
  let brandId = brandRows.rows[0] && brandRows.rows[0].id;
  if (!brandId) {
    brandId = BRAND.id;
    await c.execute({
      sql: `insert into brands (id, name, slug, description, website, status, created_at, updated_at)
            values (?,?,?,?,?,'published',?,?)`,
      args: [brandId, BRAND.name, BRAND.slug, BRAND.description, BRAND.website, now, now],
    });
    brandOp = 'insert';
    console.log('brand INSERT', BRAND.slug, brandId);
  } else {
    await c.execute({
      sql: `update brands set description=?, website=?, updated_at=? where id=?`,
      args: [BRAND.description, BRAND.website, now, brandId],
    });
    brandOp = 'update';
    console.log('brand UPDATE', BRAND.slug, brandId);
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;
  const results = [];

  for (const fam of FAMILIES) {
    const weights = buildWeights(fam);
    const licenseDesc = licenseNotes(fam);
    const description = desc(fam);

    try {
      const existing = await c.execute({
        sql: 'SELECT id, normalized_name, font_family, status FROM fonts WHERE normalized_name = ? OR font_family = ? OR id = ? LIMIT 1',
        args: [fam.norm, fam.family, fam.id],
      });

      if (existing.rows.length) {
        const rowId = existing.rows[0].id;
        await c.execute({
          sql: `UPDATE fonts SET
            name=?, english_name=?, chinese_name=?, font_family=?, original_name=?,
            weights=?, version=?, copyright=?, description=?, designer=?, foundry=?,
            release_year=?, font_category=?, category_id=?, brand_id=?,
            tags=?, font_tags=?, languages=?, use_cases=?,
            license=?, license_type=?, license_description=?,
            oss_path=?, status=?, updated_at=strftime('%s','now')
          WHERE id=?`,
          args: [
            fam.name,
            fam.en,
            fam.name,
            fam.family,
            fam.norm,
            weights,
            fam.version,
            fam.copyright,
            description,
            '門真なむ',
            'littlelimit',
            fam.year,
            fam.cat.name,
            fam.cat.id,
            brandId,
            JSON.stringify(fam.tags),
            JSON.stringify([]),
            JSON.stringify(['日文', '英语']),
            JSON.stringify(['屏幕阅读', '标题', '复古像素']),
            LICENSE,
            LICENSE_TYPE,
            licenseDesc,
            `/fonts-packages/${fam.norm}`,
            'published',
            rowId,
          ],
        });
        console.log('UPDATED', fam.norm, rowId);
        updated++;
        results.push({ norm: fam.norm, op: 'UPDATE', id: rowId });
      } else {
        await c.execute({
          sql: `INSERT INTO fonts (
            id, normalized_name, name, english_name, chinese_name, font_family, original_name,
            weights, version, copyright, description, designer, foundry, release_year,
            font_category, category_id, brand_id, tags, font_tags, languages, use_cases,
            license, license_type, license_description, oss_path,
            view_count, download_count, api_call_count, status, created_at, updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,'published', strftime('%s','now'), strftime('%s','now'))`,
          args: [
            fam.id,
            fam.norm,
            fam.name,
            fam.en,
            fam.name,
            fam.family,
            fam.norm,
            weights,
            fam.version,
            fam.copyright,
            description,
            '門真なむ',
            'littlelimit',
            fam.year,
            fam.cat.name,
            fam.cat.id,
            brandId,
            JSON.stringify(fam.tags),
            JSON.stringify([]),
            JSON.stringify(['日文', '英语']),
            JSON.stringify(['屏幕阅读', '标题', '复古像素']),
            LICENSE,
            LICENSE_TYPE,
            licenseDesc,
            `/fonts-packages/${fam.norm}`,
          ],
        });
        console.log('INSERTED', fam.norm, fam.id);
        inserted++;
        results.push({ norm: fam.norm, op: 'INSERT', id: fam.id });
      }

      const read = await c.execute({
        sql: `SELECT id, normalized_name, font_family, name, status, oss_path, brand_id,
                     font_category, version, license, license_description, weights
              FROM fonts WHERE normalized_name=?`,
        args: [fam.norm],
      });
      if (read.rows.length !== 1) {
        console.error('READBACK FAIL', fam.norm, read.rows);
        failed++;
        results[results.length - 1].readback = 'FAIL';
        continue;
      }
      const row = read.rows[0];
      const w = typeof row.weights === 'string' ? JSON.parse(row.weights) : row.weights;
      const glyph =
        w && w.Regular && w.Regular.versions && w.Regular.versions.original
          ? w.Regular.versions.original.glyph_count
          : null;
      console.log(
        'READBACK',
        JSON.stringify({
          id: row.id,
          norm: row.normalized_name,
          family: row.font_family,
          oss_path: row.oss_path,
          brand_id: row.brand_id,
          version: row.version,
          license: row.license,
          glyph,
        }),
      );
      results[results.length - 1].glyph = glyph;
      if (row.license && String(row.license).includes('OFL')) {
        console.error('LICENSE OFL GUARD FAIL', fam.norm, row.license);
        failed++;
        results[results.length - 1].readback = 'OFL_FAIL';
      }
    } catch (e) {
      console.error('FAIL', fam.norm, e.message || e);
      failed++;
      results.push({ norm: fam.norm, op: 'FAIL', err: String(e.message || e) });
    }
  }

  const after = await c.execute('select count(*) n from fonts');
  const n1 = Number(after.rows[0].n ?? after.rows[0][0]);
  const summary = {
    wave: 'littlelimit-bitmap-missing',
    tipCatalog: TIP,
    license: LICENSE,
    backup: bak,
    before: n0,
    after: n1,
    delta: n1 - n0,
    inserted,
    updated,
    failed,
    brand: { op: brandOp, id: brandId, slug: BRAND.slug },
    norms: FAMILIES.map((f) => f.norm),
    results,
    cdn: 'NOT_TOUCHED',
    analysisMeta: 'NOT_BUMPED',
  };
  console.log(JSON.stringify(summary, null, 2));
  if (failed) process.exit(1);
  console.log('OK register-littlelimit-bitmap');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
