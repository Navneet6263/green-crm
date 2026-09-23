import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

let count = 0;
const violations = [];
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await check(file);
    else if (/\.(tsx?|mjs)$/.test(file)) {
      count++;
      const lines = (await readFile(file, 'utf8')).trimEnd().split(/\r?\n/).length;
      if (lines > 300) violations.push(`${file}: ${lines} lines`);
    }
  }
}
for (const dir of ['app', 'src', 'scripts', 'tests']) await check(dir);
if (violations.length) { console.error(violations.join('\n')); process.exitCode = 1; }
else console.log(`${count} source/test files checked. Every file is within 300 lines.`);
