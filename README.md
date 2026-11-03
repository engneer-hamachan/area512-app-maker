# area512-app-maker

Ask an AI agent for an app in plain words, and it builds one for
[Area512](https://github.com/engneer-hamachan/area512) on the M5Stack Cardputer. It
writes the app, plays it in an emulator to prove that it works, and tells you how
to put it on the device.

Works with Claude Code and Codex. All you need is Docker.

## Start

```sh
git clone <this repository>
cd area512-app-maker
docker compose build
```

The first build takes several minutes. Then open the project in Claude Code or
Codex and ask for an app:

> Make a game where I dodge falling rocks.

Claude Code asks once to approve the project's MCP server. Codex asks to trust the
project, and asks before each `docker` command unless you allow them.

## See an app yourself

```sh
docker compose up -d emulator
```

Open http://localhost:8080. Your apps are in `/home/apps`: press `t` for the
terminal, then:

```text
cd /home/apps/snake
compile --all
cd ..
run snake
```

| On your keyboard | On the Cardputer |
|---|---|
| Arrow keys | Fn + `;` `.` `,` `/` |
| Esc | The `` ` `` key |
| F1 | Fn |
| Win / Cmd | Opt |

After an app changes, press **Reload apps and reboot**. To use another port, set
`AREA512_EMULATOR_PORT`.

## Put an app on the device

Connect the Cardputer by USB, press `t` in its file list, type `recv` and press
Enter, then ask the agent to put the app on the device. You can also send it
yourself from http://localhost:8080 in Chrome or Edge, under "Send to the device".

## What is here

| Path | What it is |
|---|---|
| `apps/` | The apps |
| `bots/` | Scripts that play each app in the emulator to test it |
| `docs/` | How to build an app, and the Area512 reference, for the agent |
| `emulator/` | The emulator: Area512's firmware sources built for the browser |
| `tools/assets/` | Makes dot images and start screens |
| `tools/device/` | Sends an app to the Cardputer over USB |
| `docker/picoruby-ti-mcp/` | The type checker that tells the agent which methods exist |
