// Swap RoboNuggets ROBO colours for Ryan's What We Built palette in copies of elements/templates.
// Usage: node restyle-colors.mjs <file-or-folder> [--write]   (dry run unless --write)
import fs from 'node:fs';
import path from 'node:path';

const MAP = { '#f2efe8': '#D9DCDF', '#faf8f2': '#EEF0F2', '#1c1a16': '#161819', '#131311': '#161819', '#e8e2d2': '#A7ADB2', '#6f6a5c': '#6D747A', '#ff6b1a': '#E65D20' };
const TEXT = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.md', '.json', '.svg', '.py']);
const target = process.argv[2];
const write = process.argv.includes('--write');
if (!target || target === '--help') { console.log('Usage: node restyle-colors.mjs <file-or-folder> [--write]'); process.exit(target ? 0 : 1); }

function* walk(entry) {
  const stat = fs.statSync(entry);
  if (stat.isFile()) { yield entry; return; }
  for (const name of fs.readdirSync(entry)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    yield* walk(path.join(entry, name));
  }
}

let changedFiles = 0; let changes = 0;
const pattern = new RegExp(Object.keys(MAP).join('|'), 'gi');
for (const file of walk(path.resolve(target))) {
  if (!TEXT.has(path.extname(file).toLowerCase()) || fs.statSync(file).size > 3_000_000) continue;
  const before = fs.readFileSync(file, 'utf8');
  let count = 0;
  const after = before.replace(pattern, (hex) => { count += 1; return MAP[hex.toLowerCase()]; });
  if (!count) continue;
  changedFiles += 1; changes += count;
  console.log(`${write ? 'restyled' : 'would change'} ${count} colour(s) in ${file}`);
  if (write) fs.writeFileSync(file, after);
}
console.log(`${write ? 'Wrote' : 'Dry run:'} ${changes} change(s) in ${changedFiles} file(s).${write ? '' : ' Add --write to apply.'}`);
console.log('Still by hand: fonts (Inter / Pixelify Sans), hard offset shadows, background, brand marks. See references/restyle.md.');
