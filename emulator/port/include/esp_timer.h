#pragma once

#include <stdint.h>

#include <esp_err.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct area512_emulator_timer *esp_timer_handle_t;

typedef enum {
  ESP_TIMER_TASK,
} esp_timer_dispatch_t;

typedef struct {
  void (*callback)(void *argument);
  void *arg;
  esp_timer_dispatch_t dispatch_method;
  const char *name;
} esp_timer_create_args_t;

esp_err_t esp_timer_create(
  const esp_timer_create_args_t *create_args,
  esp_timer_handle_t *created_timer
);
esp_err_t esp_timer_start_periodic(
  esp_timer_handle_t timer,
  uint64_t period_microseconds
);
int64_t esp_timer_get_time(void);

#ifdef __cplusplus
}
#endif
