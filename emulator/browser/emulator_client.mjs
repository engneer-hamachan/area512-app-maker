// What `area512` commands and bot scripts use to operate the emulator.
const CONTROL_URL = 'http://127.0.0.1:9000';
const SCREEN_WIDTH = 240;
const BROWSER_START_TIMEOUT_MILLISECONDS = 90000;
const BROWSER_START_RETRY_MILLISECONDS = 500;
const SCREENSHOT_DIRECTORY = '/workspace/screenshots';
const TERMINAL_COMMAND_DELAY_MILLISECONDS = 500;
// APP_IMAGE_HOLD_MILLISECONDS in filer_shell.c is 3000, for apps with an image.h.
const APP_START_DELAY_MILLISECONDS = 3500;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// The control port opens only after the first boot, so commands sent right after
// `docker compose up` wait for it.
async function postWhenReady(body) {
  const deadline = Date.now() + BROWSER_START_TIMEOUT_MILLISECONDS;

  for (;;) {
    try {
      return await fetch(CONTROL_URL, { method: 'POST', body });
    } catch (error) {
      if (Date.now() > deadline) {
        throw new Error('the emulator browser did not start', { cause: error });
      }

      await sleep(BROWSER_START_RETRY_MILLISECONDS);
    }
  }
}

export async function sendCommand(request) {
  const response = await postWhenReady(JSON.stringify(request));
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(responseText.trim());
  }

  return responseText;
}

// Each argument is one tap; `+` holds keys together, as in `area512 key`.
export function parseKeyCombination(argument) {
  return argument.length > 1 ? argument.split('+') : [argument];
}

async function key(...keyArguments) {
  await sendCommand({ command: 'key', keyCombinations: keyArguments.map(parseKeyCombination) });
}

// The screen at this moment: pixel(x, y) gives [red, green, blue].
async function readScreen() {
  const rgbaBytes = Buffer.from(await sendCommand({ command: 'pixels' }), 'base64');

  return {
    pixel(x, y) {
      const byteOffset = (y * SCREEN_WIDTH + x) * 4;

      return [rgbaBytes[byteOffset], rgbaBytes[byteOffset + 1], rgbaBytes[byteOffset + 2]];
    },
  };
}

async function typeLine(text) {
  await sendCommand({ command: 'type', text });
  await key('enter');
  await sleep(TERMINAL_COMMAND_DELAY_MILLISECONDS);
}

// Boots with the current apps/, compiles the app's sources in the terminal and
// runs it. Compiling stops at the first error, which then stays on the screen.
async function compileAndRunApp(appName, compileMilliseconds = 3000) {
  await sendCommand({ command: 'reboot' });
  await key('t');
  await sleep(TERMINAL_COMMAND_DELAY_MILLISECONDS);
  await typeLine(`cd /home/apps/${appName}`);
  await typeLine('compile --all');
  await sleep(compileMilliseconds);
  await typeLine('cd ..');
  await typeLine(`run ${appName}`);
  await sleep(APP_START_DELAY_MILLISECONDS);
}

export const emulator = {
  key,
  sleep,
  readScreen,
  compileAndRunApp,
  type: (text) => sendCommand({ command: 'type', text }),
  screenshot: (name) => sendCommand({
    command: 'screenshot',
    outputPath: `${SCREENSHOT_DIRECTORY}/${name}.png`,
  }),
  serial: () => sendCommand({ command: 'serial' }),
  errors: () => sendCommand({ command: 'errors' }),
  reboot: () => sendCommand({ command: 'reboot' }),
};
