// picoruby-gpio, -adc, -i2c and -spi ports with nothing wired to them. Pins keep
// the level written to them, and buses report that no device answered.
#include "adc.h"
#include "gpio.h"
#include "i2c.h"
#include "spi.h"

#include <string.h>

#define GPIO_PIN_COUNT 49
#define I2C_NO_DEVICE_ANSWERED -1
#define SPI_NO_DEVICE_ANSWERED -1

static uint8_t s_gpio_levels[GPIO_PIN_COUNT];

int
GPIO_pin_num_from_char(const uint8_t *pin_name) {
  (void)pin_name;

  return -1;
}

void GPIO_init(uint8_t pin) { (void)pin; }

void
GPIO_set_dir(uint8_t pin, uint8_t direction) {
  (void)pin;
  (void)direction;
}

void GPIO_pull_up(uint8_t pin) { (void)pin; }
void GPIO_pull_down(uint8_t pin) { (void)pin; }
void GPIO_open_drain(uint8_t pin) { (void)pin; }

int
GPIO_read(uint8_t pin) {
  return pin < GPIO_PIN_COUNT ? s_gpio_levels[pin] : 0;
}

void
GPIO_write(uint8_t pin, uint8_t level) {
  if (pin < GPIO_PIN_COUNT)
    s_gpio_levels[pin] = level;
}

void
GPIO_set_function(uint8_t pin, uint8_t function) {
  (void)pin;
  (void)function;
}

int
ADC_pin_num_from_char(const uint8_t *pin_name) {
  (void)pin_name;

  return -1;
}

int
ADC_init(uint8_t pin) {
  (void)pin;

  return 0;
}

uint32_t
ADC_read_raw(uint8_t pin) {
  (void)pin;

  return 0;
}

picorb_float_t
ADC_read_voltage(uint8_t pin) {
  (void)pin;

  return 0;
}

int
I2C_unit_name_to_unit_num(const char *unit_name) {
  (void)unit_name;

  return 0;
}

i2c_status_t
I2C_gpio_init(int unit_number, uint32_t frequency, int8_t sda_pin, int8_t scl_pin) {
  (void)unit_number;
  (void)frequency;
  (void)sda_pin;
  (void)scl_pin;

  return 0;
}

int
I2C_read_timeout_us(
  int unit_number,
  uint8_t device_address,
  uint8_t *bytes,
  size_t byte_count,
  bool no_stop,
  uint32_t timeout_microseconds
) {

  (void)unit_number;
  (void)device_address;
  (void)bytes;
  (void)byte_count;
  (void)no_stop;
  (void)timeout_microseconds;

  return I2C_NO_DEVICE_ANSWERED;
}

int
I2C_write_timeout_us(
  int unit_number,
  uint8_t device_address,
  uint8_t *bytes,
  size_t byte_count,
  bool no_stop,
  uint32_t timeout_microseconds
) {

  (void)unit_number;
  (void)device_address;
  (void)bytes;
  (void)byte_count;
  (void)no_stop;
  (void)timeout_microseconds;

  return I2C_NO_DEVICE_ANSWERED;
}

int
SPI_unit_name_to_unit_num(const char *unit_name) {
  (void)unit_name;

  return 0;
}

spi_status_t
SPI_gpio_init(spi_unit_info_t *unit_info) {
  (void)unit_info;

  return 0;
}

int
SPI_read_blocking(
  spi_unit_info_t *unit_info,
  uint8_t *bytes,
  size_t byte_count,
  uint8_t repeated_byte
) {

  (void)unit_info;
  (void)repeated_byte;

  memset(bytes, 0, byte_count);

  return SPI_NO_DEVICE_ANSWERED;
}

int
SPI_write_blocking(spi_unit_info_t *unit_info, uint8_t *bytes, size_t byte_count) {
  (void)unit_info;
  (void)bytes;
  (void)byte_count;

  return SPI_NO_DEVICE_ANSWERED;
}

int
SPI_transfer(
  spi_unit_info_t *unit_info,
  uint8_t *sent_bytes,
  uint8_t *received_bytes,
  size_t byte_count
) {

  (void)unit_info;
  (void)sent_bytes;

  memset(received_bytes, 0, byte_count);

  return SPI_NO_DEVICE_ANSWERED;
}
