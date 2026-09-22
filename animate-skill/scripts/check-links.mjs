// Check that every relative markdown link and backticked path in SKILL.md and references resolves.
// Usage: node scripts/check-links.mjs   (run from anywhere)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['SKILL.md', ...fs.readdirSync(path.join(root, 'references')).filter((f) => f.endsWith('.md')).map((f) => 'references/' + f)];
let bad = 0;
for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const base = path.dirname(path.join(root, file));
  for (const [, link] of text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
    if (/^(https?:|mailto:|\/)/.test(link)) { if (link.startsWith('/') && !fs.existsSync(link)) { console.log(`MISSING ${file}: ${link}`); bad += 1; } continue; }
    if (!fs.existsSync(path.resolve(base, link))) { console.log(`MISSING ${file}: ${link}`); bad += 1; }
  }
}
for (const required of ['scripts/scaffold-tutorial.mjs', 'scripts/build-tutorial.mjs', 'scripts/restyle-colors.mjs', 'references/tutorial-16x9.md', 'references/restyle.md', 'templates/tutorial-16x9/template.html']) {
  if (!fs.existsSync(path.join(root, required))) { console.log(`MISSING required file: ${required}`); bad += 1; }
}
console.log(bad ? `${bad} problem(s)` : 'All links resolve.');
process.exit(bad ? 1 : 0);
