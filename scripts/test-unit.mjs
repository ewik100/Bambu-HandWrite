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
const routeGuardMatch = html.match(/function validateTextRouteCommands\(commands,zSettings\)\{[\s\S]*?\n\}/);
const writingBoundsMatch = html.match(/function getPaperWritingBounds\(width,type,red,cell,flip='right',leftInset=10\)\{[\s\S]*?\n\}/);
const preflightMatch = html.match(/function validateGeneratedGcode\(file,pauseSeconds,park,placementPark,page,zSettings,expectedDraw\)\{[\s\S]*?\n\}/);
const routeFunctionMatch = html.match(/function gcodeForPaths\(paths,model,raster\)\{[\s\S]*?\n\}/);
const pageSizeMatch = html.match(/function getPaperPhysicalSize\(w,h,rotation='none'\)\{[\s\S]*?\n\}/);
const pageToPhysicalMatch = html.match(/function pageToPhysicalPoint\(x,y,w,h,rotation='none'\)\{[\s\S]*?\n\}/);
const physicalToPageMatch = html.match(/function physicalToPagePoint\(x,y,w,h,rotation='none'\)\{[\s\S]*?\n\}/);
const mergePathsMatch = html.match(/function mergeTouchingPaths\(paths\)\{[\s\S]*?\n\}/);
const bindingSideMatch = html.match(/function getBindingSideRedLine\(rotation\)\{[^}]+\}/);
const neighborsMatch = html.match(/function neighbors\(bin,w,h,i\)\{[\s\S]*?\n\}/);
const labelComponentsMatch = html.match(/function labelComponents\(bin,w,h\)\{[\s\S]*?\n\}/);
const orderPathsMatch = html.match(/function orderPathsByComponent\(paths,raster,model\)\{[\s\S]*?\n\}/);
if (!limitsMatch || !pitchCellsMatch || !pitchMmMatch || !zFunctionMatch || !pauseFunctionMatch || !topMarginMatch || !lowercaseScaleMatch || !cornerPauseMatch || !pagePlacementMatch || !fitSearchMatch || !justifyCorrectionMatch || !lineTransformMatch || !routeGuardMatch || !writingBoundsMatch || !preflightMatch || !routeFunctionMatch || !pageSizeMatch || !pageToPhysicalMatch || !physicalToPageMatch || !mergePathsMatch || !bindingSideMatch || !neighborsMatch || !labelComponentsMatch || !orderPathsMatch) {
  throw new Error('Could not extract one or more safety-critical functions from index.html.');
}

