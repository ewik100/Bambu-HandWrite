import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let passed = 0;
function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
  console.log(`PASS ${message}`);
}
function throws(fn, pattern, message) {
  let caught;
  try { fn(); } catch (error) { caught = error; }
  assert(caught && pattern.test(String(caught.message)), message);
}

const limitsMatch = html.match(/const Z_LIMITS=\{[^}]+\};/);
const pitchCellsMatch = html.match(/function getLinePitchCells\(\)\{[^}]+\}/);
const pitchMmMatch = html.match(/function getLinePitchMm\(cell\)\{[^}]+\}/);
const zFunctionMatch = html.match(/function getPenZSettings\(\)\{[\s\S]*?\n\}/);
const pauseFunctionMatch = html.match(/function getPause2Seconds\(\)\{[\s\S]*?\n\}/);
const topMarginMatch = html.match(/function getTopMarginMm\(type,cell\)\{[^}]+\}/);
const lowercaseScaleMatch = html.match(/function scaleToLowercaseHeight\(targetMm,lowercaseAscentPx\)\{[^}]+\}/);
const cornerPauseMatch = html.match(/function getCornerPausePosition\(pageX,pageMachineY\)\{return \{[^}]+\}\}/);
const pagePlacementMatch = html.match(/function getPagePlacementParkPosition\(pageX,pageMachineY,pageWidth,pageHeight,tab\)\{[\s\S]*?\n\}/);
const fitSearchMatch = html.match(/function findLargestFittingTenth\(currentMm,fitsAt\)\{[\s\S]*?return best===null\?null:best\/10\}/);
const justifyCorrectionMatch = html.match(/function getJustifyCorrectionScale\(lines,boxes,rightX,widthScale,currentScale=1\)\{[\s\S]*?\n\}/);
const lineTransformMatch = html.match(/function withCanvasLineTransform\(cx,x,y,width,heightScale,draw\)\{[\s\S]*?\n\}/);
const routeGuardMatch = html.match(/function validateTextRouteCommands\(commands,zSettings\)\{[\s\S]*?\n\}/);\nconst writingBoundsMatch = html.match(/function getPaperWritingBounds\(width,type,red,cell,flip='right',leftInset=10\)\{[\s\S]*?\n\}/);\nconst preflightMatch = html.match(/function validateGeneratedGcode\(file,pauseSeconds,park,placementPark,page,zSettings,expectedDraw\)\{[\s\S]*?\n\}/);
const routeFunctionMatch = html.match(/function gcodeForPaths\(paths,model,raster\)\{[\s\S]*?\n\}/);
if (!limitsMatch || !pitchCellsMatch || !pitchMmMatch || !zFunctionMatch || !pauseFunctionMatch || !topMarginMatch || !lowercaseScaleMatch || !cornerPauseMatch || !pagePlacementMatch || !fitSearchMatch || !justifyCorrectionMatch || !lineTransformMatch || !routeGuardMatch || !writingBoundsMatch || !preflightMatch || !routeFunctionMatch) {
  throw new Error('Could not extract one or more safety-critical functions from index.html.');
}

let zInput = '30';
let pauseInput = '130';
let pitchCellsInput = '2';
let pitchUnitInput = 'cells';
let pitchMmInput = '15';
const context = {
  $: (id) => ({ value: id === 'penWriteZ' ? zInput : id === 'pitchCells' ? pitchCellsInput : id === 'pitchUnit' ? pitchUnitInput : id === 'pitchMm' ? pitchMmInput : pauseInput }),
  Number, String, Error, Math,
  orderPathsByComponent: (paths) => paths,
  simplify: (points) => points,
  getPenZSettingsForPreview: () => ({ write: 30, travel: 34, safe: 50 })
};
vm.createContext(context);
vm.runInContext(`${limitsMatch[0]}\n${pitchCellsMatch[0]}\n${pitchMmMatch[0]}\n${zFunctionMatch[0]}\n${pauseFunctionMatch[0]}\n${topMarginMatch[0]}\n${lowercaseScaleMatch[0]}\n${cornerPauseMatch[0]}\n${pagePlacementMatch[0]}\n${fitSearchMatch[0]}\n${justifyCorrectionMatch[0]}\n${lineTransformMatch[0]}\n${routeGuardMatch[0]}\n${writingBoundsMatch[0]}\n${preflightMatch[0]}\n${routeFunctionMatch[0]}`, context);

