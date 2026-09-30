#!/usr/bin/env python3
"""Workshop 现栏按乙改：一列、无字/图分页、画幅一行、报错贴字段。"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
fails = []


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def ok(cond, msg):
    if not cond:
        fails.append(msg)


def fn_body(src, name):
    m = re.search(r"function " + name + r"\([^)]*\) \{", src)
    if not m:
        return ""
    i = m.end() - 1
    depth = 0
    for j, ch in enumerate(src[i:], i):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return src[m.start():j + 1]
    return src[m.start():]


tester = read("js/wf-tester.js")
spec = read("css/specimen.css")
html_page = read("font-detail.html")
html_fn = fn_body(tester, "html")
take = fn_body(tester, "takeTpl")
seed = fn_body(tester, "seedBg")
sync_bg = fn_body(tester, "syncBgPick")
apply = fn_body(tester, "applyLayers")
overlay = fn_body(tester, "overlay")
note_fn = fn_body(tester, "note")
setc = fn_body(tester, "setContent")
warn = fn_body(tester, "warnPaint")
avatar_js = read("js/wf-avatar.js")
preview_py = read("scripts/preview-local.py")

ok("tester-tabs" not in html_fn, "html() must not emit 字/图 tabs")
ok('data-tab="type"' not in html_fn and 'data-tab="media"' not in html_fn,
   "html() must not emit data-tab type/media")
ok(">图<" not in html_fn,
   "html() must not label 图 tabs")
ok("data-panel=" not in html_fn, "html() must be one column, not two tab panels")
ok("pills('frame'" not in html_fn and 'data-set="frame"' not in html_fn,
   "html() must not emit 窄幅/分享图/X/横幅/方图 chips")
ok("data-out" in html_fn, "html() must keep the one-line 画幅 readout")
ok("画幅" in html_fn or "画幅" in fn_body(tester, "syncFrames"),
   "画幅 readout must say 画幅")
ok("显示" not in html_fn, "html() must not emit 显示 pill row")
ok("署名" in html_fn, "credit toggles must be labeled 署名")
ok("wall-bgs" in html_fn and "data-wall-bg" in html_fn,
   "wall photos stay in the same column (every template can pick a bg)")
ok("tester-under" in html_fn, "weights/align stay under the canvas")
ok(re.search(r'class="btn-text"\s+data-copy', html_fn),
   "复制图 stays a text button")
ok(re.search(r'class="btn"\s+data-done', html_fn),
   "完成 is a default grey .btn, not a text link")
ok(not re.search(r'class="[^"]*btn-text[^"]*"\s+data-done', html_fn),
   "完成 must not be btn-text")
ok(not re.search(r'class="[^"]*btn-ink[^"]*"\s+data-done', html_fn),
   "完成 must not steal 导出图's btn-ink")
ok("btn-ink" in html_fn and "data-export" in html_fn,
   "导出图 stays the primary black button")
ok('data-note="avatar"' in tester and 'data-note="bg"' in tester,
   "notes must sit on avatar and bg fields, not a shared tester-end line")
ok(not re.search(r"tester-end[^']*'[^']*data-note hidden", html_fn)
   and "tester-end\"><p class=\"tester-note\"" not in html_fn,
   "do not keep a bare data-note in tester-end")

ok(take and "note(" in take, "takeTpl must clear field notes so a stale avatar note cannot follow 匾额")
ok("inp.value = src" not in seed and "inp.value=src" not in seed,
   "seedBg must not dump the wall URL into the address field")
ok("data-slot=\"bg\"" in sync_bg or "data-slot='bg'" in sync_bg,
   "syncBgPick must highlight thumbs from the canvas src, not the URL input")
ok("WALL_BGS" in sync_bg, "syncBgPick must treat stock wall photos as selected thumbs")
ok("WFAvatar.cravatar" in setc,
   "setContent must hash the email via WFAvatar.cravatar")
ok("slot === 'avatar' && !slotHas('avatar')" not in setc
   and "slot === 'avatar'&&!slotHas('avatar')" not in setc,
   "setContent must fetch Cravatar on every template, including 诗签")
ok("k === 'avatar' && !slotHas('avatar')" not in overlay
   and "k === 'avatar'&&!slotHas('avatar')" not in overlay,
   "overlay must restore the email avatar onto every template")
ok("https://cravatar.com/avatar/" in avatar_js,
   "Cravatar host is cravatar.com (never cravatar.cn)")
ok("cravatar.cn" not in avatar_js, "do not write cravatar.cn")
ok("&d=mp" in avatar_js,
   "Cravatar is Gravatar-compat: missing custom photo uses mp default, not 404")
ok("&d=404" not in avatar_js,
   "tester avatar URL must not 404 missing photos")
ok("d=identicon" not in avatar_js,
   "do not switch tester default to identicon")
ok("/cravatar/avatar/" in avatar_js,
   "adopt must paint Cravatar via same-origin /cravatar/avatar/ so export can read pixels")
ok("127.0.0.1" in avatar_js and "localhost" in avatar_js,
   "same-origin /cravatar/ proxy is preview-only; production uses cravatar.com CORS")
ok("/cravatar/avatar/" in preview_py and "https://cravatar.com/avatar/" in preview_py,
   "preview-local.py must proxy /cravatar/avatar/{md5} to cravatar.com")
ok("cravatar.cn" not in preview_py, "proxy must not write cravatar.cn")
ok("这个邮箱没有头像" not in tester,
   "missing custom photo is not an error; Cravatar returns a default")
ok("邮箱格式不对" in setc, "invalid email still notes format")
ok("头像加载失败" in setc, "network/load fail still notes")
ok(not re.search(r"在线图片只能预览，导出请改用上传['\"],\s*slot === 'avatar'", setc),
   "email avatar must not show the remote-preview note")
ok("在线图片只能预览，导出请改用上传" in setc,
   "pasted remote bg still warns")
ok('data-slot="avatar"' in warn or "data-slot='avatar'" in warn,
   "warnPaint must not treat the email avatar as a remote bg warning")
ok("zoom" in apply and "data-has-bg" in apply,
   "applyLayers must hide 取景/横/纵/压色 when there is no background")
ok("data-field=\"bg\"" not in apply or "slotHas('bg')" not in apply,
   "applyLayers must not hide the background field")
ok("avField.hidden" not in apply,
   "applyLayers must not hide 头像邮箱; it stays on every template")
ok("data-has-avatar" in apply,
   "face slider hides until an avatar is painted, same as crop vs data-has-bg")
ok("slotHas('avatar')" not in apply,
   "face slider must not stay gated on the old template slot")
ok("slot" in note_fn, "note() must take a field id so errors stay on that field")

ok(re.search(r"wf-tester\.js\?v=20260929ui\d+", html_page),
   "font-detail.html must bump wf-tester stamp")
ok(re.search(r"wf-avatar\.js\?v=20260929ui\d+", html_page),
   "font-detail.html must bump wf-avatar stamp")
ok(re.search(r"specimen\.css\?v=20260929ui\d+", html_page),
   "font-detail.html must stamp specimen.css")

ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-layers\.is-credit[^{]*\{",
    spec) or re.search(
    r"\.tester-layers\.is-credit[^{]*\{", spec),
   "specimen.css must style 署名 as text toggles, not black pills")
ok(re.search(
    r"\[data-copy\][\s\S]{0,200}background:\s*none", spec)
   or re.search(
    r"\.tester-foot \[data-copy\]", spec),
   "specimen.css: 复制图 is text, not a grey bar")
ok(re.search(
    r"\.tester-dock \[data-done\][^{]*\{[^}]*(width:\s*100%|justify-self:\s*stretch)",
    spec),
   "specimen.css: 完成 is full rail width")
ok(not re.search(
    r"\.tester-end\s*>\s*\[data-done\][^{]*\{[^}]*(height:\s*auto|font-size:\s*var\(--fs-13\))",
    spec),
   "specimen.css must not shrink 完成 back to a text link")
ok(not re.search(r"\.tester-tabs button\.is-on \{[^}]*background:\s*var\(--ink\)", spec)
   or "tester-tabs" not in fn_body(tester, "html"),
   "字/图 tab strip must not be in the shipped rail")
ok("tester-cols-2" not in html_fn,
   "rail crop sliders are not two columns")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-scroll \{[^}]*gap:\s*var\(--s-3\)",
    spec),
   "editing rail groups use --s-3, not mixed 8/12/16")
ok(re.search(
    r"\.glyph-wall\.is-editing \.wall-bgs \{[^}]*margin:\s*0",
    spec),
   "wall thumbs do not add extra margin on top of rail gap")
ok(not re.search(
    r"\.glyph-wall\.is-editing \.wall-bgs \{[^}]*repeat\(2",
    spec),
   "editing wall stays three columns so 取景 still fits above 完成")
ok(not re.search(
    r"\.glyph-wall\.is-editing[^{]*weights button \{[^}]*font-size:\s*11px",
    spec),
   "editing weight chips use type tokens, not 11px")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-under \{[^}]*margin-top:\s*0",
    spec),
   "canvas to under-controls uses studio gap, not extra margin")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-colors \{[^}]*margin-top:\s*0",
    spec),
   "字/纸 row does not double the rail gap")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-end \{[^}]*padding-top:\s*var\(--s-3\)",
    spec),
   "dock padding-top is --s-3, same as rail group gap")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-foot \{[^}]*padding-top:\s*0",
    spec),
   "editing 复制图 row does not add a second padding-top")
ok(re.search(
    r"\.tester-layers\.is-credit \.tester-pills \{[^}]*gap:\s*var\(--s-2\)",
    spec),
   "署名 pills use --s-2, not 0.65rem")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-color input\[type=\"color\"\] \{[^}]*height:\s*1\.5rem",
    spec),
   "字/纸 swatches match 1.5rem inputs")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-colors button \{[^}]*padding:\s*0",
    spec),
   "反相 is a text toggle like 署名, not a padded chip")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-under-face:has\(\[data-face-sliders\]\[hidden\]\) \{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)",
    spec),
   "when 大小 is hidden the face row is two columns, not an empty third")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-under-face > \[data-face-sliders\] > \.tester-row \{[^}]*min-height:\s*1\.5rem",
    spec),
   "大小 slider row matches the 1.5rem email/bg fields")
ok(re.search(
    r"\[data-field=\"avatar\"\] \.input,[\s\S]{0,80}"
    r"\[data-field=\"bg\"\] \.input \{[^}]*padding-inline:\s*var\(--s-3\)",
    spec),
   "editing inputs pad with --s-3, not 0.65rem")

def assign_expr(fn, name):
    m = re.search(r"const " + name + r" = ", fn)
    if not m:
        return ""
    i = m.end()
    depth = 0
    for j, ch in enumerate(fn[i:], i):
        if ch in "({[":
            depth += 1
        elif ch in ")}]":
            depth -= 1
        elif ch == ";" and depth == 0:
            return fn[i:j]
    return fn[i:]


type_s = assign_expr(html_fn, "typeBody")
media_s = assign_expr(html_fn, "mediaBody")
ok(type_s.find("subRow") >= 0 and type_s.find("credit") > type_s.find("subRow"),
   "typeBody: 署名 immediately follows 副文")
ok(type_s.find("credit") >= 0 and type_s.find("colors") > type_s.find("credit"),
   "typeBody: 反相 follows 署名, not 字号")
colors_s = assign_expr(html_fn, "colors")
ok(">字<" in colors_s and ">纸<" in colors_s,
   "color swatches show 字/纸 labels")
ok("slider('size'" not in type_s and "slider('leading'" not in type_s
   and "slider('tracking'" not in type_s,
   "typeBody must not keep 字号/行距/字距 (those go under the canvas)")
under_i = html_fn.find("tester-under")
ok(under_i >= 0, "html() still emits tester-under")
under_s = html_fn[under_i:] if under_i >= 0 else ""
type_sliders = assign_expr(html_fn, "typeSliders")
has_type = "slider('size'" in under_s or (
    "typeSliders" in under_s and "slider('size'" in type_sliders)
ok(has_type and "slider('leading'" in (under_s + type_sliders)
   and "slider('tracking'" in (under_s + type_sliders),
   "tester-under second row is 字号/行距/字距")
size_mark = under_s.find("slider('size'")
if size_mark < 0:
    size_mark = under_s.find("typeSliders")
ok(under_s.find("wt") >= 0 and size_mark > under_s.find("wt")
   and under_s.find("pills('align'") >= 0
   and under_s.find("pills('align'") < size_mark,
   "字号 sliders are a second row under weights/align, not mixed into Thin…Black")
ok("tester-under-row" in under_s,
   "weights+align stay on their own row so sliders cannot sit beside Thin")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-under \{[^}]*flex-direction:\s*column",
    spec),
   "editing tester-under stacks weights row then type sliders")
ok("tester-cols-2" not in type_sliders,
   "canvas-under type sliders are not two columns (the strip is as wide as the preview)")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-under \.tester-sliders \{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)",
    spec),
   "type sliders under the canvas are three columns: 字号 行距 字距")
ok("field('avatar'" not in type_sliders,
   "email is not in the 字号 row")
ok("slider('face'" not in type_sliders,
   "大小 is not in the 字号 row")
ok("tester-under-face" in assign_expr(html_fn, "faceRow") or "tester-under-face" in under_s,
   "email+背景+大小 sit in tester-under-face under the type sliders")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-under-face \{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)",
    spec),
   "email / 背景 / 大小 are three columns matching 字号 行距 字距")
ok(not re.search(
    r"\.tester-under-face > \[data-field=\"avatar\"\] \{[^}]*grid-column:\s*1\s*/\s*span\s*2",
    spec),
   "email does not span two columns")
ok("minmax(16rem" not in spec or not re.search(
    r"\.tester-under \.tester-sliders \{[^}]*minmax\(16rem",
    spec),
   "do not keep the wide email column that squeezed 字号")
ok(re.search(
    r"\[data-field=\"sub\"\] \.input,[\s\S]{0,80}"
    r"\[data-field=\"avatar\"\] \.input,[\s\S]{0,80}"
    r"\[data-field=\"bg\"\] \.input \{[^}]*height:\s*1\.5rem",
    spec),
   "editing 副文/邮箱/图片 inputs are all 1.5rem")
ok("输入副文" in html_fn, "副文 placeholder is 输入副文")
ok("副文字 / 署名" not in html_fn, "do not keep 副文字 / 署名")
persist_fn = fn_body(tester, "persist")
ok("data-slot" in persist_fn and "bg" in persist_fn,
   "persist must save the painted canvas bg src, not only the empty URL field")
face_row = assign_expr(html_fn, "faceRow")
under_face = under_s + face_row + type_sliders
ok("field('avatar'" in face_row,
   "头像邮箱 is on the face row under the canvas")
ok("field('avatar', 'email', '输入邮箱获取 Cravatar 头像', 1)" in face_row,
   "avatar upload sits inside the email field")
ok("data-face-pick" not in face_row and "data-face-pick" not in html_fn,
   "do not keep a lonely upload 占位")
ok("field('bg'" in face_row,
   "背景图上传框 sits under the canvas")
ok("field('bg', 'url'" in face_row and ", 1)" in face_row[face_row.find("field('bg'"):face_row.find("field('bg'") + 80],
   "背景 field keeps its upload button")
ok("输入邮箱获取 Cravatar 头像" in face_row,
   "avatar placeholder is 输入邮箱获取 Cravatar 头像")
ok("填邮箱自动取头像" not in tester,
   "do not keep the old 填邮箱自动取头像 copy")
ok("field('avatar'" not in media_s,
   "头像邮箱 is not on the right rail")
ok("field('bg'" not in media_s,
   "背景 URL field leaves the right rail")
ok("slider('face'" in face_row,
   "头像滑杆 sits under the canvas with the email")
ok("slider('face', '大小'" in face_row,
   "face slider label is 大小, not a long sentence")
ok("slider('face'" not in media_s,
   "face slider leaves the right rail")
ok("tester-avatar-col" not in under_face,
   "email and 大小 are not nested in tester-avatar-col")
ok("tester-avatar-col" not in spec,
   "do not keep tester-avatar-col column stack")
av_i = face_row.find("field('avatar'")
bg_i = face_row.find("field('bg'")
face_i = face_row.find("data-face-sliders")
ok(av_i >= 0 and bg_i > av_i and face_i > bg_i,
   "face row is 邮箱, 背景, 大小")
ok("data-face-sliders" in face_row,
   "face slider wrapper remains so applyLayers can hide 大小")
ok("faceRow" in under_s,
   "tester-under concatenates faceRow after type sliders")
ok("cropRow" not in html_fn,
   "do not keep a canvas-under cropRow")
ok("slider('zoom'" not in face_row,
   "取景 sliders are not on the face row")
ok("slider('zoom'" in media_s and "tester-cols-2" not in media_s,
   "取景/横/纵/压色 sit on the right rail in one column")
ok(not re.search(
    r"\.tester-under-face \{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)",
    spec),
   "face row is not two columns")
ok(re.search(
    r"@media \(max-width:\s*560px\) \{[\s\S]{0,280}?\.tester-under \.tester-sliders \{[^}]*minmax\(0,\s*1fr\)",
    spec),
   "560: type sliders are one column so phone tracks are not 98px")
ok(not re.search(
    r"@media \(max-width:\s*560px\) \{[\s\S]{0,480}?\.tester-under-face \{[^}]*minmax\(0,\s*1fr\)\s+auto",
    spec),
   "560: face row is not email+upload auto columns")
ok(re.search(
    r"@media \(max-width:\s*560px\) \{[\s\S]{0,800}?\.tester-under-face[^{]*\{[^}]*minmax\(0,\s*1fr\)",
    spec),
   "560: email, 背景, 大小 stack one column")
ok("wall-bgs" in media_s,
   "mediaBody keeps the preset wall thumbs")
wall = media_s.find("wall-bgs")
zoom = media_s.find("slider('zoom'")
ok(wall >= 0 and zoom > wall,
   "mediaBody: 背景墙 then 取景/横/纵/压色")
ok("slider('zoom'" in media_s and "slider('face'" not in media_s,
   "头像 slider is not in the 取景 crop group")
ok("<h4>样张模板" in html_fn, "left column title is 样张模板")
ok("<h4>模板</h4>" not in html_fn, "do not keep the short 模板 heading")
ok("<h4>文字" not in html_fn and "<h4>画面" not in html_fn
   and "tester-kicker" not in html_fn,
   "do not add 文字/画面 section titles")

if fails:
    print("FAIL")
    for f in fails:
        print(" -", f)
    sys.exit(1)
print("PASS tester-rail-yi contract")
