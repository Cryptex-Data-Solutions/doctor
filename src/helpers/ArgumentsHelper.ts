

export class ArgumentsHelper {

  /**
   * Parse the command string to arguments
   * @param command 
   */
  public static parse(command: string) {
    const args: string[] = [];
    // eslint-disable-next-line no-regex-spaces
    const argsRegEx = /(?:"([^"]*)")|(?:'([^']*)')|([^\s]+)/g;
    let match: RegExpExecArray | null;
    while ((match = argsRegEx.exec(command)) !== null) {
      args.push(match[1] ?? match[2] ?? match[3]);
    }
    return args;
  }
}