import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(__dirname, `../doctor-sample/doctor.json`);

const config = {
  "$schema": "https://raw.githubusercontent.com/estruyf/doctor/dev/schema/2.0.0.json",
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

// Inject translator key if provided
if (process.env.TRANSLATOR_KEY) {
  config.multilingual = {
    "enableTranslations": true,
    "languages": [1043],
    "overwriteTranslationsOnChange": true,
    "translator": {
      "key": process.env.TRANSLATOR_KEY,
      "endpoint": "https://api.cognitive.microsofttranslator.com/",
      "region": "westeurope"
    }
  };
}

fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), { encoding: "utf-8" });
console.log(`Created doctor.json at ${outputPath}`);
