
const fs = require('fs');
const fd = fs.openSync('lint_report.json', 'r');
const size = fs.statSync('lint_report.json').size;
const buffer = Buffer.alloc(100);
fs.readSync(fd, buffer, 0, 100, Math.max(0, size - 100));
console.log(buffer.toString());
fs.closeSync(fd);
