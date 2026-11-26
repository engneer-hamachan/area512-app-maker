---
name: area512-work-flow
description: Make an Area512 game from a game definition file (game-definitions/*.md). First hear the person out, one question at a time, to draw out what they want the game to be, and turn it yourself into design decisions and the bounds of the build, written into the definition; then, without asking anything more, review the plan with small probes and build the game in stages, each checked by a fresh agent before the next starts. Use only when the person runs /area512-work-flow <definition file>.
argument-hint: <definition file>
---

The definition file is `$ARGUMENTS`. This command authorizes the Workflow tool.

Ask the person questions only in the hearing (step 2), before the workflow
starts. Once the workflow starts, do not stop until it has finished: never ask
the person anything, never end the work early, and never cancel the workflow.

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

## 2. Hearing

The hearing draws out what the person wants: the game they picture, the
moments they want, and what would spoil it for them. The design that makes it
happen is your work, not theirs. The person says what they want; you decide
how. Whatever is not drawn out here, the plan guesses, and a wrong guess
costs a whole run.

### Find what you cannot tell

Read the definition, `AGENTS.md` and `docs/app-development.md`. Picture one
whole play of this game, and then many plays, from the first screen to the
end and back. Note each place where you cannot tell what the person wants.

To find them, go through what a game designer settles before production.
This is a list for you, for any genre; never ask it as it is:

- the goal, what ends a play, how long a play and the whole game last
- what the player does over and over, and what each time gives back
- the choices, what each gives and costs, and what the game decides instead
- what grows, what is kept and what starts again, and how fast growth comes
- how hard it starts and how it rises, and whether growth keeps step with it
- what luck decides, and what a rare thing is worth against the effort
- everything counted (lives, time, money, space, pieces), its limits, and
  what happens at a limit
- every edge: failing, running out, being full, the end, after the end
- how much content, and how different each piece must be
- how it moves, responds and paces, and what the player waits for

### Draw it out

Ask **one question at a time**, the gap that changes the game most first.

- Ask about what the person wants and has lived, not for a decision. Never
  ask them to choose a number, a rate, a limit, a formula, a rule of the
  design or an order of work. Those are yours to decide from what they tell
  you.
- Ask about specific moments, in the past or in this game, not about
  opinions in general:
  - a game they played that is close to this one, and what in it they
    liked or would change
  - a moment in a game that felt best, and one that made them quit or feel
    cheated
  - in this game: "when this happens, what should the player feel?", "what
    would make you put it down?", "how long do you want to play in one go?"
- When an answer is vague ("strong", "a lot", "smooth", "hard"), ask for a
  moment in a game they know that shows it, or describe two concrete scenes
  of this game and ask which one is closer.
- Use AskUserQuestion with short scenes as options to make answering easy;
  the person can always write their own answer. Follow "Talking with the
  person who asked" in `AGENTS.md`: no internals.
- Read each answer before the next question. It may close other gaps, open
  new ones or change the game a lot. If an answer is cut off, ask about that
  part only.
- Stop when you could explain every gap above to the plan without guessing.

### Turn it into decisions

After each answer, decide yourself what it means for the design: the rules,
the limits, the numbers, and what the player will see. Tell the person in a
line or two what you took from it and what it will mean in play ("so one play
lasts about ten minutes, and losing starts it again"), so that they can say
"no, I meant..." if you got it wrong. Confirm; do not hand back a choice.

### Bound the build

Decide these yourself for every game, from what you learned, and do not ask
about them. They decide whether the run finishes:

1. **Pass lines.** Every target that must come out right in play (length,
   pace of growth, difficulty, luck, worth of a rare thing) as a measurable
   line with a range, in the game's own terms.
2. **Numbers fixed in the plan.** The plan writes every formula and value;
   the build copies them as they are. Tuning against the pass lines gets at
   most 2 tries of at most 2 minutes each; after that, the best try is kept
   and how far it is from the line is written down.
3. **Work order.** The whole game runs from start to end with plain
   stand-ins (every screen, one whole play and back) before art, polish or
   tuning starts.
4. **First pass of content.** Every large set (pictures, levels, items) is
   made whole at a plain level before any piece is polished; name the
   shortcuts it may take.
5. **Fast checks.** Every pass line and every slow or rare event (a long
   play, a late stage, a rare outcome, the ending) can be checked in
   seconds, by calling the game's rules without the screen or by a switch
   for checks only that the player cannot reach.
6. **Felt lines.** For lines only a person can judge (beautiful, smooth,
   fun), what a check looks at to call them passed.
7. **What to cut first** if the device or the time cannot hold everything.

### Write it down and start

- Keep the old file as `workflow-runs/<name>/definition-before-hearing.md`.
- Write what you took from the answers into `Fun`, `Play` or `Look`, in the
  person's words where you can, replacing a line it changes. Write the
  bounds of the build as `Play` lines.
- Show the person the changed lines, said as what they will see, and ask
  once whether to start. Start only when they say so. If they say to start
  earlier, stop asking and start.

## 3. Keep a copy of an existing app

`apps/` is not in git. If `apps/<name>/` exists, copy it before the workflow
changes it:

```sh
mkdir -p workflow-runs/<name>
cp -r apps/<name> workflow-runs/<name>/app-before-$(date +%Y%m%d-%H%M%S)
```

## 4. Run the workflow

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

- If the run fails, start it again with `resumeFromRunId` and the same
  `scriptPath`, so that the steps already done are not run again.

The run ends when the last build stage is done. A stage whose check still
fails after its tries, or whose builder stays blocked after its redesigns,
is not run again: the run goes on and returns it in `unreachedStages`. Do not
run the workflow again for it: report it.

## 5. Report

Write `workflow-runs/<name>/report.md` from the result:

- each build stage (`stageOutcomes`): its goal, whether its check passed, the
  number of attempts, the reason of its last check and the redesigns it needed
- each criterion: its id, the line of the definition it came from and its
  pass condition
- the expectations of the genre the plan added (`expectations`, the E lines):
  each with why it is taken for granted
- the changes of the plan review (`planChanges`)
- the reference images: path and source URL
- `defaultsTaken`, and the look lines without a reference image
  (`linesWithoutReference`)
- if `unreachedStages` is not empty: each of them with the reason of its last
  check, first in the report and in your message to the person

Then tell the person that it is done, where the report is, and how to try the
app:

- Cardputer: `docker compose up -d emulator`, then http://localhost:8080
- cyd: `docker compose up -d emulator-2432s028`, then http://localhost:8081

Put it on the device only when they ask, as `docs/app-development.md` says.
