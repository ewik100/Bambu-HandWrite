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
const zFunctionMatch = html.match(/function getPenZSettings\(\)\{[\s\S]*?\n\}/);
const pauseFunctionMatch = html.match(/function getPause2Seconds\(\)\{[\s\S]*?\n\}/);
const routeFunctionMatch = html.match(/function gcodeForPaths\(paths,model,raster\)\{[\s\S]*?\n\}/);
if (!limitsMatch || !zFunctionMatch || !pauseFunctionMatch || !routeFunctionMatch) {
  throw new Error('Could not extract one or more safety-critical functions from index.html.');
}

let zInput = '30';
let pauseInput = '130';
const context = {
  $: (id) => ({ value: id === 'penWriteZ' ? zInput : pauseInput }),
  Number, String, Error, Math,
  orderPathsByComponent: (paths) => paths,
  simplify: (points) => points,
  getPenZSettingsForPreview: () => ({ write: 30, travel: 34, safe: 50 })
};
vm.createContext(context);
vm.runInContext(`${limitsMatch[0]}\n${zFunctionMatch[0]}\n${pauseFunctionMatch[0]}\n${routeFunctionMatch[0]}`, context);

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