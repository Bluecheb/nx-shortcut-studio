const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(match => match[1]).filter(ref => !/^(data:|https?:|#)/.test(ref));
for (const ref of refs) {
  if (!fs.existsSync(path.join(root, ref.split(/[?#]/)[0]))) throw Error('Missing asset: ' + ref);
}
for (const name of fs.readdirSync(root).filter(name => /\.(js|json|html|mtx)$/.test(name))) {
  const text = fs.readFileSync(path.join(root, name), 'utf8');
  if (/C:\\Users\\|USRCMD_\d{2}_\d{2}_\d{4}_\d{2}_\d{2}_\d{2}_\d{9}/i.test(text)) {
    throw Error('Personal data remains: ' + name);
  }
}
console.log('PASS: all local assets exist and public files exclude personal paths and button ID.');
