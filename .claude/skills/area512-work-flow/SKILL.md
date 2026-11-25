---
name: area512-work-flow
description: Make an Area512 game from a game definition file (game-definitions/*.md) without asking anything, then repeat audits of its game play and its look, and fixes, until every line of the definition passes, for at most five rounds. Use only when the person runs /area512-work-flow <definition file>.
argument-hint: <definition file>
---

The definition file is `$ARGUMENTS`. This command authorizes the Workflow tool.

Once the workflow starts, do not stop until it has finished: never ask the
person anything, never end the work early, and never cancel the workflow.

## 1. Read the definition

Read the file. If no file is given or it does not exist, say so and stop.

It has the sections of `game-definitions/template.md`. Ignore `<!-- -->`
comments and take:

| Section | Value |
|---|---|
| `## Name` | the text after `name:` |
| `## Board` | the text after `board:` |
| `## Genre` | the first line of text |
| `## Fun` | each line starting with `- ` that has text after it |
| `## Play` | each line starting with `- ` that has text after it |
| `## Look` | each line starting with `- ` that has text after it |

Check them before starting. If one fails, say which, and stop. Do not fill it
in yourself.

- The name starts with a lower-case letter and has only lower-case letters,
  digits and `_`.
- The board is `cardputer` or `cyd`.
- The genre has text. Fun, Play and Look have at least one line each.

## 2. Keep a copy of an existing app

`apps/` is not in git. If `apps/<name>/` exists, copy it before the workflow
changes it:

```sh
mkdir -p workflow-runs/<name>
cp -r apps/<name> workflow-runs/<name>/app-before-$(date +%Y%m%d-%H%M%S)
```

## 3. Run the workflow

```
Workflow({
  name: "area512-work-flow",
  args: {
    definitionPath: "<the file>",
    appName: "<name>",
    board: "<cardputer or cyd>",
    genre: "<genre>",
    funLines: ["<each Fun line>"],
    playLines: ["<each Play line>"],
    visualLines: ["<each Look line>"]
  }
})
```

If the tool does not know the name, pass
`scriptPath: ".claude/workflows/area512-work-flow.js"` instead of `name`.

Wait for it to finish. Do nothing else in the project while it runs: its
steps use the emulator one at a time.

- If it returns `finished: false`, run it again with the same `args` plus
  `continuation` set to the `continuation` it returned. It returns this when it
  is close to the 1000-agent limit of one run.
- If the run fails, start it again with `resumeFromRunId` and the same
  `scriptPath`, so that the steps already done are not run again.

Repeat until it returns `finished: true`.

The run ends after 5 rounds even if criteria still fail (`args.maxRounds`
changes the number). It then returns `roundLimitReached: true` and the failed
verdicts in `unresolved`. Do not run it again for them: report them.

## 4. Report

Write `workflow-runs/<name>/report.md` from the result:

- each criterion: its id, the line of the definition it came from, its pass
  condition, the audit's reason and the evidence files
- the expectations of the genre the plan added (`expectations`, the E lines):
  each with why it is taken for granted; their criteria are listed as above
- the reference images: path and source URL
- `defaultsTaken`, and the look lines without a reference image
  (`linesWithoutReference`)
- the number of rounds
- if `roundLimitReached` is true: each criterion in `unresolved`, with the
  audit's reason and the changes the fixes tried (`fixHistory`), first in the
  report and in your message to the person

Then tell the person that it is done, where the report is, and how to try the
app:

- Cardputer: `docker compose up -d emulator`, then http://localhost:8080
- cyd: `docker compose up -d emulator-2432s028`, then http://localhost:8081

Put it on the device only when they ask, as `docs/app-development.md` says.
