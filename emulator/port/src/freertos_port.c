// FreeRTOS tasks become pthreads and esp_timer becomes a pthread that sleeps.
//
// The firmware pins the VM and the tick task to one core and guards shared
// state by disabling interrupts. Threads here really run at the same time, so
// disabling interrupts takes a lock that the timer callback also holds.
#include <esp_err.h>
#include <esp_heap_caps.h>
#include <esp_random.h>
#include <esp_sleep.h>
#include <esp_system.h>
#include <esp_timer.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <hal/efuse_hal.h>
#include <rom/ets_sys.h>

#include <emscripten/em_asm.h>
#include <emscripten/emscripten.h>
#include <pthread.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "area512_task_replacement.h"

#define TASK_STACK_BYTE_SIZE (8 * 1024 * 1024)
#define MICROSECONDS_PER_MILLISECOND 1000
#define MINIMUM_DELAY_MICROSECONDS 1000

// Not measured on a device. Malloc here is never short of memory, so the free
// size only sets what the SYS panel shows and the MicroPython GC heap: 224 KiB
// minus its 32 KiB margin is MICROPYTHON_GC_HEAP_MAXIMUM_BYTE_SIZE, the largest
// heap the firmware can give an app.
#define EMULATED_TOTAL_HEAP_BYTE_SIZE (320 * 1024)
#define EMULATED_FREE_HEAP_BYTE_SIZE (224 * 1024)

struct area512_emulator_timer {
  void (*callback)(void *argument);
  void *callback_argument;
  uint64_t period_microseconds;
};

typedef struct {
  TaskFunction_t task_function;
  void *task_parameter;
} TaskStart;

static pthread_mutex_t s_interrupt_lock;
static pthread_once_t s_interrupt_lock_once = PTHREAD_ONCE_INIT;

static void
init_interrupt_lock(void) {
  pthread_mutexattr_t attributes;

  pthread_mutexattr_init(&attributes);
  pthread_mutexattr_settype(&attributes, PTHREAD_MUTEX_RECURSIVE);
  pthread_mutex_init(&s_interrupt_lock, &attributes);
  pthread_mutexattr_destroy(&attributes);
}

void
area512_emulator_disable_interrupts(void) {
  pthread_once(&s_interrupt_lock_once, init_interrupt_lock);
  pthread_mutex_lock(&s_interrupt_lock);
}

void
area512_emulator_enable_interrupts(void) {
  pthread_mutex_unlock(&s_interrupt_lock);
}

static void *
run_task(void *argument) {
  TaskStart task_start = *(TaskStart *)argument;

  free(argument);
  task_start.task_function(task_start.task_parameter);

  return NULL;
}

static void
start_task_thread(TaskFunction_t task_function, void *task_parameter) {
  TaskStart *task_start = malloc(sizeof(TaskStart));
  pthread_attr_t attributes;
  pthread_t thread;

  task_start->task_function = task_function;
  task_start->task_parameter = task_parameter;

  pthread_attr_init(&attributes);
  pthread_attr_setstacksize(&attributes, TASK_STACK_BYTE_SIZE);
  pthread_attr_setdetachstate(&attributes, PTHREAD_CREATE_DETACHED);

  if (pthread_create(&thread, &attributes, run_task, task_start) != 0)
    abort();

  pthread_attr_destroy(&attributes);
}

BaseType_t
xTaskCreate(
  TaskFunction_t task_function,
  const char *task_name,
  uint32_t stack_byte_size,
  void *task_parameter,
  UBaseType_t priority,
  TaskHandle_t *created_task
) {

  (void)task_name;
  (void)stack_byte_size;
  (void)priority;
  (void)created_task;

  start_task_thread(task_function, task_parameter);

  return pdPASS;
}

void
area512_start_replaceable_task(
  const char *task_name,
  TaskFunction_t task_function,
  void *task_parameter
) {

  (void)task_name;

  start_task_thread(task_function, task_parameter);
}

