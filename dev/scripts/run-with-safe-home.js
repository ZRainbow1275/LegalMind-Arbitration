const { spawnSync } = require('node:child_process');

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/run-with-safe-home.js <command> [args...]');
    process.exit(1);
  }

  const cwd = process.cwd();
  const env = {
    ...process.env,
    HOME: cwd,
    USERPROFILE: cwd,
  };

  const command = args[0];
  const commandArgs = args.slice(1);

  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    env,
    shell: true,
  });

  process.exit(typeof result.status === 'number' ? result.status : 1);
}

main();
