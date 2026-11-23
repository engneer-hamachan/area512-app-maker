// Turns the pointer on the canvas into touches of the 2432S028's touch panel,
// and browser keys into the bytes its soft keyboard sends. emulator.js uses
// boardInput.
'use strict';

// The outputs of the soft keyboard's keys in
// components/area512_hal/cyd/console/soft_keyboard.cpp.
const TYPED_TEXT_BY_KEY_NAME = {
  enter: '\r', backspace: '\b', tab: '\t', space: ' ', esc: '\x1b',
  up: '\x1b[A', down: '\x1b[B', right: '\x1b[C', left: '\x1b[D',
};

const BROWSER_KEY_NAMES = {
  Enter: 'enter', Backspace: 'backspace', Tab: 'tab', Escape: 'esc',
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
};

// The soft keyboard's Ctrl turns the next one-byte key into its control code.
const CONTROL_CODE_MASK = 0x1f;
const FIRST_PRINTABLE_CHARACTER_CODE = 0x20;
const LAST_PRINTABLE_CHARACTER_CODE = 0x7e;
const PRIMARY_POINTER_BUTTON = 0;

function isSoftKeyboardCharacter(character) {
  const characterCode = character.charCodeAt(0);

  return character.length === 1 &&
    characterCode >= FIRST_PRINTABLE_CHARACTER_CODE &&
    characterCode <= LAST_PRINTABLE_CHARACTER_CODE;
}

function pushTypedText(typedText) {
  for (const character of typedText) {
    Module._area512_emulator_push_typed_byte(character.charCodeAt(0));
  }
}

// The text one key sends, or null: a name, a character, or ctrl with either.
function typedTextForKeyNames(keyNames) {
  const isCtrlHeld = keyNames.includes('ctrl');
  const otherKeyNames = keyNames.filter((keyName) => keyName !== 'ctrl');

  if (otherKeyNames.length !== 1) {
    return null;
  }

  const keyName = otherKeyNames[0];
  const typedText = TYPED_TEXT_BY_KEY_NAME[keyName] ??
    (isSoftKeyboardCharacter(keyName) ? keyName : null);

  if (typedText === null || !isCtrlHeld) {
    return typedText;
  }

  if (typedText.length !== 1) {
    return null;
  }

  return String.fromCharCode(typedText.charCodeAt(0) & CONTROL_CODE_MASK);
}

function findTouchScreenPoint(pointerEvent) {
  const canvasBounds = canvas.getBoundingClientRect();

  return {
    touchScreenX: Math.floor((pointerEvent.clientX - canvasBounds.left) * canvas.width / canvasBounds.width),
    touchScreenY: Math.floor((pointerEvent.clientY - canvasBounds.top) * canvas.height / canvasBounds.height),
  };
}

function pressTouchAtPointer(pointerEvent) {
  const { touchScreenX, touchScreenY } = findTouchScreenPoint(pointerEvent);

  Module._area512_emulator_press_touch(touchScreenX, touchScreenY);
}

function listenForPointerAndKeys() {
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== PRIMARY_POINTER_BUTTON) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    pressTouchAtPointer(event);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (canvas.hasPointerCapture(event.pointerId)) {
      pressTouchAtPointer(event);
    }
  });

  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(eventName, () => Module._area512_emulator_release_touch());
  }

  document.addEventListener('keydown', (event) => {
    const keyName = BROWSER_KEY_NAMES[event.key] ?? event.key;
    const keyNames = event.ctrlKey ? ['ctrl', keyName.toLowerCase()] : [keyName];
    const typedText = typedTextForKeyNames(keyNames);

    if (typedText === null || event.altKey || event.metaKey) {
      return;
    }

    event.preventDefault();
    pushTypedText(typedText);
  });
}

const boardInput = {
  board: '2432s028',
  listenForPageInput: listenForPointerAndKeys,
  isFirmwareReady: () => Module._area512_emulator_is_touch_panel_polled() === 1,
  agentCommands: {
    pressKey(keyNames) {
      const typedText = typedTextForKeyNames(keyNames);

      if (typedText === null) {
        return false;
      }

      pushTypedText(typedText);

      return true;
    },
    typeText(text) {
      for (const character of text) {
        if (character !== '\n' && !isSoftKeyboardCharacter(character)) {
          throw new Error(`no soft keyboard key types ${JSON.stringify(character)}`);
        }
      }

      pushTypedText(text.replaceAll('\n', TYPED_TEXT_BY_KEY_NAME.enter));
    },
    pressTouch(touchScreenX, touchScreenY) {
      Module._area512_emulator_press_touch(touchScreenX, touchScreenY);
    },
    releaseTouch() {
      Module._area512_emulator_release_touch();
    },
  },
};
