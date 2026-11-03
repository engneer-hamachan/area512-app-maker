#pragma once

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
  ESP_RST_POWERON,
  ESP_RST_TASK_WDT,
} esp_reset_reason_t;

// Reloads the page, which boots the emulator again.
void esp_restart(void);

static inline esp_reset_reason_t esp_reset_reason(void) {
  return ESP_RST_POWERON;
}

#ifdef __cplusplus
}
#endif
