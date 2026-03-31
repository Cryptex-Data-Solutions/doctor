const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, `../doctor-sample/doctor.json`);

const config = {
  "$schema": "https://raw.githubusercontent.com/estruyf/doctor/main/schema/1.2.1.json",
  "folder": "./src",
  "auth": "certificate",
  "library": "sitepages",
  "disableComments": false,
  "markdown": {
    "allowHtml": true,
    "theme": "dark",
    "shortcodesFolder": "./shortcodes"
  },
  "siteDesign": {
    "logo": "./src/assets/doctor.png",
    "theme": "Red",
    "chrome": {
      "headerLayout": "Compact",
      "headerEmphasis": "Dark"
    }
  },
  "menu": {
    "QuickLaunch": {
      "items": [
        {
          "id": "doctor",
          "name": "Doctor",
          "url": "",
          "weight": 2
        },
        {
          "id": "tests",
          "name": "Test pages",
          "url": "",
          "weight": 3
        }
      ]
    }
  }
};

fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), { encoding: "utf-8" });
console.log(`Created doctor.json at ${outputPath}`);
