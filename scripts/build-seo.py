#!/usr/bin/env python3
"""Prerender /fonts/{slug} and /foundry/{slug} plus sitemap / robots / llms for app.windfonts.com."""
from __future__ import annotations

import html
import json
import re
from collections import OrderedDict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://app.windfonts.com"
OG = SITE + "/assets/icon.webp"
PUB = "文派（广州）科技有限公司"
ORG_ID = SITE + "/#organization"
SITE_ID = SITE + "/#website"
TODAY = date.today().isoformat()

e = lambda s: html.escape("" if s is None else str(s), quote=True)

CITATION_BOTS = (
    "GPTBot", "ChatGPT-User", "ClaudeBot", "Anthropic-AI", "PerplexityBot",
    "Google-Extended", "Applebot-Extended", "Bytespider", "CCBot",
)

STATIC_URLS = (
    "/", "/features", "/fonts", "/foundry", "/about", "/privacy", "/terms",
    "/docs", "/faq", "/license", "/disclaimer", "/trademark", "/claim",
    "/upload-terms", "/lineage",
)


def abs_url(path: str) -> str:
    if not path or path == "/":
        return SITE + "/"
    if path.startswith("http"):
        return path.split("#", 1)[0]
    if not path.startswith("/"):
        path = "/" + path
    return SITE + path.split("#", 1)[0]


def ld(obj) -> str:
    return '<script type="application/ld+json">%s</script>' % json.dumps(
        obj, ensure_ascii=False, separators=(",", ":")
    )


def organization():
    return {
        "@type": "Organization",
        "@id": ORG_ID,
        "name": PUB,
        "url": SITE + "/",
        "logo": OG,
        "brand": {"@type": "Brand", "name": "文风", "alternateName": "Windfonts"},
        "sameAs": ["https://wenfeng.org/"],
    }


def website():
    return {
        "@type": "WebSite",
        "@id": SITE_ID,
        "name": "文风字体",
        "url": SITE + "/",
        "publisher": {"@id": ORG_ID},
        "inLanguage": "zh-CN",
    }


def graph(*nodes):
    return {"@context": "https://schema.org", "@graph": [n for n in nodes if n]}


def inject_head(src: str, title: str, desc: str, canonical: str, extra: str, robots: str = "index,follow") -> str:
    src = re.sub(r"<title>[\s\S]*?</title>", "<title>%s</title>" % e(title), src, count=1)
    src = re.sub(r'\s*<meta name="description" content="[^"]*"\s*/?>', "", src)
    src = re.sub(r'\s*<meta name="robots" content="[^"]*"\s*/?>', "", src)
    src = re.sub(r'\s*<link rel="canonical" href="[^"]*"\s*/?>', "", src)
    src = re.sub(r'\s*<meta property="og:[^"]+" content="[^"]*"\s*/?>', "", src)
    src = re.sub(r'\s*<meta name="twitter:[^"]+" content="[^"]*"\s*/?>', "", src)
    src = re.sub(r'\s*<!-- 精确 OG[\s\S]*?-->', "", src)
    src = re.sub(r'\s*<script type="application/ld\+json">[\s\S]*?</script>', "", src)
    block = "\n".join([
        '  <meta name="robots" content="%s" />' % e(robots),
        '  <meta name="description" content="%s" />' % e(desc),
        '  <link rel="canonical" href="%s" />' % e(canonical),
        '  <meta property="og:type" content="website" />',
        '  <meta property="og:site_name" content="文风字体" />',
        '  <meta property="og:locale" content="zh_CN" />',
        '  <meta property="og:title" content="%s" />' % e(title),
        '  <meta property="og:description" content="%s" />' % e(desc),
        '  <meta property="og:url" content="%s" />' % e(canonical),
        '  <meta property="og:image" content="%s" />' % e(OG),
        '  <meta name="twitter:card" content="summary" />',
        '  <meta name="twitter:title" content="%s" />' % e(title),
        '  <meta name="twitter:description" content="%s" />' % e(desc),
        "  " + extra,
    ])
    if "</head>" not in src:
        raise SystemExit("no </head> in template")
    return src.replace("</head>", block + "\n</head>", 1)