// The firmware replaces the task to reuse one static stack. Each task has its
// own stack here, so the old thread only has to end.
void
area512_replace_current_task(
  const char *task_name,
  TaskFunction_t task_function,
  void *task_parameter
) {

  (void)task_name;

  start_task_thread(task_function, task_parameter);
  pthread_exit(NULL);
}

void
vTaskDelete(TaskHandle_t task) {
  (void)task;

  pthread_exit(NULL);
}

void
vTaskDelay(TickType_t tick_count) {
  uint64_t microseconds =
    (uint64_t)tick_count * portTICK_PERIOD_MS * MICROSECONDS_PER_MILLISECOND;

  usleep(
    microseconds > 0 ? microseconds : MINIMUM_DELAY_MICROSECONDS
  );
}

TickType_t
xTaskGetTickCount(void) {
  return (TickType_t)(esp_timer_get_time() /
                      (portTICK_PERIOD_MS * MICROSECONDS_PER_MILLISECOND));
}

UBaseType_t
uxTaskGetStackHighWaterMark(TaskHandle_t task) {
  (void)task;

  return AREA512_SHARED_STACK_BYTE_SIZE;
}

esp_err_t
esp_timer_create(
  const esp_timer_create_args_t *create_args,
  esp_timer_handle_t *created_timer
) {

  esp_timer_handle_t timer = malloc(sizeof(struct area512_emulator_timer));

  timer->callback = create_args->callback;
  timer->callback_argument = create_args->arg;
  timer->period_microseconds = 0;
  *created_timer = timer;

  return ESP_OK;
}

static void
run_periodic_timer(void *argument) {
  esp_timer_handle_t timer = argument;

  for (;;) {
    usleep(timer->period_microseconds);

    area512_emulator_disable_interrupts();
    timer->callback(timer->callback_argument);
    area512_emulator_enable_interrupts();
  }
}

esp_err_t
esp_timer_start_periodic(
  esp_timer_handle_t timer,
  uint64_t period_microseconds
) {

  timer->period_microseconds = period_microseconds;
  start_task_thread(run_periodic_timer, timer);

  return ESP_OK;
}

int64_t
esp_timer_get_time(void) {
  return (int64_t)(emscripten_get_now() * MICROSECONDS_PER_MILLISECOND);
}

static uint64_t s_light_sleep_microseconds;

esp_err_t
esp_sleep_enable_timer_wakeup(uint64_t microseconds) {
  s_light_sleep_microseconds = microseconds;

  return ESP_OK;
}

esp_err_t
esp_light_sleep_start(void) {
  usleep(s_light_sleep_microseconds);

  return ESP_OK;
}

void
ets_delay_us(uint32_t microseconds) {
  usleep(microseconds);
}

void
efuse_hal_get_mac(uint8_t *mac_address) {
  memset(mac_address, 0x51, 6);
}

uint32_t
esp_random(void) {
  uint32_t random_value;

  if (getentropy(&random_value, sizeof(random_value)) != 0)
    abort();

  return random_value;
}

size_t
heap_caps_get_total_size(uint32_t capabilities) {
  (void)capabilities;

  return EMULATED_TOTAL_HEAP_BYTE_SIZE;
}

size_t
heap_caps_get_free_size(uint32_t capabilities) {
  (void)capabilities;

  return EMULATED_FREE_HEAP_BYTE_SIZE;
}

size_t
heap_caps_get_largest_free_block(uint32_t capabilities) {
  (void)capabilities;

  return EMULATED_FREE_HEAP_BYTE_SIZE;
}

void *
heap_caps_malloc(size_t byte_size, uint32_t capabilities) {
  (void)capabilities;

  return malloc(byte_size);
}

void
heap_caps_free(void *pointer) {
  free(pointer);
}

void
esp_restart(void) {
  MAIN_THREAD_ASYNC_EM_ASM({ location.reload(); });

  for (;;)
    usleep(MICROSECONDS_PER_MILLISECOND * MICROSECONDS_PER_MILLISECOND);
}
