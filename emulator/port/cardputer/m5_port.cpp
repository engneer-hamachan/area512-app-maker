// Draws into a framebuffer that the page copies to a canvas, and answers the
// keyboard driver the way the Cardputer ADV's TCA8418 does.
#include "console_internal.h"

#include <M5Unified.hpp>

#include <lgfx/v1/Bus.hpp>
#include <lgfx/v1/panel/Panel_FrameBufferBase.hpp>

#include <atomic>
#include <emscripten/emscripten.h>
#include <stdint.h>

// The Cardputer ADV's ST7789 after M5Unified rotates it.
static constexpr int DISPLAY_WIDTH = 240;
static constexpr int DISPLAY_HEIGHT = 135;
static constexpr int PIXEL_BYTE_SIZE = 2;

static constexpr uint8_t TCA8418_DEVICE_ADDRESS = 0x34;
static constexpr uint8_t TCA8418_REGISTER_CONFIGURATION = 0x01;
static constexpr uint8_t TCA8418_REGISTER_INTERRUPT_STATUS = 0x02;
static constexpr uint8_t TCA8418_REGISTER_KEY_EVENT_A = 0x04;
static constexpr uint8_t TCA8418_INTERRUPT_KEY = 0x01;
static constexpr uint8_t TCA8418_KEY_PRESSED_BIT = 0x80;

// Larger than the chip's 10-event FIFO so that scripted typing is never lost.
static constexpr uint32_t KEY_EVENT_QUEUE_LENGTH = 256;
// A battery that reads full, the top of the voltage table in system_metrics.cpp.
static constexpr int16_t EMULATED_BATTERY_MILLIVOLTS = 4190;

EmulatedM5 M5;

alignas(4) static uint8_t
  s_framebuffer[DISPLAY_WIDTH * DISPLAY_HEIGHT * PIXEL_BYTE_SIZE];
static uint8_t *s_framebuffer_rows[DISPLAY_HEIGHT];

class BrowserPanel : public lgfx::Panel_FrameBufferBase {
public:
  BrowserPanel(void) {
    auto panel_config = config();

    panel_config.memory_width = DISPLAY_WIDTH;
    panel_config.memory_height = DISPLAY_HEIGHT;
    panel_config.panel_width = DISPLAY_WIDTH;
    panel_config.panel_height = DISPLAY_HEIGHT;
    panel_config.offset_rotation = 0;
    config(panel_config);

    for (int row = 0; row < DISPLAY_HEIGHT; row++)
      s_framebuffer_rows[row] = &s_framebuffer[row * DISPLAY_WIDTH * PIXEL_BYTE_SIZE];

    _lines_buffer = s_framebuffer_rows;
    _write_depth = lgfx::rgb565_2Byte;
    _read_depth = lgfx::rgb565_2Byte;

    setBus(&s_null_bus);
  }

private:
  static lgfx::Bus_NULL s_null_bus;
};

lgfx::Bus_NULL BrowserPanel::s_null_bus;

static BrowserPanel s_browser_panel;

void
EmulatedM5::begin(EmulatedM5Config config) {
  (void)config;

  Display.setPanel(&s_browser_panel);
  Display.init();
}

int16_t
EmulatedPower::getBatteryVoltage(void) {
  return EMULATED_BATTERY_MILLIVOLTS;
}

// C++ linkage, as console_internal.h declares it.
void
area512_bluetooth_poll_keyboard(void) {}

static uint8_t s_key_events[KEY_EVENT_QUEUE_LENGTH];
static std::atomic<uint32_t> s_key_event_write_count{0};
static std::atomic<uint32_t> s_key_event_read_count{0};

static uint8_t s_selected_register;
static std::atomic<uint8_t> s_configuration_register{0};
static bool s_i2c_transaction_addressed_keyboard;

static bool
has_key_event(void) {
  return s_key_event_read_count.load() != s_key_event_write_count.load();
}

static uint8_t
pop_key_event(void) {
  if (!has_key_event())
    return 0;

  uint32_t read_count = s_key_event_read_count.load();
  uint8_t key_event = s_key_events[read_count % KEY_EVENT_QUEUE_LENGTH];

  s_key_event_read_count.store(read_count + 1);

  return key_event;
}

bool
EmulatedInternalI2c::start(
  uint8_t device_address,
  bool read,
  uint32_t frequency
) {

  (void)read;
  (void)frequency;

  s_i2c_transaction_addressed_keyboard =
    device_address == TCA8418_DEVICE_ADDRESS;

  return s_i2c_transaction_addressed_keyboard;
}

bool
EmulatedInternalI2c::write(const uint8_t *bytes, size_t byte_count) {
  if (!s_i2c_transaction_addressed_keyboard || byte_count == 0)
    return false;

  s_selected_register = bytes[0];

  if (byte_count > 1 && s_selected_register == TCA8418_REGISTER_CONFIGURATION)
    s_configuration_register.store(bytes[1]);

  return true;
}

bool
EmulatedInternalI2c::read(uint8_t *bytes, size_t byte_count, bool last_nack) {
  (void)last_nack;

  if (!s_i2c_transaction_addressed_keyboard)
    return false;

  for (size_t byte_index = 0; byte_index < byte_count; byte_index++) {
    switch (s_selected_register) {
    case TCA8418_REGISTER_CONFIGURATION:
      bytes[byte_index] = s_configuration_register.load();
      break;
    case TCA8418_REGISTER_INTERRUPT_STATUS:
      bytes[byte_index] = has_key_event() ? TCA8418_INTERRUPT_KEY : 0;
      break;
    case TCA8418_REGISTER_KEY_EVENT_A:
      bytes[byte_index] = pop_key_event();
      break;
    default:
      bytes[byte_index] = 0;
      break;
    }
  }

  return true;
}

bool
EmulatedInternalI2c::stop(void) {
  return true;
}

extern "C" EMSCRIPTEN_KEEPALIVE uint8_t *
area512_emulator_framebuffer(void) {
  return s_framebuffer;
}

// keyboard_init drops the events queued before it, so a key is only safe to
// send once the firmware has configured the controller.
extern "C" EMSCRIPTEN_KEEPALIVE int
area512_emulator_is_keyboard_configured(void) {
  return s_configuration_register.load() != 0;
}

// Called by the page with the key codes of cardputer_lookup_key.
extern "C" EMSCRIPTEN_KEEPALIVE void
area512_emulator_push_key_event(int key_code, int pressed) {
  uint32_t write_count = s_key_event_write_count.load();

  if (write_count - s_key_event_read_count.load() >= KEY_EVENT_QUEUE_LENGTH)
    return;

  s_key_events[write_count % KEY_EVENT_QUEUE_LENGTH] =
    (uint8_t)key_code | (pressed ? TCA8418_KEY_PRESSED_BIT : 0);

  s_key_event_write_count.store(write_count + 1);
}
