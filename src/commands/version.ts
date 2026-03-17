import kleur from "kleur";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { readFileAsync } from "@utils";

const __dirname = dirname(fileURLToPath(import.meta.url));

export class Version {
  /**
   * Retrieve the version number
   */
  public static async start() {
    const version = await this.getVersion();
    if (version) {
      console.log(`Current installed version: ${version}`);
    } else {
      console.log(kleur.red("Unknown version!"));
    }
  }

  /**
   * Retrieve the current version
   */
  public static async getVersion() {
    const pkg = await readFileAsync(join(__dirname, "../../package.json"), {
      encoding: "utf-8",
    });
    if (pkg) {
      const parsed = JSON.parse(pkg);
      return parsed.version;
    }
    return null;
  }
}
