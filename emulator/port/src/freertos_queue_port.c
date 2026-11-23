// FreeRTOS queues and mutexes on pthreads.
//
// Area512 only polls a queue (a wait of 0 ticks), and takes a mutex either
// without waiting or until it is free (portMAX_DELAY). A queue wait of any other
// length is not implemented and stops the emulator.
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/semphr.h>

#include <pthread.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

struct area512_emulator_queue {
  pthread_mutex_t lock;
  uint8_t *item_bytes;
  UBaseType_t item_count;
  UBaseType_t item_byte_size;
  UBaseType_t first_item_index;
  UBaseType_t queued_item_count;
};

struct area512_emulator_semaphore {
  pthread_mutex_t lock;
};

static void
require_no_wait(TickType_t wait_tick_count) {
  if (wait_tick_count != 0)
    abort();
}

QueueHandle_t
xQueueCreate(UBaseType_t item_count, UBaseType_t item_byte_size) {
  QueueHandle_t queue = calloc(1, sizeof(struct area512_emulator_queue));

  if (queue == NULL)
    return NULL;

  queue->item_bytes = malloc((size_t)item_count * item_byte_size);

  if (queue->item_bytes == NULL) {
    free(queue);

    return NULL;
  }

  pthread_mutex_init(&queue->lock, NULL);
  queue->item_count = item_count;
  queue->item_byte_size = item_byte_size;

  return queue;
}

BaseType_t
xQueueSend(QueueHandle_t queue, const void *item, TickType_t wait_tick_count) {
  require_no_wait(wait_tick_count);
  pthread_mutex_lock(&queue->lock);

  if (queue->queued_item_count == queue->item_count) {
    pthread_mutex_unlock(&queue->lock);

    return errQUEUE_FULL;
  }

  UBaseType_t item_index =
    (queue->first_item_index + queue->queued_item_count) % queue->item_count;

  memcpy(
    queue->item_bytes + (size_t)item_index * queue->item_byte_size,
    item,
    queue->item_byte_size
  );

  queue->queued_item_count++;
  pthread_mutex_unlock(&queue->lock);

  return pdPASS;
}

BaseType_t
xQueueReceive(QueueHandle_t queue, void *item, TickType_t wait_tick_count) {
  require_no_wait(wait_tick_count);
  pthread_mutex_lock(&queue->lock);

  if (queue->queued_item_count == 0) {
    pthread_mutex_unlock(&queue->lock);

    return pdFALSE;
  }

  memcpy(
    item,
    queue->item_bytes + (size_t)queue->first_item_index * queue->item_byte_size,
    queue->item_byte_size
  );

  queue->first_item_index = (queue->first_item_index + 1) % queue->item_count;
  queue->queued_item_count--;
  pthread_mutex_unlock(&queue->lock);

  return pdTRUE;
}

BaseType_t
xQueueReset(QueueHandle_t queue) {
  pthread_mutex_lock(&queue->lock);
  queue->first_item_index = 0;
  queue->queued_item_count = 0;
  pthread_mutex_unlock(&queue->lock);

  return pdPASS;
}

SemaphoreHandle_t
xSemaphoreCreateMutex(void) {
  SemaphoreHandle_t semaphore =
    malloc(sizeof(struct area512_emulator_semaphore));

  if (semaphore != NULL)
    pthread_mutex_init(&semaphore->lock, NULL);

  return semaphore;
}

BaseType_t
xSemaphoreTake(SemaphoreHandle_t semaphore, TickType_t wait_tick_count) {
  if (wait_tick_count == portMAX_DELAY) {
    pthread_mutex_lock(&semaphore->lock);

    return pdTRUE;
  }

  require_no_wait(wait_tick_count);

  return pthread_mutex_trylock(&semaphore->lock) == 0 ? pdTRUE : pdFALSE;
}

BaseType_t
xSemaphoreGive(SemaphoreHandle_t semaphore) {
  pthread_mutex_unlock(&semaphore->lock);

  return pdTRUE;
}
