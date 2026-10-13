const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'dist');
const file = path.join(root, 'base-role.mtx');
let role = fs.readFileSync(file, 'utf8');
// The recorded History palette belongs to the author's Windows account.
// Omit that custom palette rather than exporting an invalid path for friends.
role = role.replace(/\s*<Tab\b[^>]*id="C:\\Users\\[^"\r\n]+"[^>]*>[\s\S]*?<\/Tab>/g, '');
role = role.replace(/\s*<NodeDockInfo\b[^>]*id="C:\\Users\\[^"\r\n]+"[^>]*\/>/g, '');
role = role.replace(/title="whadaheck"/, 'title="NX Shortcut Studio Base"');
if (/C:\\Users\\/i.test(role)) throw Error('Personal path remains in base role');
fs.writeFileSync(file, role);
fs.writeFileSync(path.join(root, 'role-data.js'), 'window.NX_BASE_ROLE = ' + JSON.stringify(role) + ';\n');
console.log('Shareable base role prepared without personal History palette paths.');
