import fs from 'node:fs';
import path from 'node:path';
const source = path.resolve('dist');
const target = path.resolve('webos');
fs.mkdirSync(target, { recursive: true });
for (const entry of fs.readdirSync(target)) {
  if (entry !== 'appinfo.json' && entry !== 'README-webos.md') {
    fs.rmSync(path.join(target, entry), { recursive: true, force: true });
  }
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name), to = path.join(dst, entry.name);
    entry.isDirectory() ? copyDir(from, to) : fs.copyFileSync(from, to);
  }
}
copyDir(source, target);
console.log('Web build copied to ./webos');