let zInput = '30';
let pauseInput = '130';
let variationStrengthInput = '100';
let pitchCellsInput = '2';
let pitchUnitInput = 'cells';
let pitchMmInput = '15';
const context = {
  $: (id) => ({ value: id === 'penWriteZ' ? zInput : id === 'pitchCells' ? pitchCellsInput : id === 'pitchUnit' ? pitchUnitInput : id === 'pitchMm' ? pitchMmInput : id === 'schoolRoughness' ? '28' : id === 'schoolVariationStrength' ? variationStrengthInput : pauseInput, checked: true }),
  Number, String, Error, Math,
  orderPathsByComponent: (paths) => paths,
  simplify: (points) => points,
  getPenZSettingsForPreview: () => ({ write: 30, travel: 34, safe: 50 })
};
vm.createContext(context);
vm.runInContext([
  limitsMatch[0], pitchCellsMatch[0], pitchMmMatch[0], zFunctionMatch[0],
  pauseFunctionMatch[0], topMarginMatch[0], lowercaseScaleMatch[0],
  cornerPauseMatch[0], pagePlacementMatch[0], fitSearchMatch[0],
  justifyCorrectionMatch[0], lineTransformMatch[0], routeGuardMatch[0],
  writingBoundsMatch[0], preflightMatch[0], pageSizeMatch[0],
  pageToPhysicalMatch[0], physicalToPageMatch[0], mergePathsMatch[0],
  bindingSideMatch[0], neighborsMatch[0], labelComponentsMatch[0],
  orderPathsMatch[0], routeFunctionMatch[0]
].join('\n'), context);
const actualOrderPathsByComponent=context.orderPathsByComponent;
context.orderPathsByComponent=(paths)=>paths;
const schoolStart=html.indexOf('function schoolVariation()');
const schoolEnd=html.indexOf("const measureCanvas=document.createElement('canvas')",schoolStart);
if(schoolStart<0||schoolEnd<=schoolStart)throw new Error('Could not extract Bambu handwriting helpers.');
const schoolFunctions=html.slice(schoolStart,schoolEnd);
vm.runInContext(schoolFunctions,context);
const schoolApi=vm.runInContext('({variation:schoolVariation,roughness:schoolRoughness,features:schoolFeatureSettings,glyphFeatures:schoolGlyphFeatureSettings,glyphMetrics:schoolGlyphMetrics,wordMetrics:schoolWordMetrics,noise:schoolNoise,layout:schoolWordLayout})',context);
assert(schoolApi.variation()===0,'Contextual alternates do not alter line wrapping or reserve extra width');
const baseFeatures=schoolApi.features(0,false);
const contextualFeatures=schoolApi.features(0,true,true);
assert(baseFeatures.includes('"calt" 0')&&baseFeatures.includes('"liga" 1'),'Base writing keeps contextual substitutions off while preserving standard ligatures');
assert(contextualFeatures.includes('"calt" 1')&&contextualFeatures.includes('"liga" 1'),'Contextual writing enables the font-authored OpenType substitutions');
assert(!contextualFeatures.includes('"ss01" 1')&&!contextualFeatures.includes('"ss02" 1'),'The app does not claim unverified stylistic sets ss01/ss02');
assert(schoolApi.glyphFeatures(' ','unit-seed',0,true).includes('"calt" 0'),'Spaces never receive contextual letter substitutions');
variationStrengthInput='0';
const noVariation=schoolApi.wordMetrics(mockGlyphMeasure(),'мама','slider-zero',true);
assert(!noVariation.active&&noVariation.features.includes('"calt" 0'),'Variation slider at 0% uses the unmodified base word');
variationStrengthInput='100';
const fullVariation=schoolApi.wordMetrics(mockGlyphMeasure(),'мама','slider-full',true);
assert(fullVariation.active&&fullVariation.features.includes('"calt" 1'),'Variation slider at 100% enables contextual shaping for the complete word');
variationStrengthInput='50';
const partialVariation=Array.from({length:30},(_,i)=>schoolApi.wordMetrics(mockGlyphMeasure(),'мама','slider-half-'+i,true));
assert(partialVariation.some(x=>x.active)&&partialVariation.some(x=>!x.active),'Variation slider at 50% deterministically selects a subset of complete words');
variationStrengthInput='100';
function mockGlyphMeasure(){return {fontKerning:'normal',fontVariantLigatures:'normal',fontFeatureSettings:'normal',measureText:(value)=>({width:Array.from(value).length*8})};}
const mockMetrics={measureText:(value)=>({width:Array.from(value).length*8})};
const baseLayout=schoolApi.layout(mockMetrics,'тетрадь',12,30,20,28,-.05,'test-seed','school');
const sameLayout=schoolApi.layout(mockMetrics,'тетрадь',12,30,20,28,-.05,'test-seed','school');
assert(baseLayout.endX===sameLayout.endX&&baseLayout.features===sameLayout.features,'Contextual shaping preserves word width and uses a stable OpenType feature set');
assert(html.includes("esc(layout.features||schoolFeatureSettings(0,variantsOn))"),'SVG preview uses the exact per-word OpenType feature choice used by the G-code rasterizer');
const measureMixedMatch=html.match(/function measureMixed\(t,mode,hand,size\)\{[\s\S]*?\n\}/);
if(!measureMixedMatch)throw new Error('Could not extract mixed-font width calculation.');
context.FONT_PROFILES={school:{widthScale:1,letterSpacing:-.01,wordSpacing:.54}};
context.runsFor=(text)=>[{text,font:'Bambu HandWrite Original'}];
context.fontCss=()=>'"Bambu HandWrite Original"';
context.CANVAS_SPACING={letter:true,word:true};
context.mctx={
 font:'',fontFeatureSettings:'normal',fontKerning:'normal',fontVariantLigatures:'normal',letterSpacing:'0px',wordSpacing:'0px',
 measureText(value){
  const chars=Array.from(value),alt=(this.fontFeatureSettings||'').includes('"calt" 1');
  return {width:chars.reduce((n,ch)=>n+(ch===' '?8:8+(alt?1.1:0)),0)};
 }
};
vm.runInContext(measureMixedMatch[0],context);
const measuredMixed=context.measureMixed('мама рама','ru','school',40);
let expectedMixed=0,wordIndex=0;
for(const part of 'мама рама'.split(/(\s+)/u)){
 if(!part)continue;
 if(/^\s+$/u.test(part)){
  context.mctx.fontFeatureSettings=context.schoolFeatureString('');
  for(const ch of Array.from(part))expectedMixed+=context.mctx.measureText(ch).width-.01+.54;
 }else{
  expectedMixed+=schoolApi.wordMetrics(context.mctx,part,'word:'+wordIndex+':'+part,true).width-.01*(Array.from(part).length-1);
  wordIndex++;
 }
}
assert(Math.abs(measuredMixed-expectedMixed)<1e-8,'Line wrapping uses whole-word contextual shaping, matching the SVG/G-code raster');

