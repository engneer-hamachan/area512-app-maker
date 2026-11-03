# Making an Area512 app

## The steps

1. Agree on what the app does, in the person's words. See "Talking with the
   person who asked" in `AGENTS.md`.
2. Start the tools, once per session:

   ```sh
   docker compose build     # the first time takes several minutes
   docker compose up -d emulator-browser
   ```

3. Create `apps/<name>/` with `main.manifest` and `.ti-loader.manifest`.
4. Look up what you need: read "Where things are", then the closest example.
5. Write the code, checking each method with the MCP.
6. Draw the images, if the app has any. See "Images".
7. Do a light check. See "Check the app".
8. Tell the person how to try it: `docker compose up -d emulator`, then
   http://localhost:8080.
9. Put it on the device when they ask. See "Put it on the device".

## Where things are

| You need | Look in |
|---|---|
| Classes and methods, with argument types | the MCP, or `docs/reference/sig/*.rbs` |
| What each API is for | `docs/reference/ruby-api.md` |
| Screens, lists, menus, dialogs, colors | `docs/reference/widget-api.md` |
| A small game: board, keys, drawing | `docs/reference/examples/bomb/` |
| Saving data, many files | `docs/reference/examples/solitair/` |
| A calendar or list tool, dates | `docs/reference/examples/scheduler/` |
| Text entry, documents | `docs/reference/examples/writer/` |
| Every Widget in use | `docs/reference/examples/gallery/` |
| Filer, editor and dot editor keys | `docs/reference/device/*.md` |
| A bot and the app it plays | `bots/snake.mjs`, `apps/snake/` |

## Check that a method exists

Before you write a call, list the methods of the receiver's class. **If a method
is not in the list, it does not exist.** Never write one from memory.

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

If the MCP tools are not connected, read `docs/reference/sig/*.rbs`, which is what
they are built from.

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

Each file is compiled on its own, in the same 100 KB of memory the VM uses, so an
app grows by adding files to the manifests. Split by role (constants, input,
logic, drawing, saving, `main`) and keep each file the size of the apps that ship
with Area512: their largest is 165 lines with 14 methods, and `solitair` is 11
files. A file far denser than that does not give a compile error: **the device
crashes with "Out of memory"**.

### require

Most built-ins need a `require`:

| Class | `require` |
|---|---|
| `Display`, `Sprite`, `BandedSprite` | `'area512-sprite'` |
| `Widget`, `WidgetList`, `WidgetTextView` | `'area512-widget'` |
| `Dot` | `'area512-dot'` |
| `RNG` | `'rng'` |
| `STDIN.raw`, `getch`, `read_nonblock` | `'io/console'` |
| `GPIO` / `I2C` / `SPI` / `ADC` | `'gpio'` / `'i2c'` / `'spi'` / `'adc'` |
| `Time` | `'time'` |
| `Machine`, `SD`, `File`, `Dir`, `Sandbox` | Loaded already |

### The device

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

The emulator has no Bluetooth or app images, and `recv` does nothing. Pins keep what you write
to them, and I2C and SPI answer nothing. Timing is not the device's: check speed on
the device.

## Check the app

Unless the person asks for more, a light check is enough:

1. Compile and run the app. `compile --all` must succeed.
2. Press the keys of its main action.
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

```sh
docker compose exec -T emulator-browser area512 bot bots/mygame.mjs
```

The command fails when the bot throws or the emulator crashed, and then saves
`screenshots/bot-failure.png`. The object also has `type(text)`, `serial()`,
`errors()` and `reboot()`. A bot runs inside the container, fast enough to react to
a game step by step, which separate `area512 key` commands are not.

A bot should cover what the person asked to test, check each result on the screen,
and use the colors of your `render`. A panel can hide what is under it, and the
screen can be read in the middle of a redraw.

## Put it on the device

You do this when the person asks for it. First ask the person to connect the
Cardputer by USB, press `t` in the file list for the terminal, type `recv` and press
Enter. The Cardputer then shows "Receiving over USB. Esc to exit" and waits. Send
only after that.

```sh
docker compose run --rm compiler apps/mygame    # writes the .mrb files
bin/area512-send-linux-amd64 apps/mygame        # sends the folder
```

Run the tool for the computer you are on, outside Docker:

| Computer | Tool |
|---|---|
| Linux | `bin/area512-send-linux-amd64`, `bin/area512-send-linux-arm64` |
| Mac | `bin/area512-send-darwin-arm64`, `bin/area512-send-darwin-amd64` |
| Windows | `bin\area512-send-windows-amd64.exe`, `bin\area512-send-windows-arm64.exe` |

The tool copies the app to `/home/apps/<name>`. If it reports several serial
ports, pass the right one with `--port`. Then tell the person to open `/home/apps`,
select the app and press `R`.

The person can also send an app by themselves from the emulator page in Chrome or
Edge, under "Send to the device".
