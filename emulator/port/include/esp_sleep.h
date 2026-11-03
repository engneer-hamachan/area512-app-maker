#pragma once

#include <stdint.h>

#include <esp_err.h>

#ifdef __cplusplus
extern "C" {
#endif

esp_err_t esp_sleep_enable_timer_wakeup(uint64_t microseconds);
esp_err_t esp_light_sleep_start(void);

#ifdef __cplusplus
}
#endif
