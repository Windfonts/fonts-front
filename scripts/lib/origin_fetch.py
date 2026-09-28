#!/usr/bin/env python3
"""外源拉取：GitHub / npm / PyPI / Cravatar / 通用 URL（国内优先链）。

CLI
---
  origin-fetch probe
  origin-fetch get https://...
  origin-fetch github get USER REPO PATH [REF]
  origin-fetch github license USER REPO
  origin-fetch npm PKG[/path] [@version]
  origin-fetch pypi PKG [version]
  origin-fetch cravatar HASH_OR_EMAIL [-s SIZE] [-d DEFAULT]
  gh-fetch ...          # 兼容别名，子命令同 github_fetch 旧接口

健康缓存：~/.cache/github-mirrors/health.json（字段按 provider 分段）
Cravatar：默认主站 cravatar.com；国内 cn. / 国际 en.（勿写 cravatar.cn）
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

_PROXY_KEYS = (
    "https_proxy",
    "http_proxy",
    "HTTPS_PROXY",
    "HTTP_PROXY",
    "ALL_PROXY",
    "all_proxy",
)

UA = "linuxjoy-origin-fetch/1.1 (+windfonts; multi-origin)"
DEFAULT_TIMEOUT = 12
HEALTH_TTL_SEC = 6 * 3600

# --- GitHub ---
GH_RAW = [
    "https://cdn.jsdmirror.com/gh/{user}/{repo}@{ref}/{path}",
    "https://gcore.jsdelivr.net/gh/{user}/{repo}@{ref}/{path}",
    "https://fastly.jsdelivr.net/gh/{user}/{repo}@{ref}/{path}",
    "https://ghfast.top/https://raw.githubusercontent.com/{user}/{repo}/{ref}/{path}",
    "https://raw.githubusercontent.com/{user}/{repo}/{ref}/{path}",
]
GH_API = [
    "https://api.github.com",
    "https://ghfast.top/https://api.github.com",
    "https://gh-proxy.com/https://api.github.com",
]

# --- generic URL prefix proxies (任意 https URL) ---
GENERIC_PREFIX = [
    "https://ghfast.top/{url}",
    "https://gh-proxy.com/{url}",
]

# --- npm ---
NPM_REGISTRY = [
    "https://registry.npmmirror.com/{pkg}/{ver}",
    "https://registry.npmjs.org/{pkg}/{ver}",
]
NPM_CDN = [
    "https://cdn.npmmirror.com/packages/{pkg}/{ver}/{path}",
    "https://cdn.jsdmirror.com/npm/{pkg}@{ver}/{path}",
    "https://gcore.jsdelivr.net/npm/{pkg}@{ver}/{path}",
    "https://cdn.jsdelivr.net/npm/{pkg}@{ver}/{path}",
]

# --- PyPI simple / files ---
PYPI_SIMPLE = [
    "https://pypi.tuna.tsinghua.edu.cn/simple/{pkg}/",
    "https://mirrors.aliyun.com/pypi/simple/{pkg}/",
    "https://mirrors.cloud.tencent.com/pypi/simple/{pkg}/",
    "https://pypi.org/simple/{pkg}/",
]
PYPI_JSON = [
    "https://pypi.tuna.tsinghua.edu.cn/pypi/{pkg}/json",
    "https://mirrors.aliyun.com/pypi/pypi/{pkg}/json",
    "https://pypi.org/pypi/{pkg}/json",
]

# --- Cravatar 分区 ---
#   国内 API/CDN : https://cn.cravatar.com
#   主站/国内外  : https://cravatar.com
#   国际         : https://en.cravatar.com
#   过时         : https://cravatar.cn → 301 → cn.cravatar.com（禁止再写）
CRAVATAR_CN = "https://cn.cravatar.com"
CRAVATAR_ROOT = "https://cravatar.com"
CRAVATAR_EN = "https://en.cravatar.com"
CRAVATAR_HOST = CRAVATAR_ROOT  # 自有产品默认主域名（兼顾国内外）
CRAVATAR_DEPRECATED = ("https://cravatar.cn", "http://cravatar.cn")

LICENSE_NAME_RE = re.compile(
    r"(OFL|LICENSE|LICENCE|COPYING|IPA_Font|SIL_Open_Font)",
    re.I,
)

# back-compat names used by github_fetch
RAW_TEMPLATES = GH_RAW
API_BASES = GH_API


@dataclass
class FetchResult:
    data: bytes
    url: str
    via: str
    sha256: str
    provider: str = ""

    @property
    def text(self) -> str:
        return self.data.decode("utf-8", "ignore")


def _strip_proxy_env() -> None:
    if os.environ.get("GITHUB_FETCH_KEEP_PROXY") == "1":
        return
    for k in _PROXY_KEYS:
        os.environ.pop(k, None)


def health_path() -> Path:
    override = os.environ.get("GITHUB_MIRROR_HEALTH") or os.environ.get("ORIGIN_FETCH_HEALTH")
    if override:
        return Path(override).expanduser()
    return Path.home() / ".cache" / "github-mirrors" / "health.json"


def load_health() -> dict[str, Any]:
    path = health_path()
    if not path.is_file():
        return {}
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    checked = float(obj.get("checkedAt") or 0)
    if checked and (time.time() - checked) > HEALTH_TTL_SEC:
        obj["stale"] = True
    return obj


def save_health(obj: dict[str, Any]) -> Path:
    path = health_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    out = dict(obj)
    out["checkedAt"] = time.time()
    out["checkedAtIso"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def http_get(
    url: str,
    timeout: float = DEFAULT_TIMEOUT,
    accept: Optional[str] = None,
    allow_html: bool = False,
) -> Optional[bytes]:
    _strip_proxy_env()
    headers = {"User-Agent": UA}
    if accept:
        headers["Accept"] = accept
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
        return None
    if len(data) < 16:
        return None
    low = data[:200].lower()
    if not allow_html and b"<html" in low and b"sil open font" not in low and b"ipa font license" not in low:
        return None
    if b'"message"' in data[:100] and b"Not Found" in data[:240]:
        return None
    return data


def _order(cached_key: str, defaults: list[str]) -> list[str]:
    health = load_health()
    ok = [x for x in (health.get(cached_key) or []) if isinstance(x, str)]
    seen: set[str] = set()
    ordered: list[str] = []
    for item in ok + list(defaults):
        if item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered


def _result(data: bytes, url: str, provider: str) -> FetchResult:
    return FetchResult(
        data=data,
        url=url,
        via=urllib.parse.urlparse(url).hostname or "",
        sha256=hashlib.sha256(data).hexdigest(),
        provider=provider,
    )


# ---- GitHub (same API as before) ----

def get_raw(user: str, repo: str, path: str, ref: str = "main", timeout: float = DEFAULT_TIMEOUT) -> Optional[FetchResult]:
    path = path.lstrip("/")
    for tmpl in _order("rawOk", GH_RAW):
        url = tmpl.format(user=user, repo=repo, ref=ref, path=path)
        data = http_get(url, timeout=timeout)
        if data:
            return _result(data, url, "github")
    if ref == "main":
        return get_raw(user, repo, path, ref="master", timeout=timeout)
    return None


def api_json(api_path: str, timeout: float = DEFAULT_TIMEOUT) -> Optional[Any]:
    if not api_path.startswith("/"):
        api_path = "/" + api_path
    for base in _order("apiOk", GH_API):
        data = http_get(f"{base}{api_path}", timeout=timeout, accept="application/vnd.github+json")
        if not data:
            continue
        try:
            obj = json.loads(data.decode("utf-8"))
        except Exception:
            continue
        if isinstance(obj, dict) and obj.get("message"):
            continue
        return obj
    return None


def list_root(user: str, repo: str) -> list[dict[str, Any]]:
    obj = api_json(f"/repos/{user}/{repo}/contents/")
    return obj if isinstance(obj, list) else []


def excerpt_license_from_readme(data: bytes) -> Optional[bytes]:
    text = data.decode("utf-8", "ignore")
    m = re.search(r"(SIL OPEN FONT LICENSE[\s\S]{200,12000}?END OF LICENSE)", text, re.I)
    if m:
        return (m.group(1).strip() + "\n").encode()
    m = re.search(
        r"(##+\s*(License|授權|许可|许可证|授權條款|授權說明)[\s\S]{40,8000}?)(?:\n##+\s|\Z)",
        text,
        re.I,
    )
    if m:
        return (m.group(1).strip() + "\n").encode()
    hits = [
        ln
        for ln in text.splitlines()
        if re.search(r"OFL|Open Font License|SIL Open Font|授权|許可|IPA", ln, re.I)
    ]
    if hits:
        return ("Extracted license mentions from README:\n\n" + "\n".join(hits[:60]) + "\n").encode()
    return None


def fetch_license(user: str, repo: str, refs: Optional[list[str]] = None) -> Optional[tuple[FetchResult, str]]:
    refs = refs or ["main", "master"]
    root = list_root(user, repo)
    names = [x.get("name") or "" for x in root] if root else []
    cands = [n for n in names if LICENSE_NAME_RE.search(n)]
    for n in ("OFL.txt", "LICENSE", "LICENSE.txt", "LICENSE.md", "LICENSE-OFL"):
        if n not in cands:
            cands.append(n)
    for path in cands:
        for ref in refs:
            hit = get_raw(user, repo, path, ref=ref)
            if hit:
                fname = Path(path).name
                if "OFL" in path.upper() and not fname.upper().startswith("OFL"):
                    fname = "OFL.txt"
                return hit, fname
    for ref in refs:
        for readme in ("README.md", "readme.md", "README", "README.txt"):
            if names and readme not in names and readme.lower() not in [n.lower() for n in names]:
                continue
            hit = get_raw(user, repo, readme, ref=ref)
            if not hit:
                continue
            ex = excerpt_license_from_readme(hit.data)
            if ex:
                return (
                    FetchResult(
                        data=ex,
                        url=hit.url + "#readme",
                        via=hit.via + "+readme",
                        sha256=hashlib.sha256(ex).hexdigest(),
                        provider="github",
                    ),
                    "LICENSE.from-readme.txt",
                )
    return None


# ---- generic / npm / pypi / cravatar ----

def get_url(url: str, timeout: float = DEFAULT_TIMEOUT, allow_html: bool = False) -> Optional[FetchResult]:
    """任意 URL：直连 → 前缀代理。自动纠正 cravatar.cn。"""
    url = normalize_url(url)
    candidates = [url]
    for tmpl in _order("genericOk", GENERIC_PREFIX):
        candidates.append(tmpl.format(url=url))
    for cand in candidates:
        data = http_get(cand, timeout=timeout, allow_html=allow_html)
        if data:
            return _result(data, cand, "generic")
    return None


def normalize_url(url: str) -> str:
    """纠正过时主机；按区域选择 Cravatar 分区。

    ORIGIN_REGION=root|cn|en（默认 root=主域名）：仅影响 /avatar|/qrcode 路径主机。
    主站 https://cravatar.com（无路径资源）不改写。
    """
    for old in CRAVATAR_DEPRECATED:
        if url.startswith(old + "/") or url == old:
            return CRAVATAR_CN + url[len(old) :]
    region = (os.environ.get("ORIGIN_REGION") or "root").lower()
    host = {"cn": CRAVATAR_CN, "en": CRAVATAR_EN, "root": CRAVATAR_ROOT}.get(region, CRAVATAR_CN)
    for prefix in (
        "https://cravatar.com/avatar/",
        "https://cravatar.com/qrcode/",
        "https://en.cravatar.com/avatar/",
        "https://en.cravatar.com/qrcode/",
        "https://cn.cravatar.com/avatar/",
        "https://cn.cravatar.com/qrcode/",
    ):
        if url.startswith(prefix):
            path = url.split(".com", 1)[1]  # /avatar/...
            return host + path
    return url


def cravatar_host() -> str:
    region = (os.environ.get("ORIGIN_REGION") or "root").lower()
    return {"cn": CRAVATAR_CN, "en": CRAVATAR_EN, "root": CRAVATAR_ROOT}.get(region, CRAVATAR_CN)


def cravatar_url(hash_or_email: str, size: int = 144, default: str = "mp") -> str:
    h = hash_or_email.strip().lower()
    if "@" in h:
        h = hashlib.md5(h.encode("utf-8")).hexdigest()
    return f"{cravatar_host()}/avatar/{h}?s={int(size)}&d={urllib.parse.quote(default)}"


def get_cravatar(hash_or_email: str, size: int = 144, default: str = "mp", timeout: float = DEFAULT_TIMEOUT) -> Optional[FetchResult]:
    url = cravatar_url(hash_or_email, size=size, default=default)
    data = http_get(url, timeout=timeout, allow_html=False)
    if data:
        return _result(data, url, "cravatar")
    return get_url(url, timeout=timeout)


def get_npm(pkg: str, path: str = "package.json", version: str = "latest", timeout: float = DEFAULT_TIMEOUT) -> Optional[FetchResult]:
    pkg = pkg.strip().lstrip("@")
    # scoped: keep @scope/name if passed as @scope/name
    if path.startswith("/") or "/" in pkg and not pkg.startswith("@") and version == "latest":
        # allow "lodash/package.json" shorthand
        if "/" in pkg and not path:
            pkg, path = pkg.split("/", 1)
    ver = version or "latest"
    if ver == "latest":
        # resolve via registry meta
        for tmpl in _order("npmRegistryOk", NPM_REGISTRY):
            meta_url = tmpl.format(pkg=urllib.parse.quote(pkg, safe="@/"), ver="").rstrip("/")
            if meta_url.endswith("/"):
                meta_url = meta_url[:-1]
            data = http_get(meta_url, timeout=timeout, accept="application/json")
            if not data:
                continue
            try:
                meta = json.loads(data.decode("utf-8"))
                ver = (meta.get("dist-tags") or {}).get("latest") or meta.get("version") or "latest"
            except Exception:
                continue
            break
    for tmpl in _order("npmCdnOk", NPM_CDN):
        url = tmpl.format(pkg=pkg, ver=ver, path=path.lstrip("/"))
        data = http_get(url, timeout=timeout)
        if data:
            return _result(data, url, "npm")
    return None


def get_pypi_json(pkg: str, timeout: float = DEFAULT_TIMEOUT) -> Optional[FetchResult]:
    pkg = pkg.strip()
    for tmpl in _order("pypiJsonOk", PYPI_JSON):
        url = tmpl.format(pkg=pkg)
        data = http_get(url, timeout=timeout, accept="application/json")
        if data:
            return _result(data, url, "pypi")
    return None


def get_pypi_simple(pkg: str, timeout: float = DEFAULT_TIMEOUT) -> Optional[FetchResult]:
    pkg = pkg.strip()
    for tmpl in _order("pypiSimpleOk", PYPI_SIMPLE):
        url = tmpl.format(pkg=pkg)
        data = http_get(url, timeout=timeout, allow_html=True)
        if data:
            return _result(data, url, "pypi")
    return None


def probe(timeout: float = 10.0) -> dict[str, Any]:
    result: dict[str, Any] = {"providers": {}}

    # github raw/api
    raw_ok, raw_fail = [], []
    for tmpl in GH_RAW:
        url = tmpl.format(user="Skr-ZERO", repo="FlyFlowerSong", ref="main", path="README.md")
        data = http_get(url, timeout=timeout)
        (raw_ok if data and len(data) > 100 else raw_fail).append(tmpl if data and len(data) > 100 else {"template": tmpl, "url": url})
    # fix fail list shape
    raw_fail_clean = [x for x in raw_fail if isinstance(x, dict)]
    raw_ok = [x for x in raw_ok if isinstance(x, str)]
    api_ok, api_fail = [], []
    for base in GH_API:
        data = http_get(f"{base}/repos/Skr-ZERO/FlyFlowerSong/contents/", timeout=timeout, accept="application/vnd.github+json")
        if data:
            try:
                obj = json.loads(data.decode())
                if isinstance(obj, list) and obj:
                    api_ok.append(base)
                    continue
            except Exception:
                pass
        api_fail.append(base)

    # npm
    npm_ok, npm_fail = [], []
    for tmpl in NPM_CDN:
        url = tmpl.format(pkg="is-number", ver="7.0.0", path="package.json")
        data = http_get(url, timeout=timeout)
        if data and b"name" in data[:80]:
            npm_ok.append(tmpl)
        else:
            npm_fail.append(tmpl)

    # pypi
    pypi_ok, pypi_fail = [], []
    for tmpl in PYPI_JSON:
        url = tmpl.format(pkg="pip")
        data = http_get(url, timeout=timeout, accept="application/json")
        if data and b"info" in data[:200]:
            pypi_ok.append(tmpl)
        else:
            pypi_fail.append(tmpl)

    # cravatar
    cra_url = cravatar_url("00000000000000000000000000000000", size=64, default="mp")
    cra = http_get(cra_url, timeout=timeout)
    cra_ok = bool(cra and len(cra) > 40)

    # generic
    gen_ok, gen_fail = [], []
    target = "https://httpbin.org/status/200"
    for tmpl in GENERIC_PREFIX:
        url = tmpl.format(url=target)
        data = http_get(url, timeout=timeout, allow_html=True)
        if data is not None:
            gen_ok.append(tmpl)
        else:
            gen_fail.append(tmpl)

    out = {
        "probe": "multi-origin",
        "rawOk": raw_ok,
        "rawFail": raw_fail_clean,
        "apiOk": api_ok,
        "apiFail": api_fail,
        "npmCdnOk": npm_ok,
        "npmCdnFail": npm_fail,
        "pypiJsonOk": pypi_ok,
        "pypiJsonFail": pypi_fail,
        "cravatarOk": cra_ok,
        "cravatarHost": cravatar_host(),
        "cravatarHosts": {"cn": CRAVATAR_CN, "root": CRAVATAR_ROOT, "en": CRAVATAR_EN},
        "cravatarDeprecated": list(CRAVATAR_DEPRECATED),
        "genericOk": gen_ok,
        "genericFail": gen_fail,
        "note": "Prefer *Ok lists; refresh: probe-origin-mirrors / probe-gh-mirrors",
    }
    path = save_health(out)
    out["healthFile"] = str(path)
    return out


# ---- CLI ----

def _print_result(hit: FetchResult, out: Optional[str] = None) -> None:
    if out:
        Path(out).write_bytes(hit.data)
        print(json.dumps({
            "ok": True,
            "provider": hit.provider,
            "url": hit.url,
            "via": hit.via,
            "bytes": len(hit.data),
            "sha256": hit.sha256,
            "out": out,
        }, ensure_ascii=False, indent=2))
    else:
        sys.stdout.buffer.write(hit.data)


def main(argv: Optional[list[str]] = None) -> int:
    argv = list(argv if argv is not None else sys.argv[1:])
    # compatibility: if first token is old github_fetch subcommand, keep working
    legacy = {"probe", "get", "list", "api", "license"}
    if argv and argv[0] in legacy and (len(argv) == 1 or not argv[0] == "get" or (len(argv) > 1 and not argv[1].startswith("http"))):
        # old: get USER REPO PATH — if get + http → new get url
        if argv[0] == "get" and len(argv) > 1 and argv[1].startswith("http"):
            pass  # fall through to new parser
        else:
            return _legacy_main(argv)

    parser = argparse.ArgumentParser(prog="origin-fetch", description="Multi-origin fetch with CN mirrors")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("probe", help="Probe all providers")
    p.set_defaults(func=_cmd_probe)

    p = sub.add_parser("get", help="GET arbitrary URL (direct + prefix proxies)")
    p.add_argument("url")
    p.add_argument("-o", "--out")
    p.add_argument("--html", action="store_true")
    p.set_defaults(func=_cmd_get_url)

    p = sub.add_parser("github", help="GitHub helpers")
    g = p.add_subparsers(dest="gcmd", required=True)
    gg = g.add_parser("get")
    gg.add_argument("user"); gg.add_argument("repo"); gg.add_argument("path"); gg.add_argument("ref", nargs="?", default="main"); gg.add_argument("-o", "--out")
    gg.set_defaults(func=_cmd_gh_get)
    gl = g.add_parser("list"); gl.add_argument("user"); gl.add_argument("repo"); gl.set_defaults(func=_cmd_gh_list)
    ga = g.add_parser("api"); ga.add_argument("path"); ga.set_defaults(func=_cmd_gh_api)
    lic = g.add_parser("license"); lic.add_argument("user"); lic.add_argument("repo"); lic.add_argument("-o", "--out"); lic.add_argument("--meta")
    lic.set_defaults(func=_cmd_gh_license)

    p = sub.add_parser("npm", help="Fetch npm package file via npmmirror/jsDelivr")
    p.add_argument("pkg", help="name or name/path")
    p.add_argument("version", nargs="?", default="latest")
    p.add_argument("-o", "--out")
    p.set_defaults(func=_cmd_npm)

    p = sub.add_parser("pypi", help="Fetch PyPI JSON metadata via CN mirrors")
    p.add_argument("pkg")
    p.add_argument("-o", "--out")
    p.add_argument("--simple", action="store_true", help="Fetch simple HTML index instead of JSON")
    p.set_defaults(func=_cmd_pypi)

    p = sub.add_parser("cravatar", help="Fetch avatar (default cravatar.com; ORIGIN_REGION=cn|en)")
    p.add_argument("hash_or_email")
    p.add_argument("-s", "--size", type=int, default=144)
    p.add_argument("-d", "--default", default="mp")
    p.add_argument("-o", "--out")
    p.set_defaults(func=_cmd_cravatar)

    args = parser.parse_args(argv)
    return int(args.func(args))


def _cmd_probe(_: argparse.Namespace) -> int:
    result = probe()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("rawOk") or result.get("npmCdnOk") or result.get("cravatarOk") else 1


def _cmd_get_url(args: argparse.Namespace) -> int:
    hit = get_url(args.url, allow_html=args.html)
    if not hit:
        print("FAIL: unreachable", file=sys.stderr)
        return 1
    _print_result(hit, args.out)
    return 0


def _cmd_gh_get(args: argparse.Namespace) -> int:
    hit = get_raw(args.user, args.repo, args.path, ref=args.ref)
    if not hit:
        print("FAIL", file=sys.stderr)
        return 1
    _print_result(hit, args.out)
    return 0


def _cmd_gh_list(args: argparse.Namespace) -> int:
    root = list_root(args.user, args.repo)
    if not root:
        print("FAIL", file=sys.stderr)
        return 1
    print(json.dumps([x.get("name") for x in root], ensure_ascii=False, indent=2))
    return 0


def _cmd_gh_api(args: argparse.Namespace) -> int:
    obj = api_json(args.path)
    if obj is None:
        print("FAIL", file=sys.stderr)
        return 1
    print(json.dumps(obj, ensure_ascii=False, indent=2))
    return 0


def _cmd_gh_license(args: argparse.Namespace) -> int:
    hit = fetch_license(args.user, args.repo)
    if not hit:
        print("FAIL", file=sys.stderr)
        return 1
    result, fname = hit
    out = Path(args.out) if args.out else Path(fname)
    out.write_bytes(result.data)
    meta = {
        "repo": f"{args.user}/{args.repo}",
        "url": result.url,
        "via": result.via,
        "bytes": len(result.data),
        "sha256": result.sha256,
        "savedAs": out.name,
        "provider": "github",
    }
    if args.meta:
        Path(args.meta).write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(meta, ensure_ascii=False, indent=2))
    return 0


def _cmd_npm(args: argparse.Namespace) -> int:
    pkg = args.pkg
    path = "package.json"
    if "/" in pkg and not pkg.startswith("@"):
        pkg, path = pkg.split("/", 1)
    elif pkg.startswith("@") and pkg.count("/") >= 2:
        # @scope/name/path
        parts = pkg.split("/")
        pkg = "/".join(parts[:2])
        path = "/".join(parts[2:]) or "package.json"
    hit = get_npm(pkg, path=path, version=args.version)
    if not hit:
        print("FAIL", file=sys.stderr)
        return 1
    _print_result(hit, args.out)
    return 0


def _cmd_pypi(args: argparse.Namespace) -> int:
    hit = get_pypi_simple(args.pkg) if args.simple else get_pypi_json(args.pkg)
    if not hit:
        print("FAIL", file=sys.stderr)
        return 1
    _print_result(hit, args.out)
    return 0


def _cmd_cravatar(args: argparse.Namespace) -> int:
    hit = get_cravatar(args.hash_or_email, size=args.size, default=args.default)
    if not hit:
        print("FAIL", file=sys.stderr)
        return 1
    _print_result(hit, args.out)
    return 0


def _legacy_main(argv: list[str]) -> int:
    """旧 github_fetch.py CLI：probe|get|list|api|license"""
    parser = argparse.ArgumentParser(description="GitHub fetch (legacy)")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("probe"); p.set_defaults(func=lambda a: (print(json.dumps(probe(), ensure_ascii=False, indent=2)), 0)[1])
    p = sub.add_parser("get"); p.add_argument("user"); p.add_argument("repo"); p.add_argument("path"); p.add_argument("ref", nargs="?", default="main"); p.add_argument("-o", "--out"); p.set_defaults(func=_cmd_gh_get)
    p = sub.add_parser("list"); p.add_argument("user"); p.add_argument("repo"); p.set_defaults(func=_cmd_gh_list)
    p = sub.add_parser("api"); p.add_argument("path"); p.set_defaults(func=_cmd_gh_api)
    p = sub.add_parser("license"); p.add_argument("user"); p.add_argument("repo"); p.add_argument("-o", "--out"); p.add_argument("--meta"); p.set_defaults(func=_cmd_gh_license)
    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
