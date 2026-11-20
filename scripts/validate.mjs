import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const checks = [];
const ok = (message) => checks.push(`PASS ${message}`);
const fail = (message) => errors.push(message);

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

const html = read('index.html');
if (html) {
  if (!/^<!doctype html>/i.test(html.trimStart())) fail('index.html must start with an HTML5 doctype.');
  else ok('HTML5 doctype exists');

  if (!/<html\b[^>]*lang="ru"/i.test(html)) fail('The document language must be explicitly set to Russian (lang="ru").');
  else ok('Russian document language is set');

  for (const marker of ['Bambu HandWrite 5.26.0', 'function schoolFeatureSettings(', 'async function rasterOriginalFontText(', "if(model.hand==='school'&&model.mode!=='print')return rasterOriginalFontText(model,token)", 'Контекстные формы кириллицы', './fonts/BambuHandWriteSchool-Regular.woff2', 'function splitCaseSegments(text)', 'function uppercaseVerticalScale(context,runs,fontPx,lowercaseAscent)', 'function build(skipFitSuggestion=false,heightOverride=null,justifyScale=1,justifyPass=0)', "findLargestFittingTenth(original,value=>!clipsText(build(true,value)))", 'function withCanvasLineTransform(cx,x,y,width,heightScale,draw)', 'withCanvasLineTransform(cx,line.x*scale,baseline,width,sy,()=>{', 'id="pitchUnit"', 'id="pitchCells"', 'id="pitchMm"', 'function getLinePitchMm(cell)', 'getLinePitchCells()*cell', "function getPaperWritingBounds(width,type,red,cell,flip='right',leftInset=10)", "indent=isRussian&&paperFlip!=='left'?paraIndent:0", 'id="paperFlip"', 'id="paperRotation"', "function getPaperPhysicalSize(w,h,rotation='none')", "function pageToPhysicalPoint(x,y,w,h,rotation='none')", "function physicalToPagePoint(x,y,w,h,rotation='none')", 'function mergeTouchingPaths(paths)', 'physicalW:physicalSize.width', 'page={x,y,w:m.physicalW,h:m.physicalH}', 'function validateTextRouteCommands(commands,zSettings)']) {
    if (!html.includes(marker)) fail(`Missing required 4.8 line-spacing feature: ${marker}`);
  }
  if (!errors.length) ok('Version 5.26.0, Bambu HandWrite School with contextual Cyrillic variants and connected plotter strokes, and existing page-layout features are present');
  if (!['none','left-page','right-page'].every(mode => html.includes('value="'+mode+'"'))) fail('Normal, left-page and right-page placement modes must all be available.');
  else ok('Normal, left-page and right-page placement modes are available');
  if (!html.includes("rotation==='left-page'") || !html.includes("rotation==='right-page'") || !html.includes("physicalToPagePoint(physical.x,physical.y,model.w,model.h,rotation)")) fail('Rotated paper coordinates must be transformed and inverse-checked.');
  else ok('Both page rotations use reversible coordinate transforms');
  if (!html.includes('previous.slice(join,-1).reverse()')) fail('Existing skeleton-path merging must remain available.');
  else ok('Existing skeleton-path merging remains available');
  if (!html.includes('function connectSchoolWordSkeletons(') || !html.includes('const maxDistance=fontPx*.42') || !html.includes('paintLine(px,py,x,y)')) fail('Bambu HandWrite School must add bounded centerline joins between nearby Cyrillic letter endings.');
  else ok('Bambu HandWrite School adds distance-limited centerline joins for adjacent Cyrillic letters');
  if (!html.includes("const twoCellInset=type==='math-notebook'?Math.min(30,Math.max(2,2*(Number(cell)||5))):10;") || !html.includes('rightX:redLineX-twoCellInset')) fail('Both red-line sides must keep a two-cell writing clearance.');
  else ok('Either binding-side red line keeps a two-cell clearance (10 mm for standard 5 mm grid)');
  if (!html.includes("function getBindingSideRedLine(rotation)") || !html.includes("rotation==='left-page'?'right':rotation==='right-page'?'left':null")) fail('Each sideways notebook leaf must automatically select its binding-side red line.');
  else ok('Left and right leaves automatically select the correct binding-side red line');
  if (!html.includes('flip.disabled=!!requiredSide') || !html.includes('строка пишется снизу вверх') || !html.includes('нижняя строка справа налево') || !html.includes('нижнем левом углу у крестика')) fail('Sideways paper UI must lock the matched margin and show both marked start corners and writing directions.');
  else ok('Both sideways layouts show the red margin at the top and explain the correct start points/directions');
  if (!html.includes("const rightLeaf=model.rotation==='right-page'") || !html.includes('const reverseRead=rightLeaf,reverseRows=rightLeaf') || !html.includes('targetX=reverseRead?raster.w-1:0,targetY=reverseRows?raster.h-1:0')) fail('Right leaf must start from the bottom-right text component and traverse rows bottom-to-top, mapping its start to the bottom-left plate mark.');
  else ok('Right leaf route order starts at bottom-left plate mark and proceeds through bottom-up rows');

  const handStart=html.indexOf('<select id="handFont">');
  const handEnd=html.indexOf('</select>',handStart);
  const modeStart=html.indexOf('<select id="scriptMode">');
  const modeEnd=html.indexOf('</select>',modeStart);
  const handSelect=handStart>=0&&handEnd>handStart?html.slice(handStart,handEnd):'';
  const modeSelect=modeStart>=0&&modeEnd>modeStart?html.slice(modeStart,modeEnd):'';
  const expectedFonts=['school','frb','marck','neucha','badscript','pangolin','great','recommended'];
  const actualFonts=[...handSelect.matchAll(/<option\s+value="([^"]+)"/g)].map(match=>match[1]);
  if (JSON.stringify(actualFonts)!==JSON.stringify(expectedFonts)) fail('All nine handwriting profiles must remain available.');
  else ok('All nine handwriting profiles are available');
  if ((modeSelect.split('<option').length-1)!==5 || !['auto','ru','en','universal','print'].every(mode=>modeSelect.includes('value="'+mode+'"'))) fail('All five language/script modes must remain available.');
  else ok('All five language/script modes are available');
  for (const marker of ["function schoolVariation(){return $('letterVariety')?.checked===false?0:34}", "schoolPreview=hand==='school'&&mode!=='print'", 'async function loadBambuOriginalFont()', 'function renderSchoolStrokePreview(', 'Неровность самих штрихов', 'Не удалось загрузить выбранный шрифт', "drawFeed:1450,rapidFeed:1900", 'routeTolerance:.07', 'maxScale=mobile?7:22', 'feDisplacementMap']) {
    if (!html.includes(marker)) fail(`Missing handwriting feature: ${marker}`);
  }
  if (!errors.length) ok('Eight handwriting profiles, original Bambu typeface OpenType variations, centerline preview, and route generation guard are present');

  if (!html.includes("$('layoutStatus').className='status ok'") ||
      !html.includes("$('bedStatus').className='bed-status ok'") ||
      !html.includes("$('gcodeStatus').className='status gcode-ready'")) {
    fail('Successful geometry and G-code status indicators must be green independently of letter-quality warnings.');
  } else ok('Successful geometry and G-code statuses use green indicators');

  if (html.includes('Визуальная идеальность букв автоматически не гарантируется') ||
      html.includes('Это не доказывает, что каждая буква визуально идеальна')) {
    fail('The removed visual-ideality disclaimer must not appear in the active UI.');
  } else ok('Outdated visual-ideality disclaimer is absent');

  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  if (scripts.length !== 1) fail(`Expected one inline application script; found ${scripts.length}.`);
  else {
    try {
      new vm.Script(scripts[0][1], { filename: 'index.html:inline-script' });
      ok('Inline JavaScript syntax is valid');
    } catch (error) {
      fail(`Inline JavaScript syntax error: ${error.message}`);
    }
  }

  const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const seen = new Set();
  const duplicates = new Set();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  if (duplicates.size) fail(`Duplicate HTML id values: ${[...duplicates].join(', ')}`);
  else ok(`All ${ids.length} HTML id values are unique`);

  const references = [...html.matchAll(/\$\(['"]([A-Za-z][\w-]*)['"]\)/g)].map((m) => m[1]);
  const missingReferences = [...new Set(references.filter((id) => !seen.has(id)))];
  if (missingReferences.length) fail(`Static DOM references without a matching id: ${missingReferences.join(', ')}`);
  else ok('Static DOM id lookups have matching elements');

  for (const required of [
    'function validateGeneratedGcode(file,pauseSeconds,park,placementPark,page,zSettings,expectedDraw)',
    'validateTextRouteCommands(expectedDraw,zSettings)',
    'маршрут текста в скачиваемом файле отличается от проверенных траекторий',
    'validateGeneratedGcode(file,pauseSeconds,park,placementPark,page,zSettings,draw);',
    'validateGeneratedGcode(exportedText,pauseSeconds,park,placementPark,page,zSettings,draw);',
    'function getPagePlacementParkPosition(pageX,pageMachineY,pageWidth,pageHeight,tab)',
    'function getPenZSettings()',
    'const Z_LIMITS={min:10,max:150,travelOffset:4,safeOffset:20}',
    'M73 P0 R1',
    'M73 P100 R0',
    'M400 U1',
    'M400 S50 ; 50-second placement window',
    'outline start on protective A4',
    'SECOND STOP: nozzle is directly above the upper-left paper corner',
    'G28 ; home all axes',
    'G21 ; metric units',
    'G90 ; absolute positioning'
  ]) {
    if (!html.includes(required)) fail(`Missing expected safety/G-code marker: ${required}`);
  }
  if (!html.includes('M73 P0 R1') || !html.includes('M73 P100 R0')) fail('The raw G-code must retain both original Bambu progress markers.');
  else ok('Raw G-code retains the original M73 start and completion markers');
  if (!html.includes('должно быть ровно одно 50-секундное окно') || !html.includes('не-ASCII символы') || !html.includes('контур на защитном A4') || !html.includes('первым движением должен быть подъём пера') || !html.includes('после 50-секундного окна нет рисующих движений текста')) {
    fail('Generated G-code preflight must validate the contour, two timed waits and ASCII-only output.');
  } else ok('G-code preflight checks the protective-paper outline, both timed waits and ASCII output');
  const headStart = html.indexOf('const head=[');
  const headEnd = html.indexOf('];', headStart);
  const generatedHead = headStart >= 0 && headEnd > headStart ? html.slice(headStart, headEnd) : '';
  if (!generatedHead.includes('raw G-code for Bambu Lab A1')) fail('The generator must identify its output as raw A1 G-code.');
  if (!['HEADER_BLOCK_START','HEADER_BLOCK_END','CONFIG_BLOCK_START','CONFIG_BLOCK_END','EXECUTABLE_BLOCK_START','EXECUTABLE_BLOCK_END','print_compatible_printers = "Bambu Lab A1 0.4 nozzle"','printable_area = 0x0,256x0,256x256,0x256'].every(marker => generatedHead.includes(marker))) {
    fail('Generated G-code must preserve the proven Bambu A1 HEADER/CONFIG/EXECUTABLE block structure and machine profile.');
  } else ok('Generated output preserves the Bambu A1 container blocks and printer profile from the working 5.0.0 baseline');
  if (!html.includes('M400 P отключена') || !html.includes('M400 S50 ; 50-second placement window') || !html.includes('getJustifyCorrectionScale') || !html.includes('blob.arrayBuffer()') || !html.includes('M73 P0 R1') || !html.includes('M73 P100 R0') || html.includes('M83 ; relative extrusion mode; no E moves')) fail('A1-specific validation must retain M73 markers, omit unused M83 and require the 50-second placement wait.');
  else ok('A1-specific validation retains M73, omits unused M83, keeps M400 S and rejects M400 P');
  if (!errors.length) ok('Z limits, pause commands, homing and motion mode markers are present');

  if (!html.includes('не гарантия реального зазора') && !html.includes('не гарантия зазора')) {
    fail('The UI must warn that nozzle Z is not the physical pen-tip clearance.');
  } else ok('UI explains that nozzle Z is not pen-tip clearance');

  const externalScriptRefs = [...html.matchAll(/<script\b[^>]*\bsrc\s*=/gi)];
  if (externalScriptRefs.length) fail('The standalone app should not require external JavaScript files.');
  else ok('No external JavaScript bundles are required');
}

for (const required of [
  'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md',
  'docs/USER_GUIDE_RU.md', 'docs/USER_GUIDE_EN.md', 'docs/INSTALLATION.md', 'docs/GCODE_BASELINE_5.4.2.md',
  'docs/SAFETY.md', 'docs/COMPATIBILITY.md', 'docs/TEST_REPORT.md', 'releases/Bambu-HandWrite-4.8.1.html', 'releases/Bambu-HandWrite-5.0.0.html', 'releases/Bambu-HandWrite-5.2.0.html', 'releases/Bambu-HandWrite-5.3.0.html', 'releases/Bambu-HandWrite-5.4.2.html', 'releases/Bambu-HandWrite-5.4.3.html', 'releases/Bambu-HandWrite-5.4.4.html', 'releases/Bambu-HandWrite-5.5.0.html', 'releases/Bambu-HandWrite-5.6.6.html',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/printer_support.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/workflows/validate.yml'
]) {
  const content = read(required);
  if (content) ok(`Required project file exists: ${required}`);
}

const readme = read('README.md');
if (readme && /MIT License|Apache License|GPL-\d/i.test(readme)) {
  fail('README appears to announce a license, but the owner has not selected one.');
} else if (readme) ok('README does not assign an unapproved license');

if (errors.length) {
  console.error(`\n${errors.length} validation error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  console.error(`\n${checks.length} check(s) passed.`);
  process.exitCode = 1;
} else {
  console.log(`Bambu HandWrite static validation: ${checks.length} checks passed.`);
  for (const message of checks) console.log(message);
}