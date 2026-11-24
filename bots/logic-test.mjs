// Runs a logic test app (see "Test the logic without the screen" in
// docs/app-development.md) and prints what it wrote between its
// "### begin" and "### done" lines. Run it with:
//   docker compose exec -T -e TEST_APP=mygame_test emulator-browser area512 bot bots/logic-test.mjs
// TEST_APP names the test app under apps/. TEST_COMPILE_MS (default 8000) is
// how long its compile may take, and TEST_TIMEOUT_MS (default 600000) how
// long the tests may run.
const BEGIN_LINE = '### begin';
const DONE_LINE = '### done';
const POLL_MILLISECONDS = 1000;
// The test app writes "### begin" first, before any test; without it by then,
// it failed to load.
const BEGIN_TIMEOUT_MILLISECONDS = 60000;
// A Ruby error or a crash of the test app stops it before "### done".
const FAILURE_PATTERN = /Error|Out of memory|Aborted/;

export default async function run(emulator) {
  const testAppName = process.env.TEST_APP;
  if (!testAppName) {
    throw new Error('set TEST_APP to the test app under apps/, e.g. -e TEST_APP=mygame_test');
  }
  const compileMilliseconds = Number(process.env.TEST_COMPILE_MS) || 8000;
  const timeoutMilliseconds = Number(process.env.TEST_TIMEOUT_MS) || 600000;

  await emulator.compileAndRunApp(testAppName, compileMilliseconds);

  const startedAt = Date.now();
  for (;;) {
    const serialText = await emulator.serial();
    const errorText = await emulator.errors();
    const beginIndex = serialText.lastIndexOf(BEGIN_LINE);
    const doneIndex = serialText.lastIndexOf(DONE_LINE);

    if (beginIndex >= 0 && doneIndex > beginIndex) {
      console.log(serialText.slice(beginIndex, doneIndex + DONE_LINE.length));
      console.log(`(ran ${Math.round((Date.now() - startedAt) / 1000)} s)`);
      return;
    }
    const sinceBegin = beginIndex >= 0 ? serialText.slice(beginIndex) : '';
    const notStarted = beginIndex < 0 && Date.now() - startedAt > BEGIN_TIMEOUT_MILLISECONDS;
    if (errorText || notStarted || FAILURE_PATTERN.test(sinceBegin)) {
      await emulator.screenshot(`${testAppName}-failure`);
      console.log(serialText.slice(-4000));
      throw new Error(`${testAppName} stopped with an error or did not start; the screen is in screenshots/${testAppName}-failure.png\n${errorText}`);
    }
    if (Date.now() - startedAt > timeoutMilliseconds) {
      await emulator.screenshot(`${testAppName}-timeout`);
      console.log(serialText.slice(-4000));
      throw new Error(`${testAppName} did not write "${DONE_LINE}" within ${timeoutMilliseconds} ms; the screen is in screenshots/${testAppName}-timeout.png`);
    }
    await emulator.sleep(POLL_MILLISECONDS);
  }
}
