// FreeRTOS queues used by Area512, implemented on a pthread mutex
// (src/freertos_queue_port.c).
#pragma once

#include <freertos/FreeRTOS.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct area512_emulator_queue *QueueHandle_t;

QueueHandle_t xQueueCreate(UBaseType_t item_count, UBaseType_t item_byte_size);
BaseType_t xQueueSend(
  QueueHandle_t queue,
  const void *item,
  TickType_t wait_tick_count
);
BaseType_t xQueueReceive(
  QueueHandle_t queue,
  void *item,
  TickType_t wait_tick_count
);
BaseType_t xQueueReset(QueueHandle_t queue);

#ifdef __cplusplus
}
#endif
