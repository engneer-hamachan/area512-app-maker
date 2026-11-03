// The firmware reads these to report memory and to bound the MicroPython GC.
#pragma once

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define MALLOC_CAP_8BIT (1 << 2)
#define MALLOC_CAP_DMA (1 << 3)
#define MALLOC_CAP_INTERNAL (1 << 11)

size_t heap_caps_get_total_size(uint32_t capabilities);
size_t heap_caps_get_free_size(uint32_t capabilities);
size_t heap_caps_get_largest_free_block(uint32_t capabilities);
void *heap_caps_malloc(size_t byte_size, uint32_t capabilities);
void heap_caps_free(void *pointer);

#ifdef __cplusplus
}
#endif
