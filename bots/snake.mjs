// Plays apps/snake on the emulator by reading the screen, one snake step at a
// time, and fails if the game does not behave. Run it with:
//   docker compose exec -T emulator-browser area512 bot bots/snake.mjs
const APP_NAME = 'snake';
const CELL_SIZE = 6;
const COLUMN_COUNT = 39;
const ROW_COUNT = 19;
const BOARD_LEFT = 3;
const BOARD_TOP = 15;
const START_LENGTH = 4;
const FOOD_TO_EAT = 3;
const GAME_OVER_PANEL_X = 120;
const GAME_OVER_PANEL_Y = 80;
const PANEL_RED_LIMIT = 80;
const TIMEOUT_MILLISECONDS = 40000;
const POLL_MILLISECONDS = 5;

const KEY_FOR_DIRECTION = { '0,-1': 'k', '0,1': 'j', '-1,0': 'h', '1,0': 'l' };

const cellKey = (column, row) => `${column},${row}`;

async function readBoard(emulator) {
  const screen = await emulator.readScreen();
  const snakeCells = new Set();
  let food = null;

  for (let row = 0; row < ROW_COUNT; row++) {
    for (let column = 0; column < COLUMN_COUNT; column++) {
      const x = BOARD_LEFT + column * CELL_SIZE + 2;
      const y = BOARD_TOP + row * CELL_SIZE + 2;
      const [red, green, blue] = screen.pixel(x, y);

      if (red > 230 && green > 200 && blue < 130) {
        snakeCells.add(cellKey(column, row));
      } else if (red > 230 && green > 70 && green < 120 && blue < 30) {
        food = [column, row];
      }
    }
  }

  // Only the panel paints this spot: on the board it is the gap between rows.
  // The panel can hide the whole snake, so isGameOver cannot rely on seeing it.
  const [panelRed] = screen.pixel(GAME_OVER_PANEL_X, GAME_OVER_PANEL_Y);
  const isGameOver = panelRed > 0 && panelRed < PANEL_RED_LIMIT;

  return { snakeCells, food, isGameOver };
}

// Waits for the snake to move and returns the cell its head entered.
async function waitForNextHead(emulator, previousCells) {
  const deadline = Date.now() + TIMEOUT_MILLISECONDS;

  for (;;) {
    const board = await readBoard(emulator);
    const newCells = [...board.snakeCells].filter((cell) => !previousCells.has(cell));

    if (newCells.length > 0 || board.isGameOver) {
      return { ...board, head: newCells.at(-1)?.split(',').map(Number) ?? null };
    }

    if (Date.now() > deadline) {
      throw new Error('the snake stopped moving');
    }

    await emulator.sleep(POLL_MILLISECONDS);
  }
}

function isSafeCell(column, row, snakeCells) {
  return column >= 0 && column < COLUMN_COUNT && row >= 0 && row < ROW_COUNT &&
    !snakeCells.has(cellKey(column, row));
}

// Of going straight and turning either way, the safe move that ends nearest the
// food. Going straight wins a tie, so the snake does not wander.
function chooseDirection(head, direction, food, snakeCells) {
  const leftTurn = [direction[1], -direction[0]];
  const rightTurn = [-direction[1], direction[0]];
  let bestDirection = direction;
  let bestDistance = Infinity;

  for (const candidate of [direction, leftTurn, rightTurn]) {
    const column = head[0] + candidate[0];
    const row = head[1] + candidate[1];
    const distance = Math.abs(food[0] - column) + Math.abs(food[1] - row);

    if (isSafeCell(column, row, snakeCells) && distance < bestDistance) {
      bestDirection = candidate;
      bestDistance = distance;
    }
  }

  return bestDirection;
}

async function eatFood(emulator) {
  let board = await readBoard(emulator);
  let head = null;
  let food = board.food;
  let direction = [1, 0];

  while (board.snakeCells.size < START_LENGTH + FOOD_TO_EAT) {
    board = await waitForNextHead(emulator, board.snakeCells);

    if (board.isGameOver) {
      throw new Error('the snake died while heading for food');
    }

    if (head && Math.abs(board.head[0] - head[0]) + Math.abs(board.head[1] - head[1]) === 1) {
      direction = [board.head[0] - head[0], board.head[1] - head[1]];
    }

    head = board.head;

    // The screen can be read in the middle of a redraw, when food is not there.
    food = board.food ?? food;

    const nextDirection = chooseDirection(head, direction, food, board.snakeCells);

    if (nextDirection.join() !== direction.join()) {
      await emulator.key(KEY_FOR_DIRECTION[nextDirection.join()]);
    }
  }

  return { board, direction };
}

// Turning twice the same way, then once more, leads the head into the body.
async function hitOwnBody(emulator, startingBoard, direction) {
  const rightTurn = [-direction[1], direction[0]];
  const backward = [-direction[0], -direction[1]];
  const leftTurn = [direction[1], -direction[0]];
  let board = startingBoard;

  for (const turn of [rightTurn, backward, leftTurn]) {
    await emulator.key(KEY_FOR_DIRECTION[turn.join()]);
    board = await waitForNextHead(emulator, board.snakeCells);
  }

  await emulator.sleep(400);

  return readBoard(emulator);
}

export default async function run(emulator) {
  await emulator.compileAndRunApp(APP_NAME);
  await emulator.key('r');
  await emulator.sleep(50);

  const { board, direction } = await eatFood(emulator);

  console.log(`ate ${FOOD_TO_EAT}: snake length ${board.snakeCells.size}`);
  await emulator.screenshot('snake-ate-food');

  const finalBoard = await hitOwnBody(emulator, board, direction);

  if (!finalBoard.isGameOver) {
    throw new Error('hitting its own body did not end the game');
  }

  console.log('hit own body: game over');
  await emulator.screenshot('snake-game-over');
  await emulator.key('r');
  await emulator.sleep(300);

  const retryBoard = await readBoard(emulator);

  if (retryBoard.isGameOver || retryBoard.snakeCells.size < START_LENGTH) {
    throw new Error('r did not start a new game');
  }

  console.log('r: new game started');
  await emulator.key('q');
  await emulator.sleep(800);
  await emulator.screenshot('snake-quit');
}