assert(context.getLinePitchMm(5) === 10, 'Two cells produce a 10 mm baseline step on 5 mm grid');
pitchCellsInput = '1';
assert(context.getLinePitchMm(5) === 5, 'One cell produces exactly one 5 mm grid step');
pitchCellsInput = '6';
assert(context.getLinePitchMm(5) === 30, 'Six cells produce a 30 mm baseline step');
pitchCellsInput = '1';
assert(context.getLinePitchMm(4.5) === 4.5, 'One cell follows a 4.5 mm notebook grid exactly');
pitchCellsInput = '2';
assert(context.getLinePitchMm(4.5) === 9, 'Two cells follow a 4.5 mm notebook grid exactly');
pitchUnitInput = 'mm';
pitchMmInput = '12,5';
assert(context.getLinePitchMm(5) === 12.5, 'Millimetre mode accepts decimal comma and exact baseline step');
pitchMmInput = '3';
assert(context.getLinePitchMm(5) === 5, 'Millimetre mode enforces 5 mm minimum');
pitchMmInput = '75';
assert(context.getLinePitchMm(5) === 60, 'Millimetre mode enforces 60 mm maximum');
pitchUnitInput = 'cells'; pitchCellsInput = '2';
assert(context.getTopMarginMm('math-notebook', 5) === 10, 'Squared notebook starts two 5 mm cells below the top edge');
assert(context.getTopMarginMm('math-notebook', 4) === 8, 'Top inset follows the configured grid-cell size');
assert(context.getTopMarginMm('russian-notebook', 8.35) === 0 && context.getTopMarginMm('a4-plain', 8.35) === 0, 'Ruled and plain paper keep no extra top inset');
const normalPage=context.getPaperWritingBounds(165,'math-notebook',20,5,'right',10);
assert(normalPage.startX===10&&normalPage.rightX===143.5&&normalPage.redLineX===145,'Normal 5.4.4 notebook layout exactly preserves the 5.4.2 margins');
const flippedGrid=context.getPaperWritingBounds(165,'math-notebook',20,5,'left',10);
assert(flippedGrid.startX===25&&flippedGrid.rightX===155&&flippedGrid.redLineX===20,'Flipped grid page starts one cell after the left red line and leaves 10 mm at the far edge');
const flippedRuled=context.getPaperWritingBounds(165,'russian-notebook',20,8.35,'left',10);
assert(flippedRuled.startX===25&&flippedRuled.rightX===155,'Flipped ruled paper uses the 5 mm start offset and 10 mm far-edge margin');
const flippedPlain=context.getPaperWritingBounds(210,'a4-plain',20,8.35,'left',10);
assert(flippedPlain.guideOnly&&flippedPlain.startX===15&&flippedPlain.rightX===200,'Flipped plain A4 has a preview-only guide, 5 mm start offset and 10 mm end margin');
const normalPlain=context.getPaperWritingBounds(210,'a4-plain',20,8.35,'right',10);
assert(normalPlain.startX===10&&normalPlain.rightX===208.5&&normalPlain.redLineX===null,'Normal plain A4 keeps the original 5.4.2 margins');
assert(context.scaleToLowercaseHeight(4.8, 2.4) === 2, 'A 4.8 mm lowercase target scales the measured x-height to 4.8 mm');
const mockCanvas={depth:0,saves:0,restores:0,save(){this.depth++;this.saves++},restore(){this.depth--;this.restores++},translate(){},transform(){}};
context.withCanvasLineTransform(mockCanvas,100,200,1,1.2,()=>{});
context.withCanvasLineTransform(mockCanvas,100,300,1,1.2,()=>{});
assert(mockCanvas.depth===0&&mockCanvas.saves===2&&mockCanvas.restores===2,'Each rendered text line restores its own canvas transform; later lines cannot inherit earlier scaling');
throws(()=>context.withCanvasLineTransform(mockCanvas,100,400,1,1.2,()=>{throw Error('draw failed')}),/draw failed/,'Canvas transform wrapper preserves drawing errors');
assert(mockCanvas.depth===0&&mockCanvas.saves===3&&mockCanvas.restores===3,'Canvas state is restored even when a line draw throws');
assert(context.scaleToLowercaseHeight(5, 0) === 1, 'Missing font metrics fall back to neutral vertical scaling');
const pausePoint = context.getCornerPausePosition(45.5, 253);
assert(pausePoint.x === 45.5 && pausePoint.y === 253, 'Second pause is directly above the upper-left page corner');
assert(context.getCornerPausePosition(2, 2).x === 3 && context.getCornerPausePosition(2, 2).y === 3, 'Second-pause nozzle parking stays inside the minimum machine boundary');
const sidePark = context.getPagePlacementParkPosition(45.5, 253, 165, 203, {x:0,w:100,depth:15,clearance:0});
assert(sidePark.x === 128 && sidePark.y === 42, 'F15-sized page gets a side parking point outside the page for sheet placement');
assert(sidePark.x < 45.5 || sidePark.x > 210.5 || sidePark.y < 50 || sidePark.y > 253, '50-second placement parking point is outside the paper rectangle');
assert(context.findLargestFittingTenth(5, value => value <= 4.9) === 4.9, 'Auto-fit recommends 4.9 mm instead of reducing a 5 mm setting more than needed');
assert(context.findLargestFittingTenth(5, value => value <= 2) === 2, 'Auto-fit can find the minimum allowed height');
assert(context.findLargestFittingTenth(2, () => false) === null, 'Auto-fit does not recommend a value below the minimum');
const justifyLines=[{text:'one two three',extraWordSpace:4}];
assert(context.getJustifyCorrectionScale(justifyLines,[{x:10,width:100}],100,1,1)<1,'SVG calibration reduces excessive word spacing when a line crosses the safe boundary');
assert(context.getJustifyCorrectionScale(justifyLines,[{x:10,width:80}],100,1,1)===1,'SVG calibration leaves a line unchanged when it already fits');
assert(context.getJustifyCorrectionScale([{text:'singleword',extraWordSpace:4}],[{x:10,width:100}],100,1,1)===1,'SVG calibration ignores lines without spaces');
const validGcode=[
  "; HEADER_BLOCK_START",
  "; generated by Bambu HandWrite 5.4.2",
  "; job_type = pen_plotter",
  "; printer_model = Bambu Lab A1",
  "; HEADER_BLOCK_END",
  "; CONFIG_BLOCK_START",
  "; accel_to_decel_enable = 0",
  "; accel_to_decel_factor = 50%",
  "; auxiliary_fan = 0",
  "; gcode_flavor = marlin",
  "; layer_height = 0.2",
  "; nozzle_diameter = 0.4",
  '; print_compatible_printers = "Bambu Lab A1 0.4 nozzle"',
  "; print_extruder_id = 1",
  '; print_extruder_variant = "Direct Drive Standard"',
  "; print_sequence = by layer",
  "; print_settings_id = 0.20mm Standard @BBL A1",
  "; printable_area = 0x0,256x0,256x256,0x256",
  "; printable_height = 256",
  "; printer_extruder_id = 1",
  "; printer_extruder_variant = \"Direct Drive Standard\"",
  "; printer_model = Bambu Lab A1",
  "; printer_settings_id = Bambu Lab A1 0.4 nozzle",
  "; printer_structure = i3",
  "; printer_technology = FFF",
  "; printer_variant = 0.4",
  "; filament_diameter = 1.75",
  "; CONFIG_BLOCK_END",
  "; EXECUTABLE_BLOCK_START",
  "; Bambu HandWrite 5.4.2 - raw G-code for Bambu Lab A1",
  "; Title: test",
  "M73 P0 R1",
  "G21 ; metric units",
  "G90 ; absolute positioning",
  "M400 U1 ; manual pause",
  "G28 ; home all axes",
  "G1 Z50.000 F1200 ; safe height above plate",
  "M400",
  "G0 X45.500 Y253.000 F2000 ; nozzle pauses directly above the paper top-left corner",
  "M400",
  "M400 S130 ; SECOND STOP",
  "G1 Z34.000 F1200 ; pen up before drawing the page outline",
  "G0 X45.500 Y253.000 F1900 ; outline start on protective A4",
  "G1 Z30.000 F1200 ; draw outline on protective A4",
  "G1 X210.500 Y253.000 F1250 ; outline top edge",
  "G1 X210.500 Y50.000 F1250 ; outline right edge",
  "G1 X45.500 Y50.000 F1250 ; outline bottom edge",
  "G1 X45.500 Y253.000 F1250 ; close outline",
  "G1 Z50.000 F1200 ; lift before sheet placement",
  "G0 X128.000 Y42.000 F2000 ; move clear of page for placement",
  "M400",
  "M400 S50 ; 50-second placement window",
  "G1 Z34.000 F1200 ; pen-up travel after placement",
  "G1 Z34.000 F1200",
  "G0 X55.000 Y240.000 F1800",
  "G1 Z30.000 F1200",
  "G1 X60.000 Y240.000 F1500",
  "G1 Z34.000 F1200",
  "G1 Z50.000 F1200 ; final safe lift",
  "G0 X128.000 Y246.000 F2000 ; park/present bed",
  "M73 P100 R0",
  "M400",
  "; EXECUTABLE_BLOCK_END"
].join('\n')+'\n';
const testPage={x:45.5,y:253,w:165,h:203};
const testPause={x:45.5,y:253};
const testSidePark={x:128,y:42};
const testZ={safe:50,travel:34,write:30};
const drawCommands=['G1 Z34.000 F1200','G0 X55.000 Y240.000 F1800','G1 Z30.000 F1200','G1 X60.000 Y240.000 F1500','G1 Z34.000 F1200'];
const routeCheck=context.validateTextRouteCommands(drawCommands,testZ,drawCommands);
assert(routeCheck.strokes===1&&routeCheck.segments===1,'Route guard accepts one complete pen-up/travel/write/XY/lift stroke');
throws(()=>context.validateTextRouteCommands(drawCommands.slice(0,4),testZ,drawCommands),/последний штрих не завершён/,'Route guard rejects a stroke that never raises the pen at the end');
throws(()=>context.validateTextRouteCommands(['G1 Z34.000 F1200','G0 X55.000 Y240.000 F1800','G1 X60.000 Y240.000 F1500','G1 Z34.000 F1200'],testZ,drawCommands),/вне режима письма/,'Route guard rejects XY drawing while the pen is not down');
throws(()=>context.validateTextRouteCommands(['G1 Z34.000 F1200','G1 Z30.000 F1200'],testZ,drawCommands),/без предварительного подвода/,'Route guard rejects lowering the pen without a preceding XY approach');
assert(context.validateGeneratedGcode(validGcode,130,testPause,testSidePark,testPage,testZ,drawCommands)===true,'G-code preflight accepts restored startup, second pause, protective-A4 outline and 50-second placement wait');
throws(()=>context.validateGeneratedGcode(validGcode.replace('M400 S130 ; SECOND STOP','M400 S129 ; SECOND STOP'),130,testPause,testSidePark,testPage,testZ,drawCommands),/вторая автоматическая остановка/,'G-code preflight rejects a missing or altered second pause');
throws(()=>context.validateGeneratedGcode(validGcode.replace('M400 S50 ; 50-second placement window','M400 S49 ; 49-second placement window'),130,testPause,testSidePark,testPage,testZ,drawCommands),/50-секундное окно/,'G-code preflight requires the fixed 50-second placement window');
throws(()=>context.validateGeneratedGcode(validGcode.replace('G1 X210.500 Y253.000 F1250 ; outline top edge','G1 X209.500 Y253.000 F1250 ; outline top edge'),130,testPause,testSidePark,testPage,testZ,drawCommands),/контур на защитном A4/,'G-code preflight checks the exact page outline');
throws(()=>context.validateGeneratedGcode(validGcode.replace('M400 S130 ; SECOND STOP\n','M400 S130 ; SECOND STOP\nG0 X50.000 Y250.000 F2000 ; unexpected move\n'),130,testPause,testSidePark,testPage,testZ,drawCommands),/после второй остановки первым движением/,'G-code preflight rejects any extra movement between pause 2 and the protective-A4 outline');
throws(()=>context.validateGeneratedGcode(validGcode.replace('G1 X60.000 Y240.000 F1500\n',''),130,testPause,testSidePark,testPage,testZ,drawCommands),/Проверка маршрута пера|рисующих движений текста|маршрут текста в скачиваемом файле/,'G-code preflight rejects a missing text stroke');
throws(()=>context.validateGeneratedGcode(validGcode.replace('G1 X60.000 Y240.000 F1500','G1 X61.000 Y240.000 F1500'),130,testPause,testSidePark,testPage,testZ,drawCommands),/маршрут текста в скачиваемом файле отличается/,'G-code preflight rejects a file whose exported text route differs from the validated route array');
throws(()=>context.validateGeneratedGcode(validGcode.replace('M400 U1','M400 U0'),130,testPause,testSidePark,testPage,testZ,drawCommands),/ручная пауза/,'G-code preflight rejects a missing manual pause');
throws(()=>context.validateGeneratedGcode(validGcode.replace('M400 S130 ; SECOND STOP','M400 P30000 ; unsupported wait\nM400 S130 ; SECOND STOP'),130,testPause,testSidePark,testPage,testZ,drawCommands),/M400 P отключена/,'G-code preflight rejects M400 P on the tested A1');
throws(()=>context.validateGeneratedGcode(validGcode.replace('M400 S130 ; SECOND STOP','M400 S130 — SECOND STOP'),130,testPause,testSidePark,testPage,testZ,drawCommands),/не-ASCII/,'G-code preflight rejects non-ASCII characters');
throws(()=>context.validateGeneratedGcode(validGcode.replace('M73 P0 R1\n',''),130,testPause,testSidePark,testPage,testZ,drawCommands),/стартовый маркер M73/,'G-code preflight requires the original start progress marker');
throws(()=>context.validateGeneratedGcode(validGcode.replace('M73 P100 R0\n',''),130,testPause,testSidePark,testPage,testZ,drawCommands),/завершающий маркер M73/,'G-code preflight requires the original completion progress marker');
throws(()=>context.validateGeneratedGcode(validGcode.replace('G90 ; absolute positioning','G90 ; absolute positioning\nM83 ; relative extrusion mode; no E moves'),130,testPause,testSidePark,testPage,testZ,drawCommands),/M83/,'G-code preflight rejects the unnecessary extrusion mode');
throws(()=>context.validateGeneratedGcode(validGcode.replace('G1 Z50.000 F1200 ; safe height above plate','G1 Z49.000 F1200 ; safe height above plate'),130,testPause,testSidePark,testPage,testZ,drawCommands),/нарушен порядок 5\.2/,'G-code preflight rejects an unexpected second-pause height');
throws(()=>context.validateGeneratedGcode(validGcode.replace('; HEADER_BLOCK_START','; MISSING_HEADER_BLOCK_START'),130,testPause,testSidePark,testPage,testZ,drawCommands),/служебный блок Bambu/,'G-code preflight rejects a missing Bambu header marker');
throws(()=>context.validateGeneratedGcode(validGcode.replace('; CONFIG_BLOCK_START','; HEADER_BLOCK_START'),130,testPause,testSidePark,testPage,testZ,drawCommands),/служебный блок Bambu|неверный порядок блоков/,'G-code preflight rejects duplicated or misordered Bambu block markers');
throws(()=>context.validateGeneratedGcode(validGcode.replace('G0 X128.000 Y246.000 F2000 ; park/present bed\nM73 P100 R0\nM400\n; EXECUTABLE_BLOCK_END','G0 X128.000 Y246.000 F2000 ; park/present bed\nM73 P100 R0\n; EXECUTABLE_BLOCK_END'),130,testPause,testSidePark,testPage,testZ,drawCommands),/после последней команды движения|нарушена восстановленная последовательность завершения/,'G-code preflight rejects a damaged completion sequence');
let z = context.getPenZSettings();
assert(z.write === 30 && z.travel === 34 && z.safe === 50, 'Default Z=30 produces write/travel/safe levels 30/34/50');
zInput = '10';
z = context.getPenZSettings();
assert(z.write === 10 && z.travel === 14 && z.safe === 30, 'Minimum Z=10 is accepted with expected offsets');
zInput = '150';
z = context.getPenZSettings();
assert(z.write === 150 && z.travel === 154 && z.safe === 170, 'Maximum Z=150 is accepted with expected offsets');
zInput = '9.5';
throws(() => context.getPenZSettings(), /ниже 10 мм/, 'Z below 10 mm is rejected');
zInput = '150.5';
throws(() => context.getPenZSettings(), /не должна превышать 150 мм/, 'Z above 150 mm is rejected');
zInput = '';
throws(() => context.getPenZSettings(), /Укажи высоту/, 'Empty Z field is rejected');