assert(schoolApi.roughness()===28,'Stroke roughness uses the dedicated UI slider value');
assert(html.includes(`content+='<tspan x="'+(x+pen).toFixed(3)+'"'+filter+`),'The roughness filter is attached to each rendered word');
assert(html.includes('baseFrequency=".018 .009" numOctaves="1"'),'Stroke deformation uses broad, smooth, low-frequency noise');
const originalFont=fs.readFileSync(path.join(root,'fonts','BambuHandWriteSchool-Regular.woff2'));
assert(originalFont.length>6000,'Original Bambu font WOFF2 asset is present and non-empty');
assert(originalFont.subarray(0,4).toString('ascii')==='wOF2','Original Bambu font has a valid WOFF2 signature');
assert(html.includes('function connectSchoolWordSkeletons('),'The custom school font has a dedicated centerline connector');
const connectorStart=html.indexOf('function connectSchoolWordSkeletons(');
const connectorEnd=html.indexOf('async function rasterOriginalFontText(',connectorStart);
if(connectorStart<0||connectorEnd<=connectorStart)throw new Error('Could not extract school centerline connector.');
vm.runInContext(html.slice(connectorStart,connectorEnd),context);
const mockMeasure={letterSpacing:'0px',wordSpacing:'0px',fontFeatureSettings:'normal',fontVariantLigatures:'common-ligatures contextual',fontKerning:'normal',measureText:(value)=>({width:Array.from(value).length*8})};
const mockMask=new Uint8Array(30*24);
for(let x=2;x<=9;x++)mockMask[15*30+x]=1;
for(let x=11;x<=19;x++)mockMask[15*30+x]=1;
const mockModel={fontSize:10,baseline0:15,pitch:8,profile:{letterSpacing:0,wordSpacing:0},lines:[{blank:false,text:'аа',x:2,extraWordSpace:0}]};
const joinedCount=context.connectSchoolWordSkeletons(mockMask,30,24,mockModel,{scale:1,fontPx:10,heightScale:1,widthScale:1,originX:0,originY:0,cropX:0,cropY:0},mockMeasure);
assert(joinedCount===1&&mockMask.slice(15*30+9,15*30+12).every(Boolean),'Adjacent Russian letter centerlines receive one bounded connecting stroke');
const longGapMask=new Uint8Array(36*24);
for(let x=2;x<=9;x++)longGapMask[15*36+x]=1;
for(let x=16;x<=24;x++)longGapMask[15*36+x]=1;
const longGapCount=context.connectSchoolWordSkeletons(longGapMask,36,24,{...mockModel,lines:[{blank:false,text:'аа',x:2,extraWordSpace:0}]},{scale:1,fontPx:10,heightScale:1,widthScale:1,originX:0,originY:0,cropX:0,cropY:0},{...mockMeasure,measureText:(value)=>({width:Array.from(value).length*8})});
assert(longGapCount===0,'Long gaps between letters remain separate instead of receiving artificial swooping bridges');

