# Making an Area512 app

## Which device

Area512 runs on two devices. Use the one the person names. If they do not say,
ask whether they have the Cardputer or the ESP32-2432S028 (a board with a 2.8
inch touch screen, also called CYD). The device decides every row below, so use
one column for the whole app.

| | Cardputer | ESP32-2432S028 |
|---|---|---|
| Input | its keyboard | touching the screen; see "The 2432S028" |
| Ruby memory per app | 100 KB | 80 KB |
| MCP server | `picoruby-ti` | `picoruby-ti-2432s028` |
| Signatures | `docs/reference/sig/` | `docs/reference/sig-2432s028/` |
| Examples | `docs/reference/examples/` | `docs/reference/examples-2432s028/` |
| Emulator for you | `emulator-browser` | `emulator-browser-2432s028` |
| Emulator for the person | `emulator`, http://localhost:8080 | `emulator-2432s028`, http://localhost:8081 |
| Sending | `area512-send apps/<name>` | `area512-send --board 2432s028 apps/<name>` |

The commands below are written for the Cardputer. For the 2432S028, put the
service names of its column in their place, for example
`docker compose exec -T emulator-browser-2432s028 area512 screenshot`.

## The steps

1. Agree on what the app does, in the person's words. See "Talking with the
   person who asked" in `AGENTS.md`. Settle which device it is for: see "Which
   device".
2. Start the tools, once per session:

   ```sh
   docker compose build     # the first time takes several minutes
   docker compose up -d emulator-browser
   ```

   For the 2432S028:

   ```sh
   docker compose build emulator-2432s028 emulator-browser-2432s028 picoruby-ti-mcp-2432s028
   docker compose up -d emulator-browser-2432s028
   ```

