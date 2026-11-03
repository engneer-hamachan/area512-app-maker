// Sends an app to a Cardputer waiting in Area512's receive mode, over Web Serial.
// The protocol is the device side of components/area512_hal/usb/area512_usb_receive.c.
'use strict';

const ESPRESSIF_USB_VENDOR_ID = 0x303a;
const SERIAL_BAUD_RATE = 115200;
const DEVICE_APPS_PATH = '/home/apps';
const REPLY_PREFIX = 'AREA512 ';
const READY_REPLY = 'READY';
const OK_REPLY = 'OK';
const CHUNK_BYTE_COUNT = 4096;
const READY_TIMEOUT_MILLISECONDS = 5000;
const REPLY_TIMEOUT_MILLISECONDS = 5000;

const CRC32_TABLE = Array.from({ length: 256 }, (_, tableIndex) => {
  let value = tableIndex;

  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function computeCrc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function decodeBase64(text) {
  return Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
}

// Lines from the device, which also writes other text on the same port.
class SerialLineReader {
  constructor(readable) {
    this.reader = readable.getReader();
    this.decoder = new TextDecoder();
    this.bufferedText = '';
    this.pendingRead = null;
  }

  async readLine(deadline) {
    for (;;) {
      const lineEnd = this.bufferedText.indexOf('\n');

      if (lineEnd >= 0) {
        const line = this.bufferedText.slice(0, lineEnd).replace(/\r$/, '');

        this.bufferedText = this.bufferedText.slice(lineEnd + 1);

        return line;
      }

      this.pendingRead ??= this.reader.read();

      const timeout = new Promise((resolve) => {
        setTimeout(resolve, deadline - Date.now(), null);
      });
      const result = await Promise.race([this.pendingRead, timeout]);

      if (result === null) {
        return null;
      }

      this.pendingRead = null;

      if (result.done) {
        return null;
      }

      this.bufferedText += this.decoder.decode(result.value, { stream: true });
    }
  }

  async release() {
    await this.reader.cancel();
    this.reader.releaseLock();
  }
}

async function waitForReady(lineReader) {
  const deadline = Date.now() + READY_TIMEOUT_MILLISECONDS;

  for (;;) {
    const line = await lineReader.readLine(deadline);

    if (line === null) {
      throw new Error('The Cardputer is not receiving. Press Opt + r in the file list.');
    }

    if (line === REPLY_PREFIX + READY_REPLY) {
      return;
    }
  }
}

async function expectOk(lineReader, devicePath) {
  const deadline = Date.now() + REPLY_TIMEOUT_MILLISECONDS;

  for (;;) {
    const line = await lineReader.readLine(deadline);

    if (line === null) {
      throw new Error(`${devicePath}: no reply from the Cardputer`);
    }

    if (!line.startsWith(REPLY_PREFIX) || line === REPLY_PREFIX + READY_REPLY) {
      continue;
    }

    const reply = line.slice(REPLY_PREFIX.length);

    if (reply !== OK_REPLY) {
      throw new Error(`${devicePath}: ${reply}`);
    }

    return;
  }
}

function joinBytes(firstBytes, secondBytes) {
  const joinedBytes = new Uint8Array(firstBytes.length + secondBytes.length);

  joinedBytes.set(firstBytes);
  joinedBytes.set(secondBytes, firstBytes.length);

  return joinedBytes;
}

async function sendCommand(session, commandLine, devicePath, payload = new Uint8Array()) {
  const commandBytes = new TextEncoder().encode(`${commandLine}\n`);

  await session.writer.write(joinBytes(commandBytes, payload));
  await expectOk(session.lineReader, devicePath);
}

async function sendFile(session, devicePath, fileBytes) {
  const crc32Text = computeCrc32(fileBytes).toString(16).padStart(8, '0');

  await sendCommand(session, `FILE ${devicePath} ${fileBytes.length} ${crc32Text}`, devicePath);

  for (let offset = 0; offset < fileBytes.length; offset += CHUNK_BYTE_COUNT) {
    const chunkBytes = fileBytes.subarray(offset, offset + CHUNK_BYTE_COUNT);

    await sendCommand(session, `DATA ${chunkBytes.length}`, devicePath, chunkBytes);
  }

  await sendCommand(session, 'END', devicePath);
}

function listParentDirectories(appDevicePath, deviceFiles) {
  const directories = new Set([appDevicePath]);

  for (const deviceFile of deviceFiles) {
    const pathParts = deviceFile.path.split('/').slice(0, -1);

    pathParts.forEach((_, partIndex) => {
      directories.add(`${appDevicePath}/${pathParts.slice(0, partIndex + 1).join('/')}`);
    });
  }

  return [...directories];
}

async function sendAppFiles(port, appName, deviceFiles, reportProgress) {
  const appDevicePath = `${DEVICE_APPS_PATH}/${appName}`;

  await port.open({ baudRate: SERIAL_BAUD_RATE });

  const session = {
    writer: port.writable.getWriter(),
    lineReader: new SerialLineReader(port.readable),
  };

  try {
    await waitForReady(session.lineReader);

    for (const directory of listParentDirectories(appDevicePath, deviceFiles)) {
      await sendCommand(session, `MKDIR ${directory}`, directory);
    }

    for (const [fileIndex, deviceFile] of deviceFiles.entries()) {
      reportProgress(`Sending ${deviceFile.path} (${fileIndex + 1}/${deviceFiles.length})`);
      await sendFile(session, `${appDevicePath}/${deviceFile.path}`, decodeBase64(deviceFile.base64));
    }

    await sendCommand(session, 'DONE', 'DONE');
  } finally {
    await session.lineReader.release();
    session.writer.releaseLock();
    await port.close();
  }
}

async function fetchDeviceFiles(appName) {
  const response = await fetch(`/device-files/${encodeURIComponent(appName)}`);

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

async function listProjectApps() {
  const appFilePaths = await (await fetch('/apps.json')).json();
  const appNames = appFilePaths
    .filter((appFilePath) => appFilePath.includes('/'))
    .map((appFilePath) => appFilePath.split('/')[0]);

  return [...new Set(appNames)];
}

async function setUpTransfer() {
  const appSelect = document.getElementById('transfer-app');
  const sendButton = document.getElementById('transfer-send');
  const transferStatus = document.getElementById('transfer-status');
  const reportProgress = (text) => {
    transferStatus.textContent = text;
  };

  for (const appName of await listProjectApps()) {
    appSelect.add(new Option(appName, appName));
  }

  if (!('serial' in navigator)) {
    sendButton.disabled = true;
    reportProgress('Sending needs Chrome or Edge.');
    return;
  }

  sendButton.addEventListener('click', async () => {
    const appName = appSelect.value;

    sendButton.disabled = true;

    try {
      // requestPort must run first: it needs the click that started this.
      const port = await navigator.serial.requestPort({
        filters: [{ usbVendorId: ESPRESSIF_USB_VENDOR_ID }],
      });

      reportProgress(`Compiling ${appName}…`);

      const deviceFiles = await fetchDeviceFiles(appName);

      await sendAppFiles(port, appName, deviceFiles, reportProgress);
      reportProgress(`Sent. On the Cardputer, open /home/apps, select ${appName} and press R.`);
    } catch (error) {
      reportProgress(error.message);
    } finally {
      sendButton.disabled = false;
    }
  });
}

setUpTransfer();
