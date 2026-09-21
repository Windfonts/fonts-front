#!/usr/bin/env node
/**
 * 猎取厂商真实头像 → WebP 本地静态资源（motuicons hunt-author-avatars 打法扩展）
 * 源优先级：GitHub 组织原图 → 官网 HTML（og:image / apple-touch-icon / 大 logo img）→ 微博搜索 avatar_hd → 缺走字标
 * 拒收：GitHub identicon / 同名个人号 / <72px / HTML / 占位。真 logo 后续覆盖同名 webp 即可。
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'assets', 'avatars');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MIN_PX = 72;

/** GitHub 组织候选（原图直出，不带 size） */
const GITHUB = {
  'adobe': ['adobe'],
  'google-fonts': ['google', 'googlefonts'],
  'microsoft': ['microsoft'],
  'ibm': ['ibm'],
  'bytedance': ['bytedance'],
  'alibaba-design': ['alibaba', 'AlibabaDesign'],
  'lxgw': ['lxgw'],
  'atelier-anchor': ['atelier-anchor'],
  'oppo': ['oppo'],
  'xiaomi': ['XiaomiMi', 'xiaomi'],
  'dingtalk': ['dingtalk'],
  'douyu': ['douyu'],
  'sandoll': ['sandoll'],
  'poppy-works': ['poppy-works'],
  'welai': ['welai'],
  'wenquanyi': ['wenquanyi'],
  'raptortype': ['RaptorType'],
  'mengshen': ['MaruTama'],
  'kuaikan': ['kuaikan'],
  'mplus': ['coz-m'],
  'ichiten': ['ichitenfont'],
};
const GH_DENY = new Set(['chilltype', 'zcool', 'mengshen', 'mplus', 'sandoll']);

/** 官网补充（foundries.json 里 website 为空但确定的） */
const SITE = {
  'zitijia': 'https://www.zitijia.com',
  'gnu': 'https://www.gnu.org',
  'ipa': 'https://www.moji.or.jp',
  'mplus': 'https://mplusfonts.com',
  'fontree': 'https://www.fontree.cn',
};

/** 微博搜索关键词（只挑品牌性强、错认风险低的） */
const WEIBO = {
  'hanyi': '汉仪字库',
  'pangmen': '庞门正道',
  'huxiaobo': '胡晓波',
  'kingsoft-cloud': '金山云',
  'founder': '方正字库',
  'zcool': '站酷',
  'zitijia': '字体家',
  'qiantu': '千图网',
  'shetu': '摄图网',
  'zihun': '字魂',
  'uisdc': '优设',
  'ruixian': '锐字潮字',
};

/** 没头像可猎的（个人作者/已死项目），跳过节省时间 */
const SKIP = new Set([
  'jiazhiyong', 'zojitype', 'watamochi', 'myil', 'longcang', 'aoyagi-kouzan',
  'potta', 'dinglie', 'scf', 'flexifont', 'pinru', 'zhuojian',
  'qingke', 'xyzy', 'xianlifang', 'longquansi', 'do-font', 'writes',
  'ascender', 'nsd', 'seto', 'wencang', 'ymnk',
  'baotu', 'chilltype', 'mengshen', 'huxiaobo', 'pangmen', 'uisdc',
  'kuaikan', 'mplus', 'ipa', 'gongfan', 'tsanger', 'founder', 'shetu', 'fontree',
]);

function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }
function looksHtml(buf) {
  const head = buf.subarray(0, 200).toString('latin1').trim().toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('{');
}

async function httpGet(url, opts) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': (opts && opts.accept) || 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8', ...(opts && opts.headers) },
      signal: AbortSignal.timeout(14000),
      redirect: 'follow',
    });
    if (!res.ok) return { code: res.status, buf: null, text: null };
    if (opts && opts.text) return { code: res.status, buf: null, text: await res.text() };
    const ab = await res.arrayBuffer();
    if (ab.byteLength > 2_000_000) return { code: 413, buf: null, text: null };
    return { code: res.status, buf: Buffer.from(ab), text: null };
  } catch { return { code: 0, buf: null, text: null }; }
}

const GH_IDENTICON_HASH = new Map();
async function ghIdenticonHash(org) {
  if (GH_IDENTICON_HASH.has(org)) return GH_IDENTICON_HASH.get(org);
  const r = await httpGet(`https://github.com/identicons/${org}.png`);
  const h = r.buf && r.buf.length > 80 ? sha256(r.buf) : '';
  GH_IDENTICON_HASH.set(org, h);
  return h;
}

async function isPlaceholder(url, buf) {
  if (!buf || buf.length < 500) return true;
  if (looksHtml(buf)) return true;
  if (/identicons?|d=mp|d=identicon/i.test(url)) return true;
  const m = url.match(/github\.com\/([^/.?]+)/i);
  if (m) {
    const ih = await ghIdenticonHash(m[1].toLowerCase());
    if (ih && sha256(buf) === ih) return true;
  }
  return false;
}

function extOf(buf) {
  const h4 = buf.subarray(0, 4).toString('hex');
  if (h4 === '89504e47') return '.png';
  if (buf.subarray(0, 3).toString('hex') === 'ffd8ff') return '.jpg';
  if (h4 === '00000100') return '.ico';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF') return '.webp';
  if (buf.subarray(0, 3).toString('latin1') === 'GIF') return '.gif';
  return '.img';
}

function pxOf(file) {
  try {
    const out = execFileSync('sips', ['-g', 'pixelWidth', file]).toString();
    return parseInt((out.match(/pixelWidth:\s*(\d+)/) || [])[1] || '0', 10);
  } catch { return 0; }
}

