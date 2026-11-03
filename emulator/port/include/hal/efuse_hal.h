#pragma once

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

void efuse_hal_get_mac(uint8_t *mac_address);

#ifdef __cplusplus
}
#endif
