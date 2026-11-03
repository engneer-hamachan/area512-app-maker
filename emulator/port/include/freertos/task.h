#pragma once

#include <freertos/FreeRTOS.h>

#ifdef __cplusplus
extern "C" {
#endif

void vTaskDelay(TickType_t tick_count);
// Only ends the calling task: Area512 passes NULL.
void vTaskDelete(TaskHandle_t task);
TickType_t xTaskGetTickCount(void);
UBaseType_t uxTaskGetStackHighWaterMark(TaskHandle_t task);
BaseType_t xTaskCreate(
  TaskFunction_t task_function,
  const char *task_name,
  uint32_t stack_byte_size,
  void *task_parameter,
  UBaseType_t priority,
  TaskHandle_t *created_task
);

#ifdef __cplusplus
}
#endif
