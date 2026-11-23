// Boots the wasm build and copies its framebuffer to the canvas. The board's
// input script, loaded before this one, defines boardInput: how the page's keys
// or pointer reach the firmware, and the commands the agent's browser uses.
'use strict';

const PROJECT_APPS_PATH = '/project_apps';
const OPAQUE_ALPHA = 255;

const serialLines = [];
let isRuntimeReady = false;

const statusElement = document.getElementById('status');
const canvas = document.getElementById('screen');
const context = canvas.getContext('2d');
const frame = context.createImageData(canvas.width, canvas.height);

function appendSerialText(text) {
  // Where the device would restart: abort() from the firmware ends the wasm.
  if (text.startsWith('Aborted(')) {
    const lastLine = serialLines.at(-1) ?? '';

    statusElement.textContent = `The device crashed: ${lastLine} Press Reload to boot again.`;
  }

  serialLines.push(text);
}

function copyFramebufferToCanvas() {
  const framebuffer = Module._area512_emulator_framebuffer();
  const heap = Module.HEAPU8;
  const pixels = frame.data;

  for (let pixelIndex = 0; pixelIndex < canvas.width * canvas.height; pixelIndex++) {
    const firstByte = heap[framebuffer + pixelIndex * 2];
    const secondByte = heap[framebuffer + pixelIndex * 2 + 1];
    const rgb565 = (firstByte << 8) | secondByte;
    const red = (rgb565 >> 11) & 0x1f;
    const green = (rgb565 >> 5) & 0x3f;
    const blue = rgb565 & 0x1f;

    pixels[pixelIndex * 4] = (red << 3) | (red >> 2);
    pixels[pixelIndex * 4 + 1] = (green << 2) | (green >> 4);
    pixels[pixelIndex * 4 + 2] = (blue << 3) | (blue >> 2);
    pixels[pixelIndex * 4 + 3] = OPAQUE_ALPHA;
  }

  context.putImageData(frame, 0, 0);
}

function drawFrame() {
  copyFramebufferToCanvas();
  requestAnimationFrame(drawFrame);
}

async function fetchProjectApps() {
  Module.addRunDependency('project-apps');

  try {
    const response = await fetch('/apps.json');
    const appFilePaths = await response.json();

    Module.FS.mkdirTree(PROJECT_APPS_PATH);

    for (const appFilePath of appFilePaths) {
      const fileResponse = await fetch(`/apps/${appFilePath.split('/').map(encodeURIComponent).join('/')}`);
      const fileBytes = new Uint8Array(await fileResponse.arrayBuffer());
      const fileSystemPath = `${PROJECT_APPS_PATH}/${appFilePath}`;

      Module.FS.mkdirTree(fileSystemPath.slice(0, fileSystemPath.lastIndexOf('/')));
      Module.FS.writeFile(fileSystemPath, fileBytes);
    }

    statusElement.textContent = `${appFilePaths.length} files loaded from apps/`;
  } finally {
    Module.removeRunDependency('project-apps');
  }
}

var Module = {
  preRun: [fetchProjectApps],
  print: appendSerialText,
  printErr: appendSerialText,
  onRuntimeInitialized() {
    isRuntimeReady = true;
    boardInput.listenForPageInput();
    requestAnimationFrame(drawFrame);
    canvas.focus();
  },
};

document.getElementById('reload').addEventListener('click', () => location.reload());

// The agent's browser drives the emulator through this object.
window.area512Emulator = {
  board: boardInput.board,
  screenWidth: canvas.width,
  screenHeight: canvas.height,
  isBooted: () => isRuntimeReady && boardInput.isFirmwareReady(),
  ...boardInput.agentCommands,
  serialOutput: () => serialLines.join('\n'),
  // Copies first: the page may not be drawing frames while nobody looks at it.
  screenPngDataUrl() {
    copyFramebufferToCanvas();

    return canvas.toDataURL('image/png');
  },
  screenRgbaBase64() {
    copyFramebufferToCanvas();

    let binaryText = '';

    for (const byte of frame.data) {
      binaryText += String.fromCharCode(byte);
    }

    return btoa(binaryText);
  },
};
