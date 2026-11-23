#!/usr/bin/env node
// Operates the emulator that browser_server.mjs keeps open.
//
//   area512 key down enter fn+; R     Tap keys in order; + holds keys together
//   area512 type 'puts 1'             Type text
//   area512 tap 160 120               Touch the screen at x 160, y 120 (2432S028)
//   area512 drag 40 120 280 120       Drag from x 40, y 120 to x 280, y 120 (2432S028)
//   area512 screenshot [path]         Save the screen as PNG under /workspace
//   area512 serial                    Print what the device wrote to its console
//   area512 errors                    Print errors raised in the page
//   area512 reboot                    Reload apps/ and boot again
//   area512 bot bots/snake.mjs        Run a bot script from the project
import path from 'node:path';

import { emulator, parseKeyCombination, sendCommand } from './emulator_client.mjs';

const USAGE = 'usage: area512 key|type|tap|drag|screenshot|serial|errors|reboot|bot';

const DEFAULT_SCREENSHOT_PATH = '/workspace/screenshots/screen.png';
const WORKSPACE_PATH = '/workspace';
const FAILURE_SCREENSHOT_NAME = 'bot-failure';

async function runBot(botPath) {
  const { default: runBotScript } = await import(path.resolve(WORKSPACE_PATH, botPath));

  try {
    await runBotScript(emulator);
  } catch (error) {
    await emulator.screenshot(FAILURE_SCREENSHOT_NAME);
    throw error;
  }

  const errorText = await emulator.errors();

  if (errorText) {
    throw new Error(`errors in the page:\n${errorText}`);
  }

  return '';
}

function parseTouchScreenNumbers(commandArguments, numberCount) {
  const touchScreenNumbers = commandArguments.map(Number);

  if (touchScreenNumbers.length !== numberCount || !touchScreenNumbers.every(Number.isInteger)) {
    throw new Error(USAGE);
  }

  return touchScreenNumbers;
}

function runCommand(commandName, commandArguments) {
  switch (commandName) {
    case 'key':
      return sendCommand({ command: 'key', keyCombinations: commandArguments.map(parseKeyCombination) });
    case 'type':
      return sendCommand({ command: 'type', text: commandArguments.join(' ') });
    case 'tap':
      return emulator.tap(...parseTouchScreenNumbers(commandArguments, 2));
    case 'drag':
      return emulator.drag(...parseTouchScreenNumbers(commandArguments, 4));
    case 'screenshot':
      return sendCommand({ command: 'screenshot', outputPath: commandArguments[0] ?? DEFAULT_SCREENSHOT_PATH });
    case 'serial':
    case 'errors':
    case 'reboot':
      return sendCommand({ command: commandName });
    case 'bot':
      return runBot(commandArguments[0]);
    default:
      throw new Error(USAGE);
  }
}

const [commandName, ...commandArguments] = process.argv.slice(2);

try {
  process.stdout.write(await runCommand(commandName, commandArguments));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
