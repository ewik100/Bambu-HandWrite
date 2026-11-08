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

  for (const marker of ['Bambu HandWrite 4.8.1', 'function splitCaseSegments(text)', 'function uppercaseVerticalScale(context,runs,fontPx,lowercaseAscent)', 'function build(skipFitSuggestion=false,heightOverride=null)', "findLargestFittingTenth(original,value=>!clipsText(build(true,value)))", 'function withCanvasLineTransform(cx,x,y,width,heightScale,draw)', 'withCanvasLineTransform(cx,line.x*scale,baseline,width,sy,()=>{', 'id="pitchUnit"', 'id="pitchCells"', 'id="pitchMm"', 'function getLinePitchMm(cell)', 'getLinePitchCells()*cell']) {
    if (!html.includes(marker)) fail(`Missing required 4.8 line-spacing feature: ${marker}`);
  }
  if (!errors.length) ok('Version 4.8.1, letter-size fixes and both line-spacing modes are present');

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

  for (const required of ['function validateGeneratedGcode(file,pauseSeconds,park,zSettings)', 'validateGeneratedGcode(file,pauseSeconds,park,zSettings);', 'function getPenZSettings()', 'const Z_LIMITS={min:10,max:150,travelOffset:4,safeOffset:20}', 'M400 U1', 'M400 S${pauseSeconds}', 'G28 ; home all axes', 'G21 ; metric units', 'G90 ; absolute positioning']) {
    if (!html.includes(required)) fail(`Missing expected safety/G-code marker: ${required}`);
  }
  if (html.includes('M73 P0 R1') || html.includes('M73 P100 R0')) fail('Legacy M73 progress markers must be absent from raw G-code output.');
  else ok('Legacy M73 progress markers are absent');
  if (!html.includes('должна быть ровно одна вторая автоматическая пауза') || !html.includes('не-ASCII символы')) fail('Generated G-code preflight must validate pause sequence and ASCII-only output.');
  else ok('G-code preflight checks ASCII output and the two-pause sequence');
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
  'docs/USER_GUIDE_RU.md', 'docs/USER_GUIDE_EN.md', 'docs/INSTALLATION.md',
  'docs/SAFETY.md', 'docs/COMPATIBILITY.md', 'docs/TEST_REPORT.md', 'releases/Bambu-HandWrite-4.8.1.html',
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