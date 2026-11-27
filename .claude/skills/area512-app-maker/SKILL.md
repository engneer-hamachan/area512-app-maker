---
name: area512-app-maker
description: Build, fix or check an Area512 app in this project, for the M5Stack Cardputer or the ESP32-2432S028 touch board, from the request through the emulator to the device. Use for any request to make or change an app or game, to draw its images, to run it in the emulator, or to install it on the device.
---

Read `docs/app-development.md` in the project root and follow it.

Settle the device first, as its "Which device" section says. The device picks the
emulator (`emulator-browser` or `emulator-browser-2432s028`), the MCP server
(`picoruby-ti` or `picoruby-ti-2432s028`), the signatures, the examples, the
memory (100 KB or 80 KB), the input (keys or touch buttons) and `area512-send
--board`.

Check methods with the MCP tools (`mcp__picoruby-ti__methods` and the rest),
not by reading `docs/reference/sig*/`. If they are listed by name only, load
them with ToolSearch first; see "Check that a method exists" in the guide.

Write every loop with `while` and an index; never use a block (`each`, `times`,
`map`, `select`, `reject!`, `{ |x| }`, `do ... end`): blocks take far more
memory. Before a large app, read "Memory budget" and "Hand off to another app"
in the guide, and plan for them:
- few, larger methods (each method costs about 90 bytes), files merged by role;
- long texts and tables in data files read when needed, not in the code;
- saves written as bytes and loaded by slicing, split by area so that only
  the area on screen is loaded;
- parts handed off only at pauses the game already has (a new level, a ladder,
  a menu), with a screen that says what is happening;
- measure the heaviest moment with `top` and keep 10 KB free.
