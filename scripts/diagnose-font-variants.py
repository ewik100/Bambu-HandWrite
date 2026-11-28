from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
import json
import sys

ROOT = Path(".")
OUT = ROOT / "diagnostics"
OUT.mkdir(exist_ok=True)
FONT_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "fonts/BambuHandWriteSchool-Regular.woff2"
SAMPLE = [
    "мама мыла раму",
    "тетрадь и шоссе",
    "школьная ручка",
    "Привет, мир!",
    "машина летит высоко",
    "т тт ттт. Тетрадь. мама там.",
    "тт, лл, мм, шш, ии, жж, ёж, йод",
    "minimum  letter  school  hello",
    "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
    "абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
]

def lookup_details(font, feature_tag="calt"):
    if "GSUB" not in font:
        return {"features": [], feature_tag: None}
    table = font["GSUB"].table
    feature_tags = sorted({r.FeatureTag for r in table.FeatureList.FeatureRecord})
    calt_records = [r for r in table.FeatureList.FeatureRecord if r.FeatureTag == feature_tag]
    lookups = []
    seen = set()
    for record in calt_records:
        for index in record.Feature.LookupListIndex:
            if index in seen:
                continue
            seen.add(index)
            lookup = table.LookupList.Lookup[index]
            entry = {
                "lookup_index": index,
                "lookup_type": lookup.LookupType,
                "subtables": [],
            }
            for sub in lookup.SubTable:
                subinfo = {"class": type(sub).__name__}
                for key in ("mapping", "alternates", "ligatures"):
                    value = getattr(sub, key, None)
                    if isinstance(value, dict):
                        subinfo[key + "_count"] = sum(
                            len(v) if isinstance(v, (list, tuple)) else 1
                            for v in value.values()
                        )
                        if key == "mapping":
                            subinfo["sample"] = list(value.items())[:12]
                for key in ("SubRuleSet", "ChainSubRuleSet", "SubClassSet", "ChainSubClassSet"):
                    value = getattr(sub, key, None)
                    if value:
                        subinfo[key + "_count"] = sum(1 for item in value if item)
                entry["subtables"].append(subinfo)
            lookups.append(entry)
    types = sorted({x["lookup_type"] for x in lookups})
    return {"features": feature_tags, feature_tag: {"lookup_count": len(lookups), "lookup_types": types, "lookups": lookups}}

font = TTFont(FONT_PATH)
cmap = font.getBestCmap() or {}
gs = lookup_details(font)
style01 = lookup_details(font, "ss01")
style02 = lookup_details(font, "ss02")
t_glyph_names = ["uni0442", "uni0442.ss01", "uni0442.ss02"]
t_glyph_report = {}
for glyph_name in t_glyph_names:
    glyph = font["glyf"][glyph_name]
    if glyph.numberOfContours <= 0 or getattr(glyph, "components", None):
        raise SystemExit(f"Lowercase т glyph {glyph_name} is not a decomposed outline")
    advance, lsb = font["hmtx"][glyph_name]
    t_glyph_report[glyph_name] = {
        "bounds": [glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax],
        "advance": advance,
        "left_side_bearing": lsb,
        "contours": glyph.numberOfContours,
    }
report = {
    "font": str(FONT_PATH),
    "lowercase_t_glyphs": t_glyph_report,
    "glyph_count": len(font.getGlyphOrder()),
    "cyrillic_codepoints": sum(0x400 <= cp <= 0x4FF for cp in cmap),
    "uppercase_cyrillic_missing": [f"U+{ord(ch):04X}" for ch in "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ" if ord(ch) not in cmap],
    "lowercase_cyrillic_missing": [f"U+{ord(ch):04X}" for ch in "абвгдеёжзийклмнопрстуфхцчшщъыьэюя" if ord(ch) not in cmap],
    "gsub_features": gs["features"],
    "calt": gs["calt"],
    "ss01": style01["ss01"],
    "ss02": style02["ss02"],
}
if "GPOS" in font:
    gpos = font["GPOS"].table
    report["gpos_features"] = sorted({r.FeatureTag for r in gpos.FeatureList.FeatureRecord})
    report["gpos_cursive_lookup_count"] = sum(1 for x in gpos.LookupList.Lookup if x.LookupType == 3)
else:
    report["gpos_features"] = []
    report["gpos_cursive_lookup_count"] = 0

font.flavor = None
ttf_path = OUT / "Bambu-HandWrite-School.ttf"
font.save(ttf_path)

size = 58
pil_font = ImageFont.truetype(str(ttf_path), size, layout_engine=ImageFont.Layout.RAQM)
label_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
sample_font = [
    ("A — база + контекст", ["+calt", "-ss01", "-ss02"]),
    ("B — альтернатива ss01 + контекст", ["+calt", "+ss01", "-ss02"]),
    ("C — альтернатива ss02 + контекст", ["+calt", "-ss01", "+ss02"]),
]
section_height = 46 + len(SAMPLE) * 82 + 5
width, height = 2300, 62 + len(sample_font) * section_height
sheet = Image.new("RGB", (width, height), "#f7f5ef")
draw = ImageDraw.Draw(sheet)
draw.text((30, 16), "Bambu HandWrite — real OpenType letter variants", font=label_font, fill="#263b54")
y = 62
rendered = {}
for label, features in sample_font:
    draw.rounded_rectangle((24, y, width - 24, y + 38), radius=8, fill="#e8edf1")
    draw.text((38, y + 5), label, font=label_font, fill="#263b54")
    y += 46
    for line in SAMPLE:
        draw.text((38, y), line, font=pil_font, fill="#183c70", language="ru", features=features)
        y += 82
    rendered[label] = features
    y += 5

def render_sample(features):
    im = Image.new("L", (2100, 620), 0)
    d = ImageDraw.Draw(im)
    yy = 8
    for line in SAMPLE:
        d.text((10, yy), line, font=pil_font, fill=255, language="ru", features=features)
        yy += 66
    return im

renders = {label: render_sample(features) for label, features in sample_font}
base = renders[sample_font[0][0]]
report["render_comparison"] = {}
for label, _ in sample_font[1:]:
    diff = ImageChops.difference(base, renders[label])
    report["render_comparison"][label] = {
        "different_pixels_vs_base": sum(1 for p in diff.getdata() if p),
        "difference_bbox": list(diff.getbbox()) if diff.getbbox() else None,
    }
sheet.save(OUT / "font-variants-A-B-C.png")
diff01 = ImageChops.difference(renders[sample_font[1][0]], renders[sample_font[2][0]])
diff01.convert("RGB").save(OUT / "font-variants-ss01-vs-ss02.png")
(OUT / "font-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
