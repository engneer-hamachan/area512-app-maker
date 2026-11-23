// FreeRTOS mutexes used by Area512, implemented on a pthread mutex
// (src/freertos_queue_port.c).
#pragma once

#include <freertos/FreeRTOS.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct area512_emulator_semaphore *SemaphoreHandle_t;

SemaphoreHandle_t xSemaphoreCreateMutex(void);
BaseType_t xSemaphoreTake(SemaphoreHandle_t semaphore, TickType_t wait_tick_count);
BaseType_t xSemaphoreGive(SemaphoreHandle_t semaphore);

#ifdef __cplusplus
}
#endif