assert(html.includes('async function loadBambuOriginalFont()')&&html.includes('./fonts/BambuHandWriteSchool-Regular.woff2'),'Bambu HandWrite School is loaded from the bundled local asset');
assert(html.includes('async function rasterOriginalFontText(')&&html.includes('function renderSchoolStrokePreview('),'The original custom font is used by the shared preview and G-code centerline rasterizer');
assert(html.includes('traceSkeleton(raster.bin,raster.w,raster.h)')&&html.includes('mergeTouchingPaths(simplified)'),'Preview paths are generated from the thinned centerline skeleton, not the filled font outline');
assert(html.includes('feDisplacementMap')&&html.includes('id="schoolRoughness"'),'Natural irregularity is applied to the stroke shape itself with an explicit control');


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
assert(normalPage.startX===10&&normalPage.rightX===135&&normalPage.redLineX===145,'Right red-line side keeps 10 mm clearance from the red line');
const flippedGrid=context.getPaperWritingBounds(165,'math-notebook',20,5,'left',10);
assert(flippedGrid.startX===30&&flippedGrid.rightX===155&&flippedGrid.redLineX===20,'Flipped grid page starts two 5 mm cells after the left red line and leaves 10 mm at the far edge');
const flippedRuled=context.getPaperWritingBounds(165,'russian-notebook',20,8.35,'left',10);
assert(flippedRuled.startX===30&&flippedRuled.rightX===155,'Flipped ruled paper uses a 10 mm start offset and 10 mm far-edge margin');
const flippedPlain=context.getPaperWritingBounds(210,'a4-plain',20,8.35,'left',10);
assert(flippedPlain.guideOnly&&flippedPlain.startX===20&&flippedPlain.rightX===200,'Flipped plain A4 has a preview-only guide, 10 mm start offset and 10 mm end margin');
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
const routeCheck=context.validateTextRouteCommands(drawCommands,testZ);
assert(routeCheck.strokes===1&&routeCheck.segments===1,'Route guard accepts one complete pen-up/travel/write/XY/lift stroke');
throws(()=>context.validateTextRouteCommands(drawCommands.slice(0,4),testZ),/последний штрих не завершён/,'Route guard rejects a stroke that never raises the pen at the end');
throws(()=>context.validateTextRouteCommands(['G1 Z34.000 F1200','G0 X55.000 Y240.000 F1800','G1 X60.000 Y240.000 F1500','G1 Z34.000 F1200'],testZ),/вне режима письма/,'Route guard rejects XY drawing while the pen is not down');
throws(()=>context.validateTextRouteCommands(['G1 Z34.000 F1200','G1 Z30.000 F1200'],testZ),/без предварительного подвода/,'Route guard rejects lowering the pen without a preceding XY approach');
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

const normalSize=context.getPaperPhysicalSize(165,203,'none');
const leftSize=context.getPaperPhysicalSize(165,203,'left-page');
const rightSize=context.getPaperPhysicalSize(165,203,'right-page');
assert(normalSize.width===165&&normalSize.height===203,'Normal notebook page keeps 165 × 203 mm physical size');
assert(leftSize.width===203&&leftSize.height===165,'Sideways left notebook page occupies 203 × 165 mm');
assert(rightSize.width===203&&rightSize.height===165,'Sideways right notebook page occupies 203 × 165 mm');
const leftTop=context.pageToPhysicalPoint(165,0,165,203,'left-page');
const rightTop=context.pageToPhysicalPoint(0,0,165,203,'right-page');
assert(leftTop.x===0&&leftTop.y===0,'Left leaf right edge maps to the top-left physical corner');
assert(rightTop.x===203&&rightTop.y===0,'Right leaf left edge maps to the top-left physical corner');
assert(context.getBindingSideRedLine('left-page')==='right','Left notebook leaf selects its original right red line, which becomes the top edge');
assert(context.getBindingSideRedLine('right-page')==='left','Right notebook leaf selects its original left red line, which becomes the top edge');
const leftRedEnd=context.pageToPhysicalPoint(165,203,165,203,'left-page');
const rightRedEnd=context.pageToPhysicalPoint(0,203,165,203,'right-page');
assert(leftTop.x===0&&leftTop.y===0&&leftRedEnd.x===203&&leftRedEnd.y===0,'Left-leaf red line maps horizontally across the physical top edge');
assert(rightTop.x===203&&rightTop.y===0&&rightRedEnd.x===0&&rightRedEnd.y===0,'Right-leaf red line maps horizontally across the physical top edge');
const leftWritingStart=context.pageToPhysicalPoint(10,20,165,203,'left-page');
const leftWritingNext=context.pageToPhysicalPoint(140,20,165,203,'left-page');
const rightWritingStart=context.pageToPhysicalPoint(30,20,165,203,'right-page');
const rightWritingNext=context.pageToPhysicalPoint(140,20,165,203,'right-page');
assert(leftWritingStart.x===20&&leftWritingStart.y===155&&leftWritingNext.y===25,'Left-leaf writing starts at bottom-left and advances upward from the marked corner');
assert(rightWritingStart.x===183&&rightWritingStart.y===30&&rightWritingNext.y===140,'Right-leaf writing starts at top-right and advances downward from the marked corner');
const routeRaster={w:30,h:20,scale:1,offsetX:134,offsetY:180,bin:new Uint8Array(600)};
for(const [x,y] of [[2,2],[21,2],[2,15],[21,15]]){routeRaster.bin[y*30+x]=1;routeRaster.bin[y*30+x+1]=1}
const pathsInReverseInputOrder=[
 [15*30+21,15*30+22],
 [2*30+22,2*30+21],
 [15*30+3,15*30+2],
 [2*30+3,2*30+2]
];
const orderModel={baseline0:182,lh:1,pitch:13};
const leftOrdered=actualOrderPathsByComponent(pathsInReverseInputOrder,routeRaster,{...orderModel,rotation:'left-page'});
const rightOrdered=actualOrderPathsByComponent(pathsInReverseInputOrder,routeRaster,{...orderModel,rotation:'right-page'});
assert(leftOrdered[0][0]===2*30+2&&leftOrdered[1][0]===2*30+21&&leftOrdered[2][0]===15*30+2&&leftOrdered[3][0]===15*30+21,'Left leaf writes rows top-to-bottom and letters left-to-right');
assert(rightOrdered[0][0]===15*30+22&&rightOrdered[1][0]===15*30+3&&rightOrdered[2][0]===2*30+22&&rightOrdered[3][0]===2*30+3,'Right leaf starts at bottom-right of the page, writes each row right-to-left, and moves to rows above');
const rightStartOnPlate=context.pageToPhysicalPoint(routeRaster.offsetX+(rightOrdered[0][0]%routeRaster.w),routeRaster.offsetY+Math.floor(rightOrdered[0][0]/routeRaster.w),165,203,'right-page');
assert(rightStartOnPlate.x<10&&rightStartOnPlate.y>150,'Right-leaf first writing point maps to the bottom-left start mark on the plate');
assert(pathsInReverseInputOrder[0][0]!==rightOrdered[0][0],'Right-leaf sorting is independent of incoming skeleton order');

