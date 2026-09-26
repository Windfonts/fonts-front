# Wave-1 中文厂商 TC 入库（2026-09-26）

## 闸口
定案开闸：阿里普惠體 TC → MiSans TC → OPPO（SC 升 4.0；TC 待官方 zip）。

## CDN
- `https://cn.windfonts.com/fonts-packages/Albbphttc/{Light,Regular,SemiBold,ExtraBold}/full/result.css`
- `https://cn.windfonts.com/fonts-packages/Misatc/{Thin,Extralight,Light,Normal,Regular,Medium,Demibold,Semibold,Bold,Heavy}/full/result.css`
- `https://cn.windfonts.com/fonts-packages/Opsa/{Light,Regular,Medium,SemiBold,Bold}/full/result.css`（4.0 覆盖 3.04）

## 产品卡 / 配对
- `alibaba-puhuiti`：SC `wenfeng-albbpht` + TC `wenfeng-albbphttc`
- `xiaomi-misans`：SC `wenfeng-misa` + TC `wenfeng-misatc`
- `oppo-sans`：SC-only（无官方独立 TC zip 前不加 TC chip）

## 明确不做
- 吉利 / 上海摩登：无 CDN、无 vault
- Wave-2 HarmonyOS TC / vivo TW；Adobe r8–r11

## 源件
- `_fonts_park/wave1-dl/AlibabaSansTC/`（官网 fonts.alibabadesign.com + Referer）
- `_fonts_park/wave1-dl/MiSans_TC.zip`（hyperos.mi.com）
- `_fonts_park/wave1-dl/OPPO_Sans_4.0.zip`（coloros A00000074）→ 实例化静态 `Opsa40-static/`
