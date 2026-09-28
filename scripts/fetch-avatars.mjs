#!/usr/bin/env node
/**
 * 猎取厂商真实头像 → WebP 本地静态资源（motuicons hunt-author-avatars 打法扩展）
 * 源优先级：
 *   1) 字体网首发页 author-avatar（descSource / 已知 URL）
 *   2) 站酷个人页 avatarImg
 *   3) GitHub 用户/组织原图（.png）
 *   4) 官网 HTML（og:image / apple-touch / logo）
 *   5) 微博搜索 avatar_hd
 * 前台回退：个人 author|individual → Cravatar（默认 cravatar.com 主域名）默认头像；组织 → 字标。
 * 拒收：GitHub identicon / <72px / HTML / 占位；REJECT 名单默认不进清单（字体网 author-avatar 可覆盖）。
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
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
  'fontworks': ['fontworks-fonts'],
  'aqua': ['max32002'],
  'chiron': ['chiron-fonts'],
  'guiwonder': ['GuiWonder'],
  'buttaiwan': ['ButTaiwan'],
  'sarasa': ['be5invis'],
  'kingsoft-cloud': ['KingsoftCloud'],
};
const GH_DENY = new Set(['chilltype', 'zcool', 'mengshen', 'mplus', 'sandoll', 'logosc', 'maoken-fonts']);

/** 官网补充（foundries.json 里 website 为空但确定的） */
const SITE = {
  'zitijia': 'https://www.zitijia.com',
  'gnu': 'https://www.gnu.org',
  'ipa': 'https://www.moji.or.jp',
  'mplus': 'https://mplusfonts.com',
  'fontree': 'https://www.fontree.cn',
  'alibaba': 'https://www.alibaba.com',
  'alimama': 'https://www.alimama.com',
  'justfont': 'https://justfont.com',
  'littlelimit': 'https://littlelimit.net',
  'chuangkit': 'https://www.chuangkit.com',
  'kuaikan': 'https://www.kuaikanmanhua.com',
  'sucaijishi': 'https://www.sucaijishi.com',
  'flopdesign': 'https://www.flopdesign.com/',
  'jikasei': 'http://jikasei.me/',
  'zoomla': 'http://f.ziti163.com',
};

/**
 * 站酷个人页（搜索 API 常空，手工核过的 /u/ 直链）
 * 知名设计师优先走这里，勿用微博随机图覆盖
 */
const ZCOOL = {
  'huxiaobo': 'https://www.zcool.com.cn/u/553484',
  'pangmen': 'https://www.zcool.com.cn/u/ZNjE5OTcxNzY=',
  'jingnan': 'https://www.zcool.com.cn/u/18646020',
  'chilltype': 'https://www.zcool.com.cn/u/12923697',
  'huangyuchen': 'https://www.zcool.com.cn/u/653645',
};

