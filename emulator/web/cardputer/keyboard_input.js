// Turns browser key events into the key codes the Cardputer's keyboard driver
// reads. emulator.js uses boardInput.
'use strict';

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

const boardInput = {
  board: 'cardputer',
  listenForPageInput: listenForBrowserKeys,
  // keyboard_init drops the events queued before it, so a key is only safe to
  // send once the firmware has configured the controller.
  isFirmwareReady: () => Module._area512_emulator_is_keyboard_configured() === 1,
  agentCommands: {
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
  },
};
