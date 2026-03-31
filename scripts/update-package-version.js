const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');
const suffix = process.argv[process.argv.length - 1].substr(0, 7);
packageJson.version += `-beta.${suffix}`;

console.log(packageJson.version);

fs.writeFileSync(
  path.join(path.resolve('.'), 'package.json'),
  JSON.stringify(packageJson, null, 2)
);
