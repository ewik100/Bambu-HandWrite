# Beginner's guide

This guide walks through opening the app, preparing a page, checking the toolpath, and cautiously testing the generated G-code. Do not proceed when any step is unclear.

## What you need

- A modern browser on a computer or phone.
- Bambu Lab A1 as the project's first target model. Other printers are not supported until separately adapted and tested.
- A secure pen holder that cannot snag the printer.
- Paper and a reliable way to keep it flat and fixed to the build plate.
- The printer's microSD card and the ability to stop the job immediately.

## Open and use the app

1. Open `index.html` in your browser. No installation, server, or build step is needed.
2. Enter a short sample phrase first. Do not begin with a full page.
3. Enter your work title in **Work title / G-code filename**. Cyrillic text is immediately transliterated to Latin for the download filename and the G-code `Title` comment. For example, `Домашняя работа по физике` becomes `Domashnyaya_rabota_po_fizike.gcode`. The filename and title comment contain no Cyrillic characters. The title is not printed on the paper.
4. Choose the paper type and page size. The selected default handwriting profile uses a 4.7 mm lowercase x-height; uppercase letters are naturally taller. On squared notebook paper, the default outer-edge inset is 10 mm (two 5 mm cells), and the top inset is also 10 mm. The binding-side red margin has a separate two-cell writing clearance: 10 mm for a standard 5 mm grid, whether that red line is on the left or right. For ruled paper, the binding-side clearance is 10 mm. Choose **Custom paper size** to enter the actual page width and height in millimetres (40–420 mm).
5. For a notebook page placed sideways, choose **Normal**, **Left leaf** or **Right leaf** under page placement. A left leaf places its original right edge towards the top edge of the plate; a right leaf places its original left edge towards the top edge. The physical footprint changes from 165 × 203 mm to 203 × 165 mm, while the page preview remains readable. Select the actual side of the red line separately: left or right. Keep the selected red-line side consistent with the red line on your physical page.
6. Inspect the page preview and the printer-bed preview. Red and hatched regions indicate areas that must be avoided.
7. Generate G-code, show the pen paths, and play the route stroke by stroke. Check every letter and punctuation mark.
8. Download the G-code file using the work title you entered. Regenerate it after every text, title, or setting change.

A clean programmatic geometry check does not prove that every glyph looks correct or that the toolhead is physically safe.

## Understanding Z

The Z field is the printer nozzle's absolute Z coordinate after homing. It is **not** the measured distance from the pen tip to the paper. The holder and pen may extend below the nozzle. The 10 mm minimum is a software limit, not a guarantee of 10 mm physical clearance.

The app creates three levels:

- Writing: `Z`.
- Pen-up travel: `Z + 4 mm`.
- Safe lift / second wait: `Z + 20 mm`.

For example, with `Z = 30 mm`, writing is `Z30`, travel is `Z34`, and the second waiting position is `Z50`. The pen tip must be calibrated to reach the paper at the writing coordinate. The same geometry means that at the second wait the tip is 20 mm above the paper, and during pen-up travel it is 4 mm above the paper. This is only a coordinate explanation; measure your own holder and verify it in a supervised test.

## Two stops in the generated file

1. **Stop 1 is manual.** Secure the sheet and prepare the holder. If the holder's clearance during homing has not been verified, remove it from the toolhead before resuming. The printer then runs `G28` to home its axes.
2. **Stop 2 is an automatic dwell.** The nozzle pauses directly above the physical upper-left corner of the page rectangle on the plate, then waits for the selected time (130 seconds by default). For a sideways page, this is the upper-left corner of its rotated physical footprint. This is not necessarily the first pen stroke; after the dwell, the head moves to the first stroke. Do not press Resume a second time; the file continues automatically.

The timer may not be displayed as a countdown on the printer. If you need more time, stop the job, change the setting, and generate a new file.

## Safety and compatibility

Bambu HandWrite is an independent community project, not an official Bambu Lab product. Bambu Lab A1 is the first target model. Before each job, inspect the holder, calibrate the pen-tip clearance, secure the paper, and confirm the full motion path on your own setup. Never leave the printer unattended. Read [SAFETY.md](SAFETY.md) and [COMPATIBILITY.md](COMPATIBILITY.md) before using the generated file. Do not run it on another printer model without a separate adaptation.

The app uses browser canvas/SVG and saves settings in local browser storage. Optional handwriting fonts may load from Google Fonts; the interface has a system-font fallback when offline.