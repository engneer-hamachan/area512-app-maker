// Keeps one emulator open in headless Chromium, so that the state of the device
// survives between `area512` commands.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright-core';

const EMULATOR_URL = process.env.AREA512_EMULATOR_URL ?? 'http://emulator:8080';
const CONTROL_PORT = 9000;
const BOOT_TIMEOUT_MILLISECONDS = 60000;
const CONNECTION_RETRY_MILLISECONDS = 500;

// SharedArrayBuffer needs a secure origin, which http://emulator:8080 is not.
const browser = await chromium.launch({
  args: [`--unsafely-treat-insecure-origin-as-secure=${EMULATOR_URL}`],
});

const page = await browser.newPage();
const pageErrors = [];

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    pageErrors.push(message.text());
  }
});

async function openEmulator() {
  const deadline = Date.now() + BOOT_TIMEOUT_MILLISECONDS;

  for (;;) {
    try {
      await page.goto(EMULATOR_URL);
      break;
    } catch (error) {
      if (Date.now() > deadline) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, CONNECTION_RETRY_MILLISECONDS));
    }
  }

  await page.waitForFunction(
    () => window.area512Emulator?.isBooted(),
    null,
    { timeout: BOOT_TIMEOUT_MILLISECONDS },
  );
}

const commandHandlers = {
  async key({ keyCombinations }) {
    for (const keyNames of keyCombinations) {
      const wasPressed = await page.evaluate(
        (names) => window.area512Emulator.pressKey(names),
        keyNames,
      );

      if (!wasPressed) {
        throw new Error(`unknown key: ${keyNames.join('+')}`);
      }
    }

    return '';
  },
  async type({ text }) {
    await page.evaluate((typedText) => window.area512Emulator.typeText(typedText), text);

    return '';
  },
  async screenshot({ outputPath }) {
    const dataUrl = await page.evaluate(() => window.area512Emulator.screenPngDataUrl());
    const pngBytes = Buffer.from(dataUrl.split(',')[1], 'base64');

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, pngBytes);

    return `${outputPath}\n`;
  },
  async pixels() {
    return page.evaluate(() => window.area512Emulator.screenRgbaBase64());
  },
  async serial() {
    return page.evaluate(() => window.area512Emulator.serialOutput());
  },
  async errors() {
    return pageErrors.join('\n');
  },
  async reboot() {
    pageErrors.length = 0;
    await openEmulator();

    return '';
  },
};

await openEmulator();

http.createServer(async (request, response) => {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  try {
    const { command, ...commandArguments } = JSON.parse(Buffer.concat(chunks).toString());
    const handler = commandHandlers[command];

    if (!handler) {
      throw new Error(`unknown command: ${command}`);
    }

    response.end(await handler(commandArguments));
  } catch (error) {
    response.statusCode = 500;
    response.end(`${error.message}\n`);
  }
}).listen(CONTROL_PORT, '127.0.0.1', () => {
  console.log('Area512 emulator browser is ready');
});
