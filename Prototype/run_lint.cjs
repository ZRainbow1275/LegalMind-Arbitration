
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const eslintPath = path.join('node_modules', '.bin', 'eslint.cmd');
const args = ['src/**/*.{ts,tsx}', '-f', 'json'];

const child = spawn(eslintPath, args, { shell: true });
const stream = fs.createWriteStream('lint_report_node.json', { encoding: 'utf8' });

child.stdout.pipe(stream);

child.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
});

child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});
