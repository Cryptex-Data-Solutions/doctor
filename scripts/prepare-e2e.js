const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, `../cypress.env.json`);

const envConfig = {
  USERNAME: process.env.USERNAME,
  PASSWORD: process.env.PASSWORD,
  SITEURL: process.env.SITEURL,
};

fs.writeFileSync(envPath, JSON.stringify(envConfig, null, 2), { encoding: "utf-8" });