function toWebp(buf, dest) {
  if (buf.length < 1400) return false; // 小图连字节都少，先挡一道
  const tmp = dest.replace(/\.webp$/, extOf(buf));
  writeFileSync(tmp, buf);
  try {
    const input = extOf(buf) === '.ico' ? tmp + '.png' : tmp;
    if (input !== tmp) execFileSync('sips', ['-s', 'format', 'png', tmp, '--out', input], { stdio: 'ignore' });
    if (pxOf(input) < MIN_PX) return false;
    execFileSync('cwebp', ['-quiet', '-q', '92', input, '-o', dest]);
    return existsSync(dest);
  } catch { return false; } finally {
    try { rmSync(tmp); } catch {}
    try { rmSync(tmp + '.png'); } catch {}
  }
}

/** 官网 HTML 里的 logo 候选：og:image → apple-touch → 大 icon → img[src*=logo] */
async function siteLogoCandidates(site) {
  const base = site.replace(/\/$/, '');
  const page = await httpGet(base, { text: true, headers: { 'Accept': 'text/html' } });
  const cands = [];
  const abs = (u) => { try { return new URL(u, base).href; } catch { return ''; } };
  if (page.text) {
    const og = page.text.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || page.text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (og) cands.push(abs(og[1]));
    for (const m of page.text.matchAll(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*>/gi)) {
      const href = m[0].match(/href=["']([^"']+)["']/i);
      if (href) cands.push(abs(href[1]));
    }
    for (const m of page.text.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi)) {
      const tag = m[0];
      const sizes = (tag.match(/sizes=["'](\d+)x/i) || [])[1];
      if (!sizes || parseInt(sizes, 10) >= MIN_PX) {
        const href = tag.match(/href=["']([^"']+)["']/i);
        if (href) cands.push(abs(href[1]));
      }
    }
    for (const m of page.text.matchAll(/<img[^>]+src=["']([^"']*logo[^"']*\.(png|jpe?g|svg))["']/gi)) {
      cands.push(abs(m[1]));
    }
  }
  cands.push(`${base}/apple-touch-icon.png`, `${base}/apple-touch-icon-precomposed.png`);
  return [...new Set(cands.filter(Boolean))];
}

/** 微博用户搜索：认准 screen_name 含关键词且已认证的，拿 avatar_hd */
async function weiboAvatar(kw) {
  const cid = encodeURIComponent(`100103type=3&q=${kw}`);
  const r = await httpGet(`https://m.weibo.cn/api/container/getIndex?containerid=${cid}&page_type=searchall`, {
    text: true,
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Referer': 'https://m.weibo.cn/' },
  });
  if (!r.text) return null;
  try {
    const j = JSON.parse(r.text);
    const users = [];
    for (const card of (j.data?.cards || [])) {
      for (const g of (card.card_group || [card])) {
        if (g.user) users.push(g.user);
      }
    }
    const hit = users.find(u => (u.screen_name || '').includes(kw) && (u.verified || u.mbtype > 1))
      || users.find(u => u.screen_name === kw);
    if (hit) return hit.avatar_hd || hit.profile_image_url || null;
  } catch {}
  return null;
}

const data = JSON.parse(readFileSync(join(ROOT, 'data', 'foundries.json'), 'utf8'));
mkdirSync(OUT_DIR, { recursive: true });

const ok = [], missing = [], skipped = [];
for (const fd of data.foundries) {
  const slug = fd.id;
  const dest = join(OUT_DIR, `${slug}.webp`);
  if (existsSync(dest)) { skipped.push(slug); continue; }
  if (SKIP.has(slug)) { missing.push(slug); continue; }
  let cands = [];
  if (GITHUB[slug]) cands.push(...GITHUB[slug].filter(o => !GH_DENY.has(o.toLowerCase())).map(o => `https://github.com/${o}.png`));
  const site = SITE[slug] || fd.website;
  if (site) cands.push(...await siteLogoCandidates(site));
  let hit = null;
  for (const url of cands) {
    const { buf } = await httpGet(url);
    if (buf && !(await isPlaceholder(url, buf)) && toWebp(buf, dest)) { hit = url; break; }
    try { if (existsSync(dest)) rmSync(dest); } catch {}
  }
  if (!hit && WEIBO[slug]) {
    const wu = await weiboAvatar(WEIBO[slug]);
    if (wu) {
      const { buf } = await httpGet(wu);
      if (buf && !(await isPlaceholder(wu, buf)) && toWebp(buf, dest)) hit = wu;
    }
  }
  if (hit) { ok.push(slug); console.log(`✓ ${slug} ← ${hit}`); }
  else { try { if (existsSync(dest)) rmSync(dest); } catch {}; missing.push(slug); }
  await new Promise(r => setTimeout(r, 150));
}

console.log(`\n猎取 ${ok.length}，已有跳过 ${skipped.length}，未获 ${missing.length}（走字标）`);
if (missing.length) console.log('未获：' + missing.join(' '));
if (ok.length) {
  const prev = existsSync(join(ROOT, 'data', 'avatars.json'))
    ? JSON.parse(readFileSync(join(ROOT, 'data', 'avatars.json'), 'utf8'))
    : {};
  for (const s of ok) prev[s] = `assets/avatars/${s}.webp`;
  writeFileSync(join(ROOT, 'data', 'avatars.json'), JSON.stringify(prev, null, 2) + '\n');
  console.log(`清单追加 ${ok.length} 条 → data/avatars.json（现 ${Object.keys(prev).length}）`);
}
