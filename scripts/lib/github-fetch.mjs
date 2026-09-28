/**
 * GitHub raw / API 拉取（Node）：国内镜像优先。
 * 与 scripts/lib/github_fetch.py 同优先链；Agent/脚本禁止手写 raw.githubusercontent。
 *
 *   import { getRaw, apiJson, listRoot, fetchLicense, probe } from './github-fetch.mjs';
 *   node scripts/lib/github-fetch.mjs probe
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const UA = 'linuxjoy-github-fetch/1.0 (+windfonts; mirror-aware)';
const DEFAULT_TIMEOUT_MS = 12000;
const HEALTH_TTL_MS = 6 * 3600 * 1000;

export const RAW_TEMPLATES = [
  'https://cdn.jsdmirror.com/gh/{user}/{repo}@{ref}/{path}',
  'https://gcore.jsdelivr.net/gh/{user}/{repo}@{ref}/{path}',
  'https://fastly.jsdelivr.net/gh/{user}/{repo}@{ref}/{path}',
  'https://ghfast.top/https://raw.githubusercontent.com/{user}/{repo}/{ref}/{path}',
  'https://raw.githubusercontent.com/{user}/{repo}/{ref}/{path}',
];

export const API_BASES = [
  'https://api.github.com',
  'https://ghfast.top/https://api.github.com',
  'https://gh-proxy.com/https://api.github.com',
];

const LICENSE_RE = /(OFL|LICENSE|LICENCE|COPYING|IPA_Font|SIL_Open_Font)/i;

function stripProxyEnv() {
  if (process.env.GITHUB_FETCH_KEEP_PROXY === '1') return;
  for (const k of ['https_proxy', 'http_proxy', 'HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY', 'all_proxy']) {
    delete process.env[k];
  }
}

export function healthPath() {
  if (process.env.GITHUB_MIRROR_HEALTH) return process.env.GITHUB_MIRROR_HEALTH;
  return join(homedir(), '.cache', 'github-mirrors', 'health.json');
}

export function loadHealth() {
  const p = healthPath();
  if (!existsSync(p)) return {};
  try {
    const obj = JSON.parse(readFileSync(p, 'utf8'));
    const checked = Number(obj.checkedAt || 0) * (obj.checkedAt > 1e12 ? 1 : 1000);
    // python writes unix seconds; normalize
    const checkedMs = Number(obj.checkedAt || 0) < 1e12
      ? Number(obj.checkedAt || 0) * 1000
      : Number(obj.checkedAt || 0);
    if (checkedMs && Date.now() - checkedMs > HEALTH_TTL_MS) obj.stale = true;
    return obj;
  } catch {
    return {};
  }
}

export function saveHealth(obj) {
  const p = healthPath();
  mkdirSync(dirname(p), { recursive: true });
  const out = {
    ...obj,
    checkedAt: Date.now() / 1000,
    checkedAtIso: new Date().toISOString(),
  };
  writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
  return p;
}

async function httpGet(url, { timeoutMs = DEFAULT_TIMEOUT_MS, accept } = {}) {
  stripProxyEnv();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        ...(accept ? { Accept: accept } : {}),
      },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 20) return null;
    const low = buf.subarray(0, 200).toString('latin1').toLowerCase();
    if (low.includes('<html') && !low.includes('sil open font') && !low.includes('ipa font license')) {
      return null;
    }
    const head = buf.subarray(0, 240).toString('utf8');
    if (head.includes('"message"') && head.includes('Not Found')) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function rawOrder() {
  const health = loadHealth();
  const ok = Array.isArray(health.rawOk) ? health.rawOk.filter((x) => typeof x === 'string') : [];
  const seen = new Set();
  const ordered = [];
  for (const tmpl of [...ok, ...RAW_TEMPLATES]) {
    if (!seen.has(tmpl)) {
      seen.add(tmpl);
      ordered.push(tmpl);
    }
  }
  return ordered;
}

function apiOrder() {
  const health = loadHealth();
  const ok = Array.isArray(health.apiOk) ? health.apiOk.filter((x) => typeof x === 'string') : [];
  const seen = new Set();
  const ordered = [];
  for (const base of [...ok, ...API_BASES]) {
    if (!seen.has(base)) {
      seen.add(base);
      ordered.push(base);
    }
  }
  return ordered;
}

function fmt(tmpl, { user, repo, ref, path }) {
  return tmpl
    .replaceAll('{user}', user)
    .replaceAll('{repo}', repo)
    .replaceAll('{ref}', ref)
    .replaceAll('{path}', path.replace(/^\//, ''));
}

/**
 * @returns {Promise<{data: Buffer, url: string, via: string, sha256: string}|null>}
 */
export async function getRaw(user, repo, path, ref = 'main', timeoutMs = DEFAULT_TIMEOUT_MS) {
  path = String(path).replace(/^\//, '');
  for (const tmpl of rawOrder()) {
    const url = fmt(tmpl, { user, repo, ref, path });
    const data = await httpGet(url, { timeoutMs });
    if (!data) continue;
    return {
      data,
      url,
      via: new URL(url).hostname,
      sha256: createHash('sha256').update(data).digest('hex'),
    };
  }
  if (ref === 'main') return getRaw(user, repo, path, 'master', timeoutMs);
  return null;
}

export async function apiJson(apiPath, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!apiPath.startsWith('/')) apiPath = '/' + apiPath;
  for (const base of apiOrder()) {
    const data = await httpGet(`${base}${apiPath}`, {
      timeoutMs,
      accept: 'application/vnd.github+json',
    });
    if (!data) continue;
    try {
      const obj = JSON.parse(data.toString('utf8'));
      if (obj && typeof obj === 'object' && !Array.isArray(obj) && obj.message) continue;
      return obj;
    } catch {
      continue;
    }
  }
  return null;
}