3. Create `apps/<name>/` with `main.manifest` and `.ti-loader.manifest`.
4. Look up what you need: read "Where things are", then the closest example.
5. Write the code, checking each method with the MCP.
6. Draw the images, if the app has any. See "Images".
7. Do a light check. See "Check the app".
8. Tell the person how to try it: `docker compose up -d emulator`, then
   http://localhost:8080. For the 2432S028: `docker compose up -d
   emulator-2432s028`, then http://localhost:8081.
9. Put it on the device when they ask. See "Put it on the device".

## Where things are

| You need | Look in |
|---|---|
| Classes and methods, with argument types | the MCP (the `.rbs` files only when it is not connected) |
| What each API is for | `docs/reference/ruby-api.md` |
| Screens, lists, menus, dialogs, colors | `docs/reference/widget-api.md` |
| A small game: board, keys, drawing | `docs/reference/examples/bomb/` |
| Saving data, many files | `docs/reference/examples/solitair/` |
| A calendar or list tool, dates | `docs/reference/examples/scheduler/` |
| Text entry, documents | `docs/reference/examples/writer/` |
| Every Widget in use | `docs/reference/examples/gallery/` |
| Filer, editor and dot editor keys | `docs/reference/device/*.md` |
| A bot and the app it plays | `bots/snake.mjs`, `apps/snake/` |
| 2432S028: touch buttons and taps on a board | `docs/reference/examples-2432s028/bomb/` |
| 2432S028: drawing by dragging | `docs/reference/examples-2432s028/paint/` |
| 2432S028: text entry with the soft keyboard | `docs/reference/examples-2432s028/writer/` |
| 2432S028: saving data, many files | `docs/reference/examples-2432s028/solitair/` |
| 2432S028: a calendar or list tool | `docs/reference/examples-2432s028/scheduler/` |

## Check that a method exists

Before you write a call, list the methods of the receiver's class. **If a method
is not in the list, it does not exist.** Never write one from memory.

Use the MCP server of the device: `picoruby-ti` for the Cardputer,
`picoruby-ti-2432s028` for the 2432S028. Only the 2432S028's knows `Touch` and
the window methods of `Display`.

| picoruby-ti MCP tool | Use |
|---|---|
| `classes(file_path)` | Classes available to that file |
| `methods(file_path, class_name)` | Methods of a class, with signatures |
| `hover(file_path, line, character)` | The signature at a place in your code |
| `completion(file_path, line, character)` | What can follow a `.` at that place |

`file_path` is relative to the project root, like `apps/foo/main.rb`. An absolute
path from your machine is not found: the server runs in a container. `line` and
`character` count from 0.

- Do not use `diagnostic`.
- `methods` also lists what every object inherits. Call it for `"Object"` and
  ignore those names to see what the class itself adds.
- `methods` on a class of your own leaves out each method whose return type it
  cannot work out. Read your own code for those.

The tools are often deferred: listed by name only, with no schema. That is
connected, not missing. Load them once per session with ToolSearch, then call
them:

```
ToolSearch("select:mcp__picoruby-ti__classes,mcp__picoruby-ti__methods,mcp__picoruby-ti__hover,mcp__picoruby-ti__completion")
```

While the MCP server runs, a hook blocks reading the signature files. Only if
ToolSearch finds no picoruby-ti tool, read `docs/reference/sig/*.rbs`
(2432S028: `docs/reference/sig-2432s028/*.rbs`), which is what they are built
from.

## App files

```text
apps/mygame/
├── main.manifest       # the compiled files, in load order
├── .ti-loader.manifest # the same list of .rb files, for the MCP
├── const.rb
├── render.rb
├── main.rb             # ends by starting the app: MyGame.new.run
├── image.h             # optional start screen, shown for 3 seconds
└── ship.a5d            # optional dot image
```

```text
# main.manifest          # .ti-loader.manifest
const.mrb                const.rb
render.mrb               render.rb
main.mrb                 main.rb
```

`main.manifest` loads the listed `.mrb` files top to bottom in one VM, so one class
can be reopened across files. The last file starts the app.

`.ti-loader.manifest` is for the MCP and the device's editor: they read the listed
files first, then the file being edited. Without it they cannot see your own
classes. Both lists keep the same order.

### Split by role

Each file is compiled on its own, in the same memory the VM uses: 100 KB on the
Cardputer, 80 KB on the 2432S028. An app grows by adding files to the manifests. Split by role (constants, input,
logic, drawing, saving, `main`) and keep each file the size of the apps that ship
with Area512: their largest is 165 lines with 14 methods, and `solitair` is 11
files. A file far denser than that does not give a compile error: **the device
crashes with "Out of memory"**. The 2432S028 has 20 KB less, so keep its files
and data smaller than the Cardputer's.

### Memory budget

Measured in the Cardputer emulator. Plan with these numbers before you write a
large app; finding them out while building costs hours.

- Every file in the manifest stays loaded for the whole run. Its bytecode, its
  methods and every object the app makes share one memory. About 70 KB of it is
  left for them. Estimate a file's cost as its `.mrb` size plus about 42 bytes
  for each method, block and lambda.
- A large app is split into apps from the start (see the next section).
- In a chain of apps, each app loads its own copy of every file it lists. Files
  that every app needs (constants, tables, save and load) are paid for in each
  app, so keep them small.
- Fewer, larger methods cost less than many small ones, and fewer files cost
  less than many tiny ones. `require` costs nothing measurable.
- Long string literals stay in memory. Keep messages short. Keep a large table
  as one packed string and read a row when it is needed.
- Garbage runs out too. Building a long string or array with repeated `+=`, or
  splitting a long text into hundreds of small strings at once, can exhaust the
  memory although the code fits. Append to one string with `<<`, and read
  numbers out of a text in place.
- A long computation fills the memory as it runs, although every file fits:
  a game that simulates many stages, turns or items in one launch can stop
  with "Out of memory" partway. Plan it from the start to run a few steps per
  launch: keep its state in a file under `/data`, and let the app start
  itself again with `Area512.run_next` until it is done (see "Hand off to
  another app"). Each launch starts with the memory empty.
- When "Out of memory" appears, change the structure (split the app into
  more apps, run fewer steps per launch, keep tables packed) instead of
  searching for what fills the memory: the search costs hours, the split
  minutes.
- In the emulator, running out of memory may not print "Out of memory": the
  screen stays black and the browser reports `Aborted()`. A black screen right
  after loading means the app does not fit.
- To see how much is left, load the files, then make filler objects until the
  app stops, and count them.

### Hand off to another app

When one app cannot fit in the memory, even split by role, split it into apps
and switch between them with `Area512.run_next(path)`: when the current app
returns, the file manager runs `path` right away.

Put each part in a subfolder of the app, never next to it as another app
(`apps/<name>-battle/`): an app is installed and published as one folder.

```text
apps/<name>/            # the app the person starts: /home/apps/<name>
├── main.manifest
├── main.rb             # Area512.run_next("/home/apps/<name>/battle")
└── battle/             # a part: /home/apps/<name>/battle
    ├── main.manifest
    └── main.rb         # Area512.run_next("/home/apps/<name>") to go back
```

Each subfolder has its own `main.manifest` and `.ti-loader.manifest`, and is
compiled on its own: `docker compose run --rm compiler apps/<name>/battle`.
Pass what the next app needs through a file under `/data` with `SD.write`, and
read it back with `SD.read`. See "Area512" in `docs/reference/ruby-api.md`.

### require

Most built-ins need a `require`:

| Class | `require` |
|---|---|
| `Display`, `Sprite`, `BandedSprite` | `'area512-sprite'` |
| `Widget`, `WidgetList`, `WidgetTextView` | `'area512-widget'` |
| `Dot` | `'area512-dot'` |
| `Touch` (2432S028) | `'area512-touch'` |
| `RNG` | `'rng'` |
| `STDIN.raw`, `getch`, `read_nonblock` | `'io/console'` |
| `GPIO` / `I2C` / `SPI` / `ADC` | `'gpio'` / `'i2c'` / `'spi'` / `'adc'` |
| `Time` | `'time'` |
| `Machine`, `SD`, `File`, `Dir`, `Sandbox` | Loaded already |

### The Cardputer

- The screen is 240x135. `Display.width` and `Display.height` give it.
- There is no mouse or touch, and arrow keys need Fn. Prefer `h j k l` or
  `w a s d`, and also accept the bare arrow keys `;` `.` `,` `/`.
- Read keys with `STDIN.getch` inside `STDIN.raw` when the app waits for a key, or
  with `STDIN.raw!` and `STDIN.read_nonblock(1)` in a game that keeps moving. Put
  the terminal back with `STDIN.cooked!` in an `ensure`.
- Draw with `BandedSprite.new(12)` and `while sprite.draw; render; end`: `render`
  runs once per band of the screen and draws everything each time.
- `/` in a Ruby path is the card's data folder. Your app is at
  `/home/apps/<name>`. Save data with `SD.write(path, text)` and `SD.read(path)`
  under `/data`. `File` cannot write.
- Put constants under your class with `unless const_defined?(:NAME)`, as
  `apps/snake/const.rb` does: runs share one VM.

### The 2432S028

What is not listed here is as on the Cardputer: drawing, files, `/data`, one VM.

- The app draws in a 240x135 window, as on the Cardputer: `Display.width` and
  `Display.height` are 240 and 135. The screen around it is 320x240, and the
  file manager's frame stays around the window.
- There is no keyboard. The person touches the screen, so every action needs a
  place to tap: a button, or a spot on the app's own board.
- Put the app's commands in **a column of buttons right of the window**, as every
  app that ships for the 2432S028 does:
  1. Copy `touch_button_column.rb` from `docs/reference/examples-2432s028/bomb/`
     and change its class to yours. Add it to both manifests before the files
     that use it.
  2. At the start of `run`, move the window left so the column fits:
     `Display.move_window(12, Display.read_window_top_without_soft_keyboard)`,
     then `push_touch_button_column(-1)`.
  3. `show_touch_button_column(["FLAG", "NEW", "QUIT"])` draws the buttons, top
     to bottom. `set_touch_button_on(index, true)` lights one, for a mode such as
     FLAG. A label fits 8 letters; the shipped apps use 1 to 5 buttons, and
     `scheduler/touch.rb` shows another set on each screen.
  4. Always have a QUIT button: there is no Esc key.
- Read touches with `read_touch_event` from that file, in the loop where a
  Cardputer app reads keys. It returns `nil` when nothing happened,
  `["BUTTON", index, 0]` for a button, and otherwise the event of `Touch.read`:
  `["TAP", x, y]`, `["DRAG", x, y]` while a finger moves, `["RELEASE", x, y]`
  when it lifts. `x` and `y` are in window coordinates, the ones you draw with.
  Sleep 10 ms with `sleep_ms` between reads. `bomb/io.rb` turns a tap into the
  cell under it, and `paint/io.rb` draws while dragging.
- For typing, `Touch.open_keyboard` shows the soft keyboard below the window
  and moves the window up; `Touch.close_keyboard` hides it. Draw the app again
  after either. The keys arrive on `STDIN`, read with `STDIN.read_nonblock(1)`
  in `STDIN.raw`. `writer/touch.rb` has a `Kbd` button that opens and closes
  it, and `run_with_soft_keyboard`, which keeps it open only around a
  `Widget.input` (`writer/files.rb`).

### Python

Write Ruby. The MCP covers only Ruby. In the emulator, a built-in called on a
class with an argument, such as `Display.fill_screen(color)`, raises `TypeError:
argument has wrong type`.

## Images

Run these from the project root. Paths are relative to it.

```sh
docker compose run --rm assets dot apps/mygame/ship.txt apps/mygame/ship.a5d
docker compose run --rm assets dot apps/mygame/rock.png apps/mygame/rock.a5d
docker compose run --rm assets splash title.png apps/mygame/image.h
docker compose run --rm assets preview apps/mygame/ship.a5d screenshots/ship.png
```

### Dot images (`.a5d`)

A dot image has up to 15 colors plus transparent, and an even width. Draw one in a
text file, or use a PNG where transparent pixels stay transparent.

```text
palette
R #E04030
W #FFFFFF
pixels
..RR..
.RWWR.
..RR..
hitbox
......
.xxxx.
......
```

`.` is transparent. The `hitbox` section is optional. Keep only the `.a5d` in
`apps/`: every file there is copied to the card.

```ruby
require 'area512-sprite'
require 'area512-dot'

ship = Dot.load("/home/apps/mygame/ship.a5d")
ship.push(sprite, x, y)                               # on a Sprite or BandedSprite
Dot.overlap?(ship, x, y, rock, rock_x, rock_y)        # do painted dots touch?
Dot.overlap?(ship, x, y, rock, rock_x, rock_y, true)  # do hitboxes touch?
ship.delete
```

`Dot.overlap?` with `true` needs a hitbox in both images. It is false otherwise.
Only 32x32 images open in the device's dot editor.

### Start screen (`image.h`)

`splash` takes a 240x135 PNG and keeps black and white only, so use strong shapes.
The device paints it in the theme's colors and shows it for 3 seconds before the
app starts.

## The emulator

It has the same filer, compiler and Ruby memory as the device. Each command is one
call:

```sh
docker compose exec -T emulator-browser area512 reboot
docker compose exec -T emulator-browser area512 key t
docker compose exec -T emulator-browser area512 type 'cd /home/apps/mygame'
docker compose exec -T emulator-browser area512 key enter
docker compose exec -T emulator-browser area512 screenshot
docker compose exec -T emulator-browser area512 serial
docker compose exec -T emulator-browser area512 errors
docker compose exec -T emulator-browser area512 bot bots/mygame.mjs
```

- `reboot` loads the current `apps/` and empties the card of what the last run
  saved. Do it after each edit.
- `key` taps keys in order: a character, `enter`, `backspace`, `tab`, `space`, `esc`,
  `up`, `down`, `left`, `right`, `fn`, `ctrl`, `shift`, `opt`, `alt`. `+` holds keys
  together: `ctrl+c`.
- `screenshot` saves `screenshots/screen.png`, or the path you give under
  `/workspace/screenshots/`. Open the file and look at it.
- `serial` prints what `puts` wrote. `errors` prints crashes of the emulator.

To compile and run by hand, press `t` from the file list for the terminal:

```text
cd /home/apps/mygame
compile --all
cd ..
run mygame
```

`compile --all` stops at the first error. A Ruby error while an app runs is shown
on the screen.

### The 2432S028 emulator

Run the same commands in `emulator-browser-2432s028`. Coordinates are screen
pixels of the 320x240 screenshot, not window coordinates: take a screenshot and
tap where you see the button.

```sh
docker compose exec -T emulator-browser-2432s028 area512 tap 280 60
docker compose exec -T emulator-browser-2432s028 area512 drag 40 100 200 100
```

- `tap X Y` touches the screen briefly. `drag X1 Y1 X2 Y2` moves a finger from
  one point to the other.
- `type` and `key` send what the soft keyboard would, without drawing it, and
  work also while it is closed. `key` has `enter`, `backspace`, `tab`,
  `space`, `esc`, `up`, `down`, `left`, `right`, characters, and `ctrl+` a key.
  There is no `fn`, `shift`, `opt` or `alt`.
- `key t` in the file list opens the terminal, as tapping `TRM` does.

### What the emulator does not have

The emulator has no Bluetooth or app images, and `recv` does nothing. Pins keep what you write
to them, and I2C and SPI answer nothing. Timing is not the device's: check speed on
the device.

## Check the app

Unless the person asks for more, a light check is enough:

1. Compile and run the app. `compile --all` must succeed.
2. Press the keys of its main action. On the 2432S028, tap its buttons and its
   board instead.
3. Look at one screenshot, and run `area512 errors`.

Stop there and report. Do not play it to the end, repeat runs or write a bot.

## Test deeper with a bot

Only when the person asks for deeper testing, write a bot in `bots/<name>.mjs`. A
bot plays the app the way a person would: it reads the screen, presses keys, and
throws an error when the app misbehaves. `bots/snake.mjs` is a full example.

```js
export default async function run(emulator) {
  await emulator.compileAndRunApp('mygame');   // boot, compile, run

  await emulator.key('j', 'space');            // tap keys
  await emulator.sleep(200);

  const screen = await emulator.readScreen();  // the screen at this moment
  const [red, green, blue] = screen.pixel(120, 60);

  if (red < 200) {
    throw new Error('the cursor did not move');
  }

  await emulator.screenshot('mygame-playing'); // screenshots/mygame-playing.png
}
```

On the 2432S028, `emulator.tap(x, y)` and `emulator.drag(x1, y1, x2, y2)` touch
the screen in screen pixels, and `readScreen` reads the 320x240 screen. Run the
bot in `emulator-browser-2432s028`.

```sh
docker compose exec -T emulator-browser area512 bot bots/mygame.mjs
```

The command fails when the bot throws or the emulator crashed, and then saves
`screenshots/bot-failure.png`. The object also has `type(text)`, `serial()`,
`errors()` and `reboot()`. A bot runs inside the container, fast enough to react to
a game step by step, which separate `area512 key` commands are not.

Check rules and numbers that need many tries with a logic test instead (next
section); a bot checks what the screen shows.

A bot should cover what the person asked to test, check each result on the screen,
and use the colors of your `render`. A panel can hide what is under it, and the
screen can be read in the middle of a redraw.

Never leave `puts`, `print`, `p`, `pp` or `printf` in an app, not for debugging
and not for a bot: what the app prints is drawn on the screen over its window,
and the screen flickers. A bot reads results from the screen, not from `serial()`.

## Test the logic without the screen

Only when the person asks for deeper testing. What the rules and numbers of the
app decide (random setups, odds, physics, what an opponent chooses, difficulty,
scores, which choice pays off over many tries) does not need the screen: run
the app's own code many times in a **logic test** and count. Keep the screen
and the bot for what is drawn, how it moves, and what keys do.

A logic test runs outside the emulator, with PicoRuby built for this machine
from the firmware's own source: the same VM and the same numbers, but no 100 KB
limit and no frames to wait for, so thousands of tries take seconds.

```sh
docker compose build picoruby     # once
docker compose run --rm picoruby apps/mygame tests/mygame/test_rules.rb
```

It loads, as one program: stand-ins for the device's screen, keyboard, card and
pins (every method does nothing and returns nil), the app's files in the order
of its `main.manifest`, and the test files. The last line of the app's last
file, which starts the app (`MyGame.new.run`), is left out, so the test creates
the object and calls its methods. The app's files are read, never changed.

```ruby
# test_rules.rb
game = MyGame.new
wins = 0
200.times do
  game.new_round
  wins += 1 if game.resolve(:safe) == :win
end
puts "safe wins #{wins}/200"
```

- Never write the app's logic again in a test, and never replace a method the
  test is about: a test of a rewritten copy proves nothing about the app.
- Only the PicoRuby methods exist, as on the device: check them as the guide
  says. An error names a line of the joined program; the run prints which
  lines came from which file.
- It does not find "Out of memory": the screen tests in the emulator do.
- For this to work, keep each rule in a method that takes values and returns
  or stores a result, without drawing, reading keys or waiting. The game loop
  calls these methods and then draws. Creating the app object and setting up
  its state (`MyGame.new`, then the method `run` calls first) must not draw or
  wait either.
- End the app's last file with the one line that starts the app.

## Put it on the device

You do this when the person asks for it. First ask the person to connect the
Cardputer by USB, press `t` in the file list for the terminal, type `recv` and press
Enter. The Cardputer then shows "Receiving over USB. Esc to exit" and waits. Send
only after that.

For the 2432S028, ask the person to connect it by USB, tap `TRM` in the file list,
type `recv` on the soft keyboard and tap `Enter`.

```sh
docker compose run --rm compiler apps/mygame    # writes the .mrb files
bin/area512-send-linux-amd64 apps/mygame        # sends the folder
bin/area512-send-linux-amd64 --board 2432s028 apps/mygame   # to the 2432S028
```

Run the tool for the computer you are on, outside Docker:

| Computer | Tool |
|---|---|
| Linux | `bin/area512-send-linux-amd64`, `bin/area512-send-linux-arm64` |
| Mac | `bin/area512-send-darwin-arm64`, `bin/area512-send-darwin-amd64` |
| Windows | `bin\area512-send-windows-amd64.exe`, `bin\area512-send-windows-arm64.exe` |

The tool copies the app to `/home/apps/<name>`. If it reports several serial
ports, pass the right one with `--port`. Then tell the person to open `/home/apps`,
select the app and press `R`. On the 2432S028, they select the app's folder and
tap `RUN`.

The person can also send an app by themselves from the emulator page in Chrome or
Edge, under "Send to the device".
