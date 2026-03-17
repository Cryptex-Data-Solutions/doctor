import { CliCommand } from "./CliCommand.js";
import crossSpawn from "cross-spawn";
import { Logger } from "./logger.js";
import { defer, StatusHelper } from "./index.js";
import { Deferred } from "@models";
import { execAsync } from "@utils";

type M365CommandListener = {
  stdout: (message: any) => void;
  stderr: (message: any) => void;
};

type M365CommandOutput = {
  error?: {
    message: string;
    code?: number;
  };
  stdout: string;
  stderr: string;
};

type M365ExecuteCommand = (
  commandName: string,
  options: any,
  listener?: M365CommandListener
) => Promise<M365CommandOutput>;

let executeCommandRef: M365ExecuteCommand | null = null;

const knownShorthandOptions: { [key: string]: string } = {
  o: "output",
  f: "folder",
  id: "id",
};

// Catch all the errors coming from command execution
process.on("unhandledRejection", (reason, promise) => {
  Logger.debug(`Unhandled Rejection at: ${reason}`);
});

/**
 * Execute script with retry logic
 * @param args
 * @param shouldRetry
 * @param shouldSpawn
 * @param toMask
 */
export const execScript = async <T>(
  args: string[] = [],
  shouldRetry: boolean = false,
  shouldSpawn: boolean = false,
  toMask: string[] = [],
  deferred?: Deferred<T>
): Promise<T | any> => {
  let firstRun = false;
  if (!deferred) {
    firstRun = true;
    deferred = defer();
  }

  promiseExecScript<T>(args, shouldSpawn, toMask)
    .then((result) => {
      deferred.resolve(result);
    })
    .catch((err) => {
      if (shouldRetry && firstRun) {
        Logger.debug(`Doctor will retry to execute the command again.`);
        StatusHelper.addRetry();

        // Waiting 5 seconds in order to make sure that the call did not happen too fast after the previous failure
        setTimeout(async () => {
          execScript(args, shouldRetry, shouldSpawn, toMask, deferred);
        }, 5000);
      } else {
        deferred.reject(err);
      }
    });

  return deferred.promise;
};

const promiseExecScript = async <T>(
  args: string[] = [],
  shouldSpawn: boolean = false,
  toMask: string[] = []
): Promise<T> => {
  return new Promise<T>(async (resolve, reject) => {
    Logger.debug(``);
    const cmdToExec = Logger.mask(
      `${CliCommand.getName()} ${args.join(" ")}`,
      toMask
    );
    Logger.debug(`Command: ${cmdToExec}`);

    if (usesM365Api(CliCommand.getName())) {
      try {
        const executeCommand = await getM365ExecuteCommand();
        const parsed = parseM365CommandArgs(args);

        const listener = shouldSpawn
          ? {
              stdout: (message: any) => {
                console.log(`${message}`);
              },
              stderr: (message: any) => {
                console.error(`${Logger.mask(`${message}`, toMask)}`);
              },
            }
          : undefined;

        const result = await executeCommand(
          parsed.commandName,
          parsed.options,
          listener
        );

        if (result.stderr) {
          reject(new Error(Logger.mask(result.stderr, toMask)));
          return;
        }

        resolve(result.stdout as any as T);
        return;
      } catch (error: any) {
        const message = getCommandErrorMessage(error);
        reject(new Error(Logger.mask(message, toMask)));
        return;
      }
    }

    if (shouldSpawn) {
      const execution = crossSpawn(CliCommand.getName(), [...args]);

      execution.stdout.on("data", (data) => {
        console.log(`${data}`);
      });

      execution.stdout.on("close", (data: any) => {
        resolve(data);
      });

      execution.stderr.on("data", async (error) => {
        error = Logger.mask(error, toMask);
        reject(new Error(error));
      });
    } else {
      try {
        const { stdout, stderr } = await execAsync(
          `${CliCommand.getName()} ${args.join(" ")}`
        );
        if (stderr) {
          const error = Logger.mask(stderr, toMask);
          reject(new Error(error));
          return;
        }

        resolve(stdout as any as T);
      } catch (e: any) {
        reject(e.message);
      }
    }
  });
};

const usesM365Api = (commandName: string): boolean => {
  return ["m365", "localm365"].indexOf(commandName.toLowerCase()) !== -1;
};

const getM365ExecuteCommand = async (): Promise<M365ExecuteCommand> => {
  if (executeCommandRef) {
    return executeCommandRef;
  }

  const m365Api = await import("@pnp/cli-microsoft365");
  executeCommandRef = m365Api.executeCommand;
  return executeCommandRef;
};

const parseM365CommandArgs = (args: string[]): {
  commandName: string;
  options: any;
} => {
  const optionStartIndex = args.findIndex((arg) => arg.startsWith("-"));
  const commandTokens =
    optionStartIndex === -1 ? args : args.slice(0, optionStartIndex);
  const commandName = commandTokens.join(" ").trim();

  if (!commandName) {
    throw new Error("No command specified.");
  }

  const optionTokens =
    optionStartIndex === -1 ? [] : args.slice(optionStartIndex);
  const options: any = {};

  for (let i = 0; i < optionTokens.length; i++) {
    const token = optionTokens[i];

    if (!token.startsWith("-")) {
      continue;
    }

    const rawKey = token.replace(/^-+/, "");
    const optionKey =
      knownShorthandOptions[rawKey] ||
      knownShorthandOptions[rawKey[0]] ||
      rawKey;

    const nextToken = optionTokens[i + 1];
    const hasValue = !!nextToken && !nextToken.startsWith("-");

    options[optionKey] = hasValue ? nextToken : true;

    if (hasValue) {
      i += 1;
    }
  }

  return {
    commandName,
    options,
  };
};

const getCommandErrorMessage = (error: any): string => {
  if (!error) {
    return "Unknown command error.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.error && error.error.message) {
    return error.error.message;
  }

  if (error.stderr) {
    return error.stderr;
  }

  if (error.message) {
    return error.message;
  }

  return JSON.stringify(error);
};