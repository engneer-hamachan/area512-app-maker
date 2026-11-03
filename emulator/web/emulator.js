// Boots the wasm build, copies its framebuffer to the canvas and turns browser
// key events into the key codes the Cardputer's keyboard driver reads.
'use strict';

const DISPLAY_WIDTH = 240;
const DISPLAY_HEIGHT = 135;
const PROJECT_APPS_PATH = '/project_apps';
const OPAQUE_ALPHA = 255;

// cardputer_lookup_key in components/area512_hal/console/keyboard.cpp.
const KEY_CODE_BY_NAME = {
  fn: 3, ctrl: 4, shift: 7, opt: 8, alt: 14,
  tab: 2, backspace: 65, enter: 67, space: 68,
};

const KEY_CODE_BY_CHARACTER = {
  '`': 1, 1: 5, 2: 11, 3: 15, 4: 21, 5: 25, 6: 31, 7: 35, 8: 41, 9: 45, 0: 51,
  q: 6, w: 12, e: 16, r: 22, t: 26, y: 32, u: 36, i: 42, o: 46, p: 52,
  a: 13, s: 17, d: 23, f: 27, g: 33, h: 37, j: 43, k: 47, l: 53,
  z: 18, x: 24, c: 28, v: 34, b: 38, n: 44, m: 48,
  ',': 54, _: 55, '[': 56, ';': 57, '.': 58, '=': 61, ']': 62, "'": 63,
  '/': 64, '\\': 66,
};

// cardputer_apply_shift, reversed.
const UNSHIFTED_CHARACTER_BY_SHIFTED = {
  '~': '`', '!': '1', '@': '2', '#': '3', $: '4', '%': '5', '^': '6', '&': '7',
  '*': '8', '(': '9', ')': '0', '-': '_', '+': '=', '{': '[', '}': ']',
  ':': ';', '"': "'", '<': ',', '>': '.', '?': '/', '|': '\\',
};

// Named keys, each as the keys held together on the Cardputer.
const KEY_NAME_COMBINATIONS = {
  esc: ['`'],
  up: ['fn', ';'],
  down: ['fn', '.'],
  left: ['fn', ','],
  right: ['fn', '/'],
};

const BROWSER_KEY_NAMES = {
  Enter: 'enter', Backspace: 'backspace', Tab: 'tab', ' ': 'space',
  Escape: 'esc', ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left',
  ArrowRight: 'right', Control: 'ctrl', Alt: 'alt', Meta: 'opt', F1: 'fn',
};

const serialLines = [];
let isRuntimeReady = false;

const statusElement = document.getElementById('status');
const canvas = document.getElementById('screen');
const context = canvas.getContext('2d');
const frame = context.createImageData(DISPLAY_WIDTH, DISPLAY_HEIGHT);

function keyCodesForCharacter(character) {
  if (character in UNSHIFTED_CHARACTER_BY_SHIFTED) {
    const unshifted = UNSHIFTED_CHARACTER_BY_SHIFTED[character];

    return [KEY_CODE_BY_NAME.shift, KEY_CODE_BY_CHARACTER[unshifted]];
  }

  if (character >= 'A' && character <= 'Z') {
    return [KEY_CODE_BY_NAME.shift, KEY_CODE_BY_CHARACTER[character.toLowerCase()]];
  }

  if (character === ' ') {
    return [KEY_CODE_BY_NAME.space];
  }

  if (character === '\n') {
    return [KEY_CODE_BY_NAME.enter];
  }

  if (character === '\t') {
    return [KEY_CODE_BY_NAME.tab];
  }

  if (character in KEY_CODE_BY_CHARACTER) {
    return [KEY_CODE_BY_CHARACTER[character]];
  }

  return null;
}

function keyCodesForName(keyName) {
  if (keyName in KEY_NAME_COMBINATIONS) {
    return KEY_NAME_COMBINATIONS[keyName].flatMap(keyCodesForName);
  }

  if (keyName in KEY_CODE_BY_NAME) {
    return [KEY_CODE_BY_NAME[keyName]];
  }

  return keyCodesForCharacter(keyName);
}

function pressKeyCodes(keyCodes) {
  for (const keyCode of keyCodes) {
    Module._area512_emulator_push_key_event(keyCode, 1);
  }
}

function releaseKeyCodes(keyCodes) {
  for (const keyCode of [...keyCodes].reverse()) {
    Module._area512_emulator_push_key_event(keyCode, 0);
  }
}

function tapKeyCodes(keyCodes) {
  pressKeyCodes(keyCodes);
  releaseKeyCodes(keyCodes);
}

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

  for (let pixelIndex = 0; pixelIndex < DISPLAY_WIDTH * DISPLAY_HEIGHT; pixelIndex++) {
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

function handleBrowserKey(event, isPressed, heldKeyCodesByBrowserCode) {
  const keyName = BROWSER_KEY_NAMES[event.key] ?? (event.key.length === 1 ? event.key : null);

  if (keyName === null) {
    return;
  }

  event.preventDefault();

  if (!isPressed) {
    const heldKeyCodes = heldKeyCodesByBrowserCode.get(event.code);

    if (heldKeyCodes) {
      releaseKeyCodes(heldKeyCodes);
      heldKeyCodesByBrowserCode.delete(event.code);
    }

    return;
  }

  if (event.repeat || heldKeyCodesByBrowserCode.has(event.code)) {
    return;
  }

  const keyCodes = keyCodesForName(keyName);

  if (keyCodes) {
    pressKeyCodes(keyCodes);
    heldKeyCodesByBrowserCode.set(event.code, keyCodes);
  }
}

function listenForBrowserKeys() {
  const heldKeyCodesByBrowserCode = new Map();

  document.addEventListener('keydown', (event) => {
    handleBrowserKey(event, true, heldKeyCodesByBrowserCode);
  });

  document.addEventListener('keyup', (event) => {
    handleBrowserKey(event, false, heldKeyCodesByBrowserCode);
  });

  window.addEventListener('blur', () => {
    heldKeyCodesByBrowserCode.forEach(releaseKeyCodes);
    heldKeyCodesByBrowserCode.clear();
  });
}

var Module = {
  preRun: [fetchProjectApps],
  print: appendSerialText,
  printErr: appendSerialText,
  onRuntimeInitialized() {
    isRuntimeReady = true;
    listenForBrowserKeys();
    requestAnimationFrame(drawFrame);
    canvas.focus();
  },
};

document.getElementById('reload').addEventListener('click', () => location.reload());

// The agent's browser drives the emulator through this object.
window.area512Emulator = {
  isBooted: () => isRuntimeReady && Module._area512_emulator_is_keyboard_configured() === 1,
  pressKey(keyNames) {
    const keyCodes = keyNames.flatMap((keyName) => keyCodesForName(keyName) ?? []);

    tapKeyCodes(keyCodes);

    return keyCodes.length > 0;
  },
  typeText(text) {
    for (const character of text) {
      const keyCodes = keyCodesForCharacter(character);

      if (keyCodes === null) {
        throw new Error(`no Cardputer key types ${JSON.stringify(character)}`);
      }

      tapKeyCodes(keyCodes);
    }
  },
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
