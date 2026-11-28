#!/usr/bin/env python3
"""Deskew lowercase Cyrillic т in the base and both stylistic alternates.

The glyphs are decomposed and sheared without compressing the result back to
its old width. The advance width is expanded by the same amount, preventing
the corrected upright stems from colliding with the following glyph.
"""
from pathlib import Path
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen

# Caveat's lowercase т has a pronounced rightward handwritten lean.
# Apply the full affine correction; do not cancel it with a width rescale.
# Rebuild the bundled WOFF2 after every outline correction.
SHEAR = 0.42
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
        old_width = old.xMax - old.xMin
        if old_width <= 0:
            raise SystemExit(f"Glyph {name} has invalid width")

        recording = DecomposingRecordingPen(glyph_set)
        old.draw(recording, glyf)
        first = TTGlyphPen(glyph_set)
        recording.replay(TransformPen(first, (1, 0, -SHEAR, 1, 0, 0)))
        corrected = first.glyph()
        corrected.recalcBounds(glyf)
        new_width = corrected.xMax - corrected.xMin
        if new_width <= 0:
            raise SystemExit(f"Corrected glyph {name} has invalid width")

        # Keep the glyph visually centered while retaining the complete
        # deskew transform. Width expansion is reflected in hmtx advance.
        old_center = (old.xMin + old.xMax) * 0.5
        new_center = (corrected.xMin + corrected.xMax) * 0.5
        offset = old_center - new_center
        final_pen = TTGlyphPen(glyph_set)
        recording.replay(TransformPen(final_pen, (1, 0, -SHEAR, 1, offset, 0)))
        updated = final_pen.glyph()
        updated.recalcBounds(glyf)

        advance, _ = font["hmtx"][name]
        expanded_advance = max(advance + (new_width - old_width), updated.xMax - updated.xMin + 40)
        glyf[name] = updated
        font["hmtx"][name] = (round(expanded_advance), updated.xMin)
        report.append({
            "glyph": name,
            "old_bounds": [old.xMin, old.yMin, old.xMax, old.yMax],
            "new_bounds": [updated.xMin, updated.yMin, updated.xMax, updated.yMax],
            "old_advance": advance,
            "new_advance": round(expanded_advance),
            "shear": SHEAR,
        })

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
    font["head"].fontRevision = max(float(font["head"].fontRevision), 1.2)
    font.save(path)

    check = TTFont(path)
    for name in TARGETS:
        glyph = check["glyf"][name]
        if glyph.numberOfContours <= 0 or getattr(glyph, "components", None):
            raise SystemExit(f"Glyph {name} was not safely decomposed")
        advance, _ = check["hmtx"][name]
        if advance <= glyph.xMax - glyph.xMin:
            raise SystemExit(f"Glyph {name} has insufficient advance after deskew")
    features = {record.FeatureTag for record in check["GSUB"].table.FeatureList.FeatureRecord}
    if not {"calt", "ss01", "ss02"}.issubset(features):
        raise SystemExit("Existing contextual and alternate features were lost")
    print("Deskewed lowercase Cyrillic т glyphs:")
    for row in report:
        print(" ", row)
    print("Preserved GSUB features:", ", ".join(sorted(features)))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: patch-school-t-glyphs.py <font.ttf>")
    patch(Path(sys.argv[1]))
