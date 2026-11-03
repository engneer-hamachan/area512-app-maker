# area512-app-maker

An AI agent builds apps for
[Area512](https://github.com/engneer-hamachan/area512) and gets them onto the
device.

- Docker is the only software a user needs, on Windows, macOS and Linux.
- It works from both Claude Code and Codex.
- The agent checks methods through the
  [picoruby-ti](https://github.com/engneer-hamachan/picoruby-ti) MCP, built in
  Docker.
- The agent and the user both see apps running in an emulator in the browser.
- The agent knows how to build an Area512 app from the moment it opens this
  project: see `AGENTS.md` and `docs/app-development.md`.
- A finished app goes to the device with Area512's file transfer.
