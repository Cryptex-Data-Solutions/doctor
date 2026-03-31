

export class ArgumentsHelper {

  /**
   * Parse the command string to arguments
   * @param command 
   */
  public static parse(command: string) {
    const args: string[] = [];
    const argsRegEx = /(?:"[^"]*")|(?:'[^']*')|[^\s]+/g;
    let match: RegExpExecArray | null;
    while ((match = argsRegEx.exec(command)) !== null) {
      args.push(match[0]);
    }
    return args;
  }
}