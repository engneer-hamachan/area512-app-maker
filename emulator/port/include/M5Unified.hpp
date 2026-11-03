// The parts of M5Unified that Area512 reads: the display, the internal I2C bus
// that reaches the keyboard controller, and the battery voltage.
#pragma once

#include <lgfx/v1/LGFXBase.hpp>
#include <lgfx/v1/LGFX_Sprite.hpp>

#include <stddef.h>
#include <stdint.h>

class EmulatedInternalI2c {
public:
  bool start(uint8_t device_address, bool read, uint32_t frequency);
  bool write(const uint8_t *bytes, size_t byte_count);
  bool read(uint8_t *bytes, size_t byte_count, bool last_nack);
  bool stop(void);
};

class EmulatedPower {
public:
  int16_t getBatteryVoltage(void);
};

struct EmulatedM5Config {};

class EmulatedM5 {
public:
  EmulatedM5Config config(void) { return {}; }
  void begin(EmulatedM5Config config);

  lgfx::LGFX_Device Display;
  EmulatedInternalI2c In_I2C;
  EmulatedPower Power;
};

extern EmulatedM5 M5;
