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
