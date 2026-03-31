const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');
const shaArg = process.argv[process.argv.length - 1];

if (!shaArg) {
  console.error('Expected commit SHA as the last argument, but none was provided.');
  process.exit(1);
}

const suffix = shaArg.slice(0, 7);
packageJson.version += `-beta.${suffix}`;

console.log(packageJson.version);

fs.writeFileSync(
  path.join(path.resolve('.'), 'package.json'),
  JSON.stringify(packageJson, null, 2)
);