const leftRound=context.physicalToPagePoint(leftTop.x,leftTop.y,165,203,'left-page');
const rightRound=context.physicalToPagePoint(rightTop.x,rightTop.y,165,203,'right-page');
assert(leftRound.x===165&&leftRound.y===0,'Left-page rotation inverse restores original page coordinates');
assert(rightRound.x===0&&rightRound.y===0,'Right-page rotation inverse restores original page coordinates');
const joined=context.mergeTouchingPaths([
 [{x:0,y:0},{x:1,y:0},{x:2,y:0}],
 [{x:3,y:0},{x:2,y:0}],
 [{x:2,y:0},{x:2,y:1}]
]);
assert(joined.length===1&&joined[0].length===6,'Touching skeleton paths merge, including a branch at an existing junction');
assert(joined[0][0].x===0&&joined[0][joined[0].length-1].y===1,'Merged path follows original skeleton points only');
const separate=context.mergeTouchingPaths([
 [{x:0,y:0},{x:1,y:0}],
 [{x:5,y:5},{x:6,y:5}]
]);
assert(separate.length===2,'Disconnected dots and glyph strokes remain separate and can lift the pen');

const model = {
  w:100,h:100,rotation:'none',
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
const leftModel={...model,rotation:'left-page'};
const rightModel={...model,rotation:'right-page'};
const leftRoute=context.gcodeForPaths([[51,52,53]],leftModel,raster);
const rightRoute=context.gcodeForPaths([[51,52,53]],rightModel,raster);
assert(leftRoute.commands[1].startsWith('G0 X15.000 Y144.000'),'Left-page route is rotated onto the sideways plate footprint');
assert(rightRoute.commands[1].startsWith('G0 X105.000 Y242.000'),'Right-page route is rotated in the opposite direction');
const connectedRoute=context.gcodeForPaths([[51,52,53],[54,53]],model,raster);
assert(connectedRoute.strokes.length===1,'G-code emits one continuous stroke when two skeleton branches share a real endpoint');
assert(connectedRoute.commands.filter(line=>line==='G1 Z34.000 F1200').length===2,'Connected branches require only one pen-up at the end, not a lift between branches');

console.log(`\n${passed} unit checks passed.`);