export async function listRoot(user, repo) {
  const obj = await apiJson(`/repos/${user}/${repo}/contents/`);
  return Array.isArray(obj) ? obj : [];
}

export function excerptLicenseFromReadme(buf) {
  const text = buf.toString('utf8');
  let m = text.match(/SIL OPEN FONT LICENSE[\s\S]{200,12000}?END OF LICENSE/i);
  if (m) return Buffer.from(m[0].trim() + '\n');
  m = text.match(/##+\s*(?:License|授權|许可|许可证|授權條款|授權說明)[\s\S]{40,8000}?(?=\n##+\s|$)/i);
  if (m) return Buffer.from(m[0].trim() + '\n');
  const hits = text.split(/\r?\n/).filter((ln) => /OFL|Open Font License|SIL Open Font|授权|許可|IPA/i.test(ln));
  if (hits.length) {
    return Buffer.from('Extracted license mentions from README:\n\n' + hits.slice(0, 60).join('\n') + '\n');
  }
  return null;
}

export async function fetchLicense(user, repo, refs = ['main', 'master']) {
  const root = await listRoot(user, repo);
  const names = root.map((x) => x.name || '');
  const cands = names.filter((n) => LICENSE_RE.test(n));
  for (const n of ['OFL.txt', 'LICENSE', 'LICENSE.txt', 'LICENSE.md', 'LICENSE-OFL']) {
    if (!cands.includes(n)) cands.push(n);
  }
  for (const path of cands) {
    for (const ref of refs) {
      const hit = await getRaw(user, repo, path, ref);
      if (!hit) continue;
      let fname = path.split('/').pop();
      if (/OFL/i.test(path) && !/^OFL/i.test(fname)) fname = 'OFL.txt';
      return { ...hit, savedAs: fname };
    }
  }
  for (const ref of refs) {
    for (const readme of ['README.md', 'readme.md', 'README', 'README.txt']) {
      if (names.length && !names.includes(readme) && !names.map((n) => n.toLowerCase()).includes(readme.toLowerCase())) {
        continue;
      }
      const hit = await getRaw(user, repo, readme, ref);
      if (!hit) continue;
      const ex = excerptLicenseFromReadme(hit.data);
      if (!ex) continue;
      return {
        data: ex,
        url: hit.url + '#readme',
        via: hit.via + '+readme',
        sha256: createHash('sha256').update(ex).digest('hex'),
        savedAs: 'LICENSE.from-readme.txt',
      };
    }
  }
  return null;
}

export async function probe(timeoutMs = 10000) {
  const probeUser = 'Skr-ZERO';
  const probeRepo = 'FlyFlowerSong';
  const probePath = 'README.md';
  const probeRef = 'main';
  const rawOk = [];
  const rawFail = [];
  for (const tmpl of RAW_TEMPLATES) {
    const url = fmt(tmpl, { user: probeUser, repo: probeRepo, ref: probeRef, path: probePath });
    const data = await httpGet(url, { timeoutMs });
    if (data && data.length > 100) rawOk.push(tmpl);
    else rawFail.push({ template: tmpl, url });
  }
  const apiOk = [];
  const apiFail = [];
  for (const base of API_BASES) {
    const data = await httpGet(`${base}/repos/${probeUser}/${probeRepo}/contents/`, {
      timeoutMs,
      accept: 'application/vnd.github+json',
    });
    if (!data) {
      apiFail.push(base);
      continue;
    }
    try {
      const obj = JSON.parse(data.toString('utf8'));
      if (Array.isArray(obj) && obj.length) apiOk.push(base);
      else apiFail.push(base);
    } catch {
      apiFail.push(base);
    }
  }
  const result = {
    probe: `${probeUser}/${probeRepo}/${probePath}@${probeRef}`,
    rawOk,
    rawFail,
    apiOk,
    apiFail,
    note: 'Prefer rawOk/apiOk order; refresh with: probe-gh-mirrors',
  };
  result.healthFile = saveHealth(result);
  return result;
}

async function cli(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === 'probe') {
    const r = await probe();
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.rawOk?.length ? 0 : 1);
  }
  if (cmd === 'get') {
    const [user, repo, path, ref = 'main'] = rest;
    const hit = await getRaw(user, repo, path, ref);
    if (!hit) {
      console.error('FAIL: no mirror returned content');
      process.exit(1);
    }
    process.stdout.write(hit.data);
    process.exit(0);
  }
  if (cmd === 'list') {
    const [user, repo] = rest;
    const root = await listRoot(user, repo);
    console.log(JSON.stringify(root.map((x) => x.name), null, 2));
    process.exit(root.length ? 0 : 1);
  }
  if (cmd === 'license') {
    const [user, repo] = rest;
    const hit = await fetchLicense(user, repo);
    if (!hit) {
      console.error('FAIL: no license');
      process.exit(1);
    }
    writeFileSync(hit.savedAs, hit.data);
    console.log(JSON.stringify({ url: hit.url, via: hit.via, bytes: hit.data.length, savedAs: hit.savedAs }, null, 2));
    process.exit(0);
  }
  console.error('Usage: github-fetch.mjs probe|get|list|license ...');
  process.exit(2);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  cli(process.argv.slice(2));
}