def load_fonts():
    fonts = json.loads((ROOT / "data" / "fonts-list.json").read_text(encoding="utf-8"))
    fat = {}
    detail_p = ROOT / "data" / "fonts-detail.json"
    if detail_p.exists():
        blob = json.loads(detail_p.read_text(encoding="utf-8"))
        fat = blob.get("byId") or blob
    out = []
    seen = set()
    for f in fonts:
        slug = str(f.get("normalized") or "").strip()
        if not slug or slug in seen:
            continue
        seen.add(slug)
        extra = fat.get(f.get("id") or "") or fat.get(slug) or {}
        row = dict(f)
        if extra.get("descriptionBrief"):
            row["descriptionBrief"] = extra["descriptionBrief"]
        elif extra.get("description"):
            row["descriptionBrief"] = extra["description"]
        out.append(row)
    return out


def groups_of(fonts):
    groups = OrderedDict()
    for f in fonts:
        b = f.get("brand") or {}
        slug = str(b.get("slug") or "").strip()
        if not slug:
            continue
        g = groups.setdefault(slug, {"slug": slug, "name": b.get("name") or f.get("foundry") or slug, "fonts": []})
        if b.get("name"):
            g["name"] = b["name"]
        g["fonts"].append(f)
    return list(groups.values())


def font_desc(f):
    brief = (f.get("descriptionBrief") or "").strip()
    name = f.get("name") or f["normalized"]
    lic = f.get("licenseName") or f.get("license") or "许可以出处原文为准"
    foundry = f.get("foundry") or "未标注"
    if brief:
        base = brief
        if "不二次授权" not in base:
            base = base.rstrip("。") + "。本站不二次授权。"
        return base[:180]
    return "%s。%s。厂商 %s。网页嵌入托管，授权以出处原文为准，本站不二次授权。" % (name, lic, foundry)


def robots_txt() -> str:
    lines = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /lab/",
        "Disallow: /app/",
        "Disallow: /login",
        "Disallow: /pricing",
        "Disallow: /shopping-bag",
        "Disallow: /license-query",
        "Disallow: /*-options.html",
        "Disallow: /v5-",
        "Disallow: /data/fonts.json",
        "Disallow: /data/fonts-by-slug/",
        "Disallow: /styleguide",
        "",
    ]
    for bot in CITATION_BOTS:
        lines.append("User-agent: %s" % bot)
        lines.append("Allow: /")
    lines.append("")
    lines.append("Sitemap: %s/sitemap.xml" % SITE)
    lines.append("")
    return "\n".join(lines)


