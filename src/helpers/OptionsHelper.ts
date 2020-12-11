import * as arg from 'arg';
import * as path from 'path';
import * as fs from 'fs';
import * as kleur from 'kleur';
import * as inquirer from 'inquirer';
import { CommandArguments } from "../models/CommandArguments";

export class OptionsHelper {

  /**
   * Fetch the config stored in the current project
   */
  public static fetchConfig(): any {
    const configPath = path.join(process.cwd(), 'config.json');
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, { encoding: "utf-8" });
      if (config) {
        return JSON.parse(config);
      }
    }
    return {};
  }

  /**
   * Parse command arguments
   * @param options 
   * @param rawArgs 
   */
  public static parseArguments(options: any, rawArgs: string[]): CommandArguments {
    const args = arg(
      {
        '--auth': String,
        '--username': String,
        '--password': String,
        '--folder': String,
        '--url': String,
        '--library': String,
        '--wpInternalTitle': String,
        '--overwriteImages': Boolean,
        '-a': '--auth',
        '-f': '--folder',
        '-u': '--url'
      },
      {
        argv: rawArgs.slice(2),
      }
    );
    
    return {
      task: args._[0],
      auth: args["--auth"] as any || options["auth"] || "deviceCode",
      overwriteImages: args["--overwriteImages"] as any || options["overwriteImages"] || false,
      username: args["--username"] || options["username"] || null,
      password: args["--password"] || options["password"] || null,
      webUrl: args["--url"] || options["url"] || null,
      startFolder: args["--folder"] || options["folder"] || null,
      assetLibrary: args["--library"] || options["library"] || 'Shared Documents',
      webPartTitle: args["--wpInternalTitle"] || options["wpInternalTitle"] || 'doctor-placeholder',
      menu: options["menu"] || null
    };
  }

  /**
   * Prompt for missing parameters
   * @param options 
   */
  public static async promptForMissingArgs(options: CommandArguments) {
    const questions = [];
  
    if (!options.task) {
      questions.push({
        type: 'list',
        name: 'task',
        message: 'Which command do you want to execute?',
        choices: ['publish']
      });
    }
    
    if (!options.startFolder) {
      questions.push({
        type: 'input',
        name: 'startFolder',
        message: 'In which folder are your markdown files located?',
        validate: (input: any) => {
          const folderPath = path.join(process.cwd(), input);
          if (!fs.existsSync(folderPath)) {
            console.log(``);
            console.log(kleur.red(`The specified folder "${folderPath}" doesn't exist. Please specify another folder.`));
            return false;
          }
          return true;
        }
      });
    }
  
    if (options.auth && options.auth === "password" && !options.username) {
      questions.push({
        type: 'input',
        name: 'username',
        message: 'What is the username?'
      });
    }
    
    if (options.auth && options.auth === "password" && !options.password) {
      questions.push({
        type: 'password',
        name: 'password',
        message: 'What is the password?'
      });
    }
   
    const answers = await inquirer.prompt(questions);
    return {
      ...options,
      task: options.task || answers.task,
      username: options.username || answers.username,
      password: options.password || answers.password,
      startFolder: path.join(process.cwd(), options.startFolder || answers.startFolder)
    };
  }
}