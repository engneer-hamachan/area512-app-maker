// FreeRTOS API used by Area512, implemented on pthreads (src/freertos_port.c).
#pragma once

#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef uint32_t TickType_t;
typedef int32_t BaseType_t;
typedef uint32_t UBaseType_t;
typedef uint32_t StackType_t;
typedef void (*TaskFunction_t)(void *);
typedef struct area512_emulator_task *TaskHandle_t;

// CONFIG_FREERTOS_HZ=100 in the firmware's sdkconfig.
#define portTICK_PERIOD_MS 10
#define pdMS_TO_TICKS(milliseconds)                                            \
  ((TickType_t)((uint64_t)(milliseconds) / portTICK_PERIOD_MS))
#define tskIDLE_PRIORITY 0
#define pdPASS 1

void area512_emulator_disable_interrupts(void);
void area512_emulator_enable_interrupts(void);

#define portDISABLE_INTERRUPTS() area512_emulator_disable_interrupts()
#define portENABLE_INTERRUPTS() area512_emulator_enable_interrupts()

#ifdef __cplusplus
}
#endif
