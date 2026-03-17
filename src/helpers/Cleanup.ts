import { PagesHelper } from "./index.js";
import { Observable } from "rxjs";
import { CommandArguments } from "@models";

export class Cleanup {
  /**
   * Fetched the Markdown files from the start folder
   * @param ctx
   * @param startFolder
   */
  public static async start(
    ctx: any,
    options: CommandArguments
  ): Promise<Observable<string>> {
    const { webUrl } = options;

    return PagesHelper.clean(webUrl, options);
  }
}