pauseInput = '130';
assert(context.getPause2Seconds() === 130, 'Default automatic wait is 130 seconds');
pauseInput = '0';
assert(context.getPause2Seconds() === 1, 'Automatic wait is clamped to minimum 1 second');
pauseInput = '999';
assert(context.getPause2Seconds() === 600, 'Automatic wait is clamped to maximum 600 seconds');

const model = {
  pl: { pageX: 10, pageY: 10 },
  rightX: 100,
  bottomY: 100,
  routeTolerance: 0.1,
  zSettings: { write: 30, travel: 34, safe: 50 },
  profile: { rapidFeed: 2000, drawFeed: 1500 }
};
const raster = { scale: 1, offsetX: 0, offsetY: 0, w: 10 };
const route = context.gcodeForPaths([[51, 52, 53]], model, raster);
assert(route.strokes.length === 1, 'One valid sample path creates one stroke');
assert(route.commands[0] === 'G1 Z34.000 F1200', 'A stroke begins with the pen-up travel Z');
assert(route.commands[1].startsWith('G0 X11.000 Y238.000'), 'The first point converts to machine X/Y coordinates');
assert(route.commands[2] === 'G1 Z30.000 F1200', 'The pen lowers to the configured writing Z');
assert(route.commands.at(-1) === 'G1 Z34.000 F1200', 'A stroke ends by raising the pen to travel Z');

console.log(`\n${passed} unit checks passed.`);