def sitemap_xml(urls) -> str:
    seen = []
    had = set()
    body = ['<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        absu = abs_url(u)
        if absu in had:
            continue
        had.add(absu)
        seen.append(absu)
    for u in seen:
        body.append("  <url><loc>%s</loc><lastmod>%s</lastmod></url>" % (e(u), TODAY))
    body.append("</urlset>")
    body.append("")
    return "\n".join(body)


def llms_txt() -> str:
    return """# 文风字体

> 中文网页字体托管：样张、嵌入 CSS、子集化。运营：文派（广州）科技有限公司。站点：https://app.windfonts.com/

本域是网页字体店面。源文件、许可原文与授权证明在 https://wenfeng.org/ 。营销站 https://windfonts.com 不是本目录。本站不二次授权。不要抓取或转载 TTF / OTF / woff2。

嵌入地址形状：`https://cn.windfonts.com/api/css?family=wenfeng-{slug}&weight={name}&subset=full|zh|zh-common`（边 `cn` / `hk` / `en` / `jp`）。不要写公开 `GET /api/css?text=`。`cn` / `hk` / `en` / `jp.windfonts.com` 是字体 CDN 边，不是语言站。

## 页面

- [字体库](https://app.windfonts.com/fonts)
- [厂商](https://app.windfonts.com/foundry)
- [文档](https://app.windfonts.com/docs)
- [常见问题](https://app.windfonts.com/faq)
- [许可说明](https://app.windfonts.com/license)
- [关于](https://app.windfonts.com/about)
- 示例：[霞鹜文楷](https://app.windfonts.com/fonts/xwwk)

## 运营方

文派（广州）科技有限公司
"""


def llms_full_txt() -> str:
    return llms_txt() + """
## 引用时注意

- 授权以各款出处原文为准，不要引用未上线的报价页。
- 选字袋、登录、控制台、options 稿不是产品事实。
- 源文件下载请走 https://wenfeng.org/source/{slug}/ 。
"""


def main() -> int:
    fonts = load_fonts()
    groups = groups_of(fonts)
    font_tpl = (ROOT / "font-detail.html").read_text(encoding="utf-8")
    foundry_tpl = (ROOT / "foundry.html").read_text(encoding="utf-8")

    fonts_dir = ROOT / "fonts"
    foundry_dir = ROOT / "foundry"
    fonts_dir.mkdir(exist_ok=True)
    foundry_dir.mkdir(exist_ok=True)
    for old in fonts_dir.glob("*.html"):
        old.unlink()
    for old in foundry_dir.glob("*.html"):
        old.unlink()

    urls = list(STATIC_URLS)
    for f in fonts:
        slug = f["normalized"]
        name = f.get("name") or slug
        title = "%s · 文风字体" % name
        desc = font_desc(f)
        canon = abs_url("/fonts/" + slug)
        lic = f.get("licenseName") or f.get("license") or "许可以出处原文为准"
        foundry = f.get("foundry") or "未标注"
        jsonld = ld(graph(
            {
                "@type": "CreativeWork",
                "name": name,
                "url": canon,
                "inLanguage": "zh-CN",
                "description": desc,
                "identifier": slug,
                "publisher": {"@id": ORG_ID},
                "license": "https://wenfeng.org/license/%s/" % slug,
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "首页", "item": SITE + "/"},
                    {"@type": "ListItem", "position": 2, "name": "字体库", "item": SITE + "/fonts"},
                    {"@type": "ListItem", "position": 3, "name": name},
                ],
            },
        ))
        page = inject_head(font_tpl, title, desc, canon, jsonld)
        facts = (
            '    <div class="page-state container" role="status">\n'
            '      <p class="page-state-kicker">字体</p>\n'
            '      <h1>%s</h1>\n'
            '      <p>%s。许可 %s。厂商 %s。网页嵌入托管，授权以出处原文为准，本站不二次授权。</p>\n'
            '      <p><a href="https://wenfeng.org/source/%s/">源文件与许可原文</a></p>\n'
            '      <div class="page-state-skel" aria-hidden="true"><i></i><i></i><i></i></div>\n'
            "    </div>\n"
        ) % (e(name), e(name), e(lic), e(foundry), e(slug))
        page = re.sub(
            r'(<main id="detailRoot">)\s*<div class="page-state[\s\S]*?</div>\s*(</main>)',
            r"\1\n" + facts + r"\2",
            page,
            count=1,
        )
        (fonts_dir / ("%s.html" % slug)).write_text(page, encoding="utf-8")
        urls.append("/fonts/" + slug)

    for g in groups:
        slug = g["slug"]
        name = g["name"]
        title = "%s · 文风字体" % name
        n = len(g["fonts"])
        desc = "%s 出品的开源与免费商用中文网页字体，文风字体库收录 %d 款。本站不二次授权。" % (name, n)
        canon = abs_url("/foundry/" + slug)
        jsonld = ld(graph(
            {
                "@type": "CollectionPage",
                "name": name,
                "url": canon,
                "description": desc,
                "isPartOf": {"@id": SITE_ID},
                "inLanguage": "zh-CN",
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "首页", "item": SITE + "/"},
                    {"@type": "ListItem", "position": 2, "name": "厂商", "item": SITE + "/foundry"},
                    {"@type": "ListItem", "position": 3, "name": name},
                ],
            },
        ))
        page = inject_head(foundry_tpl, title, desc, canon, jsonld)
        facts = (
            '    <div class="page-state container" role="status">\n'
            '      <p class="page-state-kicker">厂商</p>\n'
            '      <h1>%s</h1>\n'
            '      <p>%s。文风字体库收录 %d 款。授权以各款出处原文为准，本站不二次授权。</p>\n'
            '      <div class="page-state-skel" aria-hidden="true"><i></i><i></i><i></i></div>\n'
            "    </div>\n"
        ) % (e(name), e(name), n)
        page = re.sub(
            r'(<main id="foundryRoot">)\s*<div class="page-state[\s\S]*?</div>\s*(</main>)',
            r"\1\n" + facts + r"\2",
            page,
            count=1,
        )
        (foundry_dir / ("%s.html" % slug)).write_text(page, encoding="utf-8")
        urls.append("/foundry/" + slug)

    (ROOT / "robots.txt").write_text(robots_txt(), encoding="utf-8")
    (ROOT / "sitemap.xml").write_text(sitemap_xml(urls), encoding="utf-8")
    (ROOT / "llms.txt").write_text(llms_txt(), encoding="utf-8")
    (ROOT / "llms-full.txt").write_text(llms_full_txt(), encoding="utf-8")
    well = ROOT / ".well-known"
    well.mkdir(exist_ok=True)
    (well / "llms.txt").write_text(llms_txt(), encoding="utf-8")
    print("seo fonts=%d foundries=%d urls=%d" % (len(fonts), len(groups), len(urls)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
