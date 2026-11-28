#!/usr/bin/env python3
"""Remove the rightward slant from lowercase Cyrillic т in all three font styles.

Only uni0442, uni0442.ss01 and uni0442.ss02 are changed. Their original horizontal
bounds, advance widths and left side bearings are preserved so existing OpenType
variation, word widths, line wrapping and app-level joining remain stable.
"""
from pathlib import Path
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen

SHEAR = 0.38
TARGETS = ("uni0442", "uni0442.ss01", "uni0442.ss02")


def patch(path: Path) -> None:
    font = TTFont(path)
    if "glyf" not in font or "hmtx" not in font:
        raise SystemExit("Expected TrueType outlines and horizontal metrics")
    glyf = font["glyf"]
    glyph_set = font.getGlyphSet()
    missing = [name for name in TARGETS if name not in glyf]
    if missing:
        raise SystemExit("Missing lowercase Cyrillic т alternates: " + ", ".join(missing))

    report = []
    for name in TARGETS:
        old = glyf[name]
        if old.numberOfContours == 0:
            raise SystemExit(f"Glyph {name} has no outline")
        old_bounds = (old.xMin, old.yMin, old.xMax, old.yMax)
        old_width = old.xMax - old.xMin
        if old_width <= 0:
            raise SystemExit(f"Glyph {name} has invalid width")

        recording = DecomposingRecordingPen(glyph_set)
        old.draw(recording, glyf)
        shear_pen = TTGlyphPen(glyph_set)
        recording.replay(TransformPen(shear_pen, (1, 0, -SHEAR, 1, 0, 0)))
        sheared = shear_pen.glyph()
        sheared.recalcBounds(glyf)
        sheared_width = sheared.xMax - sheared.xMin
        if sheared_width <= 0:
            raise SystemExit(f"Sheared glyph {name} has invalid width")

        scale_x = old_width / sheared_width
        translate_x = old.xMin - scale_x * sheared.xMin
        final_pen = TTGlyphPen(glyph_set)
        recording.replay(TransformPen(final_pen, (scale_x, 0, -scale_x * SHEAR, 1, translate_x, 0)))
        updated = final_pen.glyph()
        updated.recalcBounds(glyf)
        if (updated.xMin, updated.xMax) != (old_bounds[0], old_bounds[2]):
            raise SystemExit(f"Glyph {name} changed its horizontal bounds unexpectedly")

        advance, _old_lsb = font["hmtx"][name]
        glyf[name] = updated
        font["hmtx"][name] = (advance, updated.xMin)
        report.append((name, old_bounds, (updated.xMin, updated.yMin, updated.xMax, updated.yMax), round(scale_x, 4)))

    for glyph in glyf.glyphs.values():
        try:
            glyph.recalcBounds(glyf)
        except (AttributeError, TypeError):
            pass
    bounded = [glyph for glyph in glyf.glyphs.values() if hasattr(glyph, "xMin")]
    font["head"].xMin = min(glyph.xMin for glyph in bounded)
    font["head"].yMin = min(glyph.yMin for glyph in bounded)
    font["head"].xMax = max(glyph.xMax for glyph in bounded)
    font["head"].yMax = max(glyph.yMax for glyph in bounded)
    if "hhea" in font:
        font["hhea"].recalc(font)
    font["head"].fontRevision = max(float(font["head"].fontRevision), 1.1)
    font.save(path)

    check = TTFont(path)
    for name in TARGETS:
        glyph = check["glyf"][name]
        if glyph.numberOfContours <= 0 or getattr(glyph, "components", None):
            raise SystemExit(f"Glyph {name} was not safely decomposed")
    features = {record.FeatureTag for record in check["GSUB"].table.FeatureList.FeatureRecord}
    if not {"calt", "ss01", "ss02"}.issubset(features):
        raise SystemExit("Existing contextual and alternate features were lost")
    print("Patched lowercase Cyrillic т glyphs:")
    for row in report:
        print(" ", row)
    print("Preserved GSUB features:", ", ".join(sorted(features)))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: patch-school-t-glyphs.py <font.ttf>")
    patch(Path(sys.argv[1]))
