// Takes the place of app_main in main/main.c.
//
// On the device app_main returns and only its task ends. Returning from main
// here would call exit(), whose stdio cleanup keeps the stdio locks and blocks
// every other thread at its next fopen or puts, so this thread stays.
#include "area512.h"

#include <unistd.h>

#define IDLE_SLEEP_SECONDS 3600

int
main(void) {
  area512_main();

  for (;;)
    sleep(IDLE_SLEEP_SECONDS);
}