/** 品牌 / 平台直链 logo（官网难扒时的保底；宽 logo 用较长边判尺寸） */
const BRAND_LOGO = {
  /* 阿里/妈妈勿再用淘宝 CDN 词标；真标由人工写入 assets/avatars */
  'kuaikan': 'https://festatic.v3mh.com/static-resource/img/20210706/tiny/logo_128x128.png',
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

const ARGS = new Set(process.argv.slice(2));
const SYNC_ONLY = ARGS.has('--sync-only');
const FORCE = (process.argv.find(a => a.startsWith('--force=')) || '').split('=')[1] || '';
/** 仅跑缺图：没有本地 webp 的才猎（可与 --force 并用） */
const MISSING_ONLY = ARGS.has('--missing');

/** 无站、无首发、猎了也空的条目：跳过省时间（有 website/descSource 仍会猎） */
const SKIP = new Set([
  'jiazhiyong', 'zojitype', 'watamochi', 'myil', 'longcang',
  'potta', 'dinglie', 'scf', 'flexifont', 'pinru', 'zhuojian',
  'qingke', 'xyzy', 'xianlifang', 'longquansi', 'do-font',
  'ascender', 'nsd', 'seto', 'wencang', 'ymnk',
  'gongfan', 'tsanger',
]);

/** 曾确认错图且尚无可信首发源：不进清单（站酷/字体网可信源可覆盖写入） */
const REJECT = new Set([
  'mengshen', 'ipa',
]);
/** 人工核过的真标：禁止无人值守覆盖（曾被脚本写坏） */
const PROTECT = new Set(['gnu', 'qiantu', 'adobe', 'google-fonts', 'lxgw', 'alibaba-design', 'alibaba', 'xiaomi', 'bytedance', 'zcool', 'maoken', 'ibm', 'microsoft', 'taobao', 'dingtalk']);

function ghUserFromSite(site) {
  const m = String(site || '').match(/github\.com\/([^/?#]+)/i);
  if (!m) return '';
  const u = m[1];
  if (/^(orgs|settings|topics|about|features|marketplace|sponsors)$/i.test(u)) return '';
  return u;
}

function isTrustedSocial(url) {
  return /img\.cdn\.fonts\.net\.cn\/0-author-files\/author-avatar-|author-avatar-|img\.zcool\.cn\/community\/[0-9a-f]+/i.test(url || '');
}

function allowWrite(slug, sourceUrl) {
  if (PROTECT.has(slug)) return false;
  if (!REJECT.has(slug)) return true;
  return isTrustedSocial(sourceUrl);
}

/** 磁盘 webp → data/avatars.json（只写本地路径；剔除远程热链与 REJECT 错图） */
function syncAvatarsJson() {
  const prev = existsSync(join(ROOT, 'data', 'avatars.json'))
    ? JSON.parse(readFileSync(join(ROOT, 'data', 'avatars.json'), 'utf8'))
    : {};
  const next = {};
  for (const f of readdirSync(OUT_DIR).filter(n => n.endsWith('.webp')).sort()) {
    const slug = f.replace(/\.webp$/, '');
    if (REJECT.has(slug)) continue;
    next[slug] = `assets/avatars/${slug}.webp`;
  }
  for (const [k, v] of Object.entries(prev)) {
    if (REJECT.has(k) || next[k] || /^https?:\/\//i.test(String(v))) continue;
    if (String(v).startsWith('assets/avatars/') && existsSync(join(ROOT, v))) next[k] = v;
  }
  writeFileSync(join(ROOT, 'data', 'avatars.json'), JSON.stringify(next, null, 2) + '\n');
  return { count: Object.keys(next).length, slugs: Object.keys(next) };
}

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
  /* 站头图 / 背景 / 封面 / 字体网默认头像 / 政府社交图，不是可用头像 */
  if (/\/(bg|banner|hero|cover|background|splash)[-_.]/i.test(url) || /\/images\/bg\./i.test(url)) return true;
  if (/author-avatar-default\./i.test(url)) return true;
  if (/data\.gov\.tw\/images\/social-media/i.test(url)) return true;
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
    const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]).toString();
    const w = parseInt((out.match(/pixelWidth:\s*(\d+)/) || [])[1] || '0', 10);
    const h = parseInt((out.match(/pixelHeight:\s*(\d+)/) || [])[1] || '0', 10);
    /* 宽 logo（如阿里横标）用较长边 */
    return Math.max(w, h);
  } catch { return 0; }
}

function toWebp(buf, dest) {
  if (buf.length < 1400) return false; // 小图连字节都少，先挡一道
  const ext = extOf(buf);
  const tmp = dest.replace(/\.webp$/, '') + '.src' + ext;
  writeFileSync(tmp, buf);
  try {
    let input = tmp;
    if (ext === '.ico') {
      input = tmp + '.png';
      execFileSync('sips', ['-s', 'format', 'png', tmp, '--out', input], { stdio: 'ignore' });
    }
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

/** 字体网作者页：site_author_sh_avatar / 0-author-files/author-avatar-* */
async function fontsNetAvatar(pageUrl) {
  if (!pageUrl || !/fonts\.net\.cn/i.test(pageUrl)) return null;
  const page = await httpGet(pageUrl, { text: true, headers: { Accept: 'text/html' } });
  if (!page.text) return null;
  const m = page.text.match(/class=["']site_author_sh_avatar["'][^>]*src=["']([^"']+)["']/i)
    || page.text.match(/src=["']([^"']*site_author_sh_avatar[^"']*)["']/i)
    || page.text.match(/src=["']((?:https?:)?\/\/img\.cdn\.fonts\.net\.cn\/0-author-files\/author-avatar-[^"']+)["']/i);
  if (!m) return null;
  let u = m[1].replace(/&amp;/g, '&');
  if (u.startsWith('//')) u = 'https:' + u;
  return u;
}

/** 站酷个人页：JSON avatar 或 .avatarImg */
async function zcoolAvatar(pageUrl) {
  if (!pageUrl || !/zcool\.com\.cn\/u\//i.test(pageUrl)) return null;
  const page = await httpGet(pageUrl, { text: true, headers: { Accept: 'text/html' } });
  if (!page.text) return null;
  const j = page.text.match(/"avatar"\s*:\s*"(https?:\\\/\\\/img\.zcool\.cn[^"]+|https?:\/\/img\.zcool\.cn[^"]+)"/i);
  if (j) {
    let u = j[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
    u = u.split('?')[0] + '?x-oss-process=image/resize,m_fill,w_240,h_240,limit_0';
    return u;
  }
  const img = page.text.match(/class=["']avatarImg["'][^>]*src=["']([^"']+)["']/i)
    || page.text.match(/src=["']([^"']+)["'][^>]*class=["']avatarImg["']/i);
  return img ? img[1].replace(/&amp;/g, '&') : null;
}

/** 巴哈姆特小屋头像 */
async function gamerAvatar(pageUrl) {
  if (!pageUrl || !/gamer\.com\.tw/i.test(pageUrl)) return null;
  const page = await httpGet(pageUrl, { text: true, headers: { Accept: 'text/html' } });
  if (!page.text) return null;
  const m = page.text.match(/https?:\/\/[^"'>\s]*bahamut\.com\.tw[^"'>\s]*\.(?:jpg|jpeg|png|webp)/i)
    || page.text.match(/https?:\/\/avatar2?\.bahamut\.com\.tw\/[^"'>\s]+/i);
  return m ? m[0] : null;
}

async function collectCandidates(fd) {
  const slug = fd.id;
  const site = SITE[slug] || fd.website || '';
  const urls = [];
  const push = (u) => { if (u && !urls.includes(u)) urls.push(u); };

  /* 1) 站酷个人页（手工表 + website） */
  const zcoolPage = ZCOOL[slug] || (/zcool\.com\.cn\/u\//i.test(site) ? site : '');
  if (zcoolPage) {
    const z = await zcoolAvatar(zcoolPage);
    if (z) push(z);
  }

  /* 2) 字体网首发 author-avatar */
  const ds = fd.descSource && fd.descSource.url;
  if (ds) {
    const fn = await fontsNetAvatar(ds);
    if (fn) push(fn);
  }
  if (/fonts\.net\.cn/i.test(site)) {
    const fn = await fontsNetAvatar(site);
    if (fn) push(fn);
  }

  /* 3) 品牌直链 logo */
  if (BRAND_LOGO[slug]) push(BRAND_LOGO[slug]);

  if (/gamer\.com\.tw/i.test(site)) {
    const g = await gamerAvatar(site);
    if (g) push(g);
  }

  if (GITHUB[slug]) {
    for (const o of GITHUB[slug]) {
      if (!GH_DENY.has(String(o).toLowerCase())) push(`https://github.com/${o}.png`);
    }
  }
  const gh = ghUserFromSite(site);
  if (gh && !GH_DENY.has(slug) && !GH_DENY.has(gh.toLowerCase())) {
    push(`https://github.com/${gh}.png`);
  }
  if (site && !/github\.com\//i.test(site) && !/zcool\.com\.cn\/u\//i.test(site)) {
    for (const u of await siteLogoCandidates(site)) push(u);
    try {
      const origin = new URL(site).origin;
      push(origin + '/apple-touch-icon.png');
      push(origin + '/favicon.ico');
    } catch { /* ignore */ }
  }
  if (WEIBO[slug]) {
    const wu = await weiboAvatar(WEIBO[slug]);
    if (wu) push(wu);
  }
  return urls;
}

const data = JSON.parse(readFileSync(join(ROOT, 'data', 'foundries.json'), 'utf8'));
mkdirSync(OUT_DIR, { recursive: true });

if (SYNC_ONLY) {
  const s = syncAvatarsJson();
  console.log(`同步 ${s.count} 条本地 WebP → data/avatars.json`);
  process.exit(0);
}

const ONLY = FORCE && FORCE !== 'all'
  ? new Set(FORCE.split(',').map(s => s.trim()).filter(Boolean))
  : null;

const ok = [], missing = [], skipped = [];
for (const fd of data.foundries) {
  const slug = fd.id;
  if (ONLY && !ONLY.has(slug)) continue;
  const dest = join(OUT_DIR, `${slug}.webp`);
  const force = FORCE === 'all' || (ONLY && ONLY.has(slug));
  const hasSource = !!(SITE[slug] || ZCOOL[slug] || BRAND_LOGO[slug] || fd.website || (fd.descSource && fd.descSource.url) || GITHUB[slug] || WEIBO[slug]);
  /* 已有本地 webp：默认永不覆盖（防把旧真标冲掉）；仅 --force=slug|all 才重猎 */
  if (existsSync(dest) && !force) {
    skipped.push(slug);
    continue;
  }
  if (PROTECT.has(slug) && !force) {
    if (existsSync(dest)) skipped.push(slug);
    else missing.push(slug);
    continue;
  }
  if (SKIP.has(slug) && !hasSource && !force) { missing.push(slug); continue; }
  /* REJECT 且无可信社交源：跳过（避免微博/随机站再写错图） */
  if (REJECT.has(slug) && !force && !(fd.descSource && /fonts\.net\.cn/i.test(fd.descSource.url || '')) && !/zcool\.com\.cn\/u\//i.test(fd.website || '') && !ZCOOL[slug]) {
    missing.push(slug);
    continue;
  }

  const cands = await collectCandidates(fd);
  let hit = null;
  for (const url of cands) {
    if (REJECT.has(slug) && !allowWrite(slug, url)) continue;
    const { buf } = await httpGet(url);
    if (buf && !(await isPlaceholder(url, buf)) && toWebp(buf, dest)) {
      if (!allowWrite(slug, url)) {
        try { rmSync(dest); } catch {}
        continue;
      }
      hit = url;
      break;
    }
    try { if (existsSync(dest)) rmSync(dest); } catch {}
  }
  if (hit) {
    ok.push(slug);
    if (REJECT.has(slug) && allowWrite(slug, hit)) REJECT.delete(slug);
    console.log(`✓ ${slug} ← ${hit}`);
  } else {
    try { if (existsSync(dest) && force) rmSync(dest); } catch {}
    missing.push(slug);
  }
  await new Promise(r => setTimeout(r, 120));
}

console.log(`\n猎取 ${ok.length}，已有跳过 ${skipped.length}，未获 ${missing.length}（个人→Cravatar / 组织→字标）`);
if (missing.length) console.log('未获：' + missing.join(' '));
const synced = syncAvatarsJson();
console.log(`清单同步 → data/avatars.json（现 ${synced.count} 条本地 WebP）`);
