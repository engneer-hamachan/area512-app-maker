// Takes the place of components/area512_hal/cyd/gfx/area512_display.cpp for the
// ESP32-2432S028. The panel draws into a framebuffer that the page copies to a
// canvas, and the touch panel reports where the page's pointer is pressed.
//
// The panel is set up already turned to the 320x240 screen, so a touch point
// in screen coordinates is also the raw point, and the touch calibration of the
// touch setting screen is worked out in the same coordinates.
#include "area512_display.h"

#include "area512_hal.h"
#include "console_internal.h"

#include <lgfx/utility/pgmspace.h>
#include <lgfx/v1/Bus.hpp>
#include <lgfx/v1/LGFXBase.hpp>
#include <lgfx/v1/Touch.hpp>
#include <lgfx/v1/panel/Panel_FrameBufferBase.hpp>

#include <atomic>
#include <emscripten/emscripten.h>
#include <stdint.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "splash.h"

static constexpr int SCREEN_WIDTH = 320;
static constexpr int SCREEN_HEIGHT = 240;
static constexpr int PIXEL_BYTE_SIZE = 2;
static constexpr int SPLASH_LINE_DELAY_MS = 1;
static constexpr int SPLASH_HOLD_MS = 500;

// Larger than a line of typing, so that scripted typing is never lost.
static constexpr uint32_t TYPED_BYTE_QUEUE_LENGTH = 1024;

alignas(4) static uint8_t
  s_framebuffer[SCREEN_WIDTH * SCREEN_HEIGHT * PIXEL_BYTE_SIZE];
static uint8_t *s_framebuffer_rows[SCREEN_HEIGHT];

// The pressed point as touch_screen_x << 16 | touch_screen_y, or -1 when the
// page's pointer is up.
static std::atomic<int32_t> s_pressed_touch_point{-1};
static std::atomic<bool> s_is_touch_panel_polled{false};

static uint8_t s_typed_bytes[TYPED_BYTE_QUEUE_LENGTH];
static std::atomic<uint32_t> s_typed_byte_write_count{0};
static std::atomic<uint32_t> s_typed_byte_read_count{0};

// The bytes the page typed go to stdin when the touch panel is read: on the
// device the soft keyboard pushes its keys from the same read, so stdin keeps
// one writer.
static void
push_typed_bytes_to_stdin(void) {
  uint32_t read_count = s_typed_byte_read_count.load();

  while (read_count != s_typed_byte_write_count.load()) {
    if (!area512_console_stdin_push(
          s_typed_bytes[read_count % TYPED_BYTE_QUEUE_LENGTH]
        ))
      break;

    read_count++;
    s_typed_byte_read_count.store(read_count);
  }
}

class BrowserPanel : public lgfx::Panel_FrameBufferBase {
public:
  BrowserPanel(void) {
    auto panel_config = config();

    panel_config.memory_width = SCREEN_WIDTH;
    panel_config.memory_height = SCREEN_HEIGHT;
    panel_config.panel_width = SCREEN_WIDTH;
    panel_config.panel_height = SCREEN_HEIGHT;
    panel_config.offset_rotation = 0;
    config(panel_config);

    for (int row = 0; row < SCREEN_HEIGHT; row++)
      s_framebuffer_rows[row] =
        &s_framebuffer[row * SCREEN_WIDTH * PIXEL_BYTE_SIZE];

    _lines_buffer = s_framebuffer_rows;
    _write_depth = lgfx::rgb565_2Byte;
    _read_depth = lgfx::rgb565_2Byte;

    setBus(&s_null_bus);
  }

private:
  static lgfx::Bus_NULL s_null_bus;
};

lgfx::Bus_NULL BrowserPanel::s_null_bus;

class BrowserTouch : public lgfx::ITouch {
public:
  BrowserTouch(void) {
    auto touch_config = config();

    touch_config.x_min = 0;
    touch_config.x_max = SCREEN_WIDTH - 1;
    touch_config.y_min = 0;
    touch_config.y_max = SCREEN_HEIGHT - 1;
    touch_config.offset_rotation = 0;
    touch_config.bus_shared = false;
    config(touch_config);
  }

  bool init(void) override { return true; }
  void wakeup(void) override {}
  void sleep(void) override {}

  uint_fast8_t
  getTouchRaw(lgfx::touch_point_t *touch_points, uint_fast8_t count) override {
    s_is_touch_panel_polled.store(true);
    push_typed_bytes_to_stdin();

    int32_t pressed_touch_point = s_pressed_touch_point.load();

    if (count == 0 || pressed_touch_point < 0)
      return 0;

    touch_points[0].x = (int16_t)(pressed_touch_point >> 16);
    touch_points[0].y = (int16_t)(pressed_touch_point & 0xFFFF);
    touch_points[0].size = 1;
    touch_points[0].id = 0;

    return 1;
  }
};

static BrowserPanel s_panel;
static BrowserTouch s_touch;
static lgfx::LGFX_Device s_external_display;
static lgfx::LGFX_Device *s_display = nullptr;

extern "C" void
area512_display_draw_boot_splash(void) {
  if (!s_display || !epd_bitmap_allArray[0])
    return;

  area512_gfx_show_bitmap(
    epd_bitmap_allArray[0],
    SPLASH_LINE_DELAY_MS
  );

  vTaskDelay(pdMS_TO_TICKS(SPLASH_HOLD_MS));
}

extern "C" void
area512_display_init(void) {
  if (s_display)
    return;

  s_panel.setTouch(&s_touch);
  s_external_display.setPanel(&s_panel);
  s_external_display.init();
  s_display = &s_external_display;
  s_display->setColorDepth(16);

  s_display->fillScreen(area512_theme_background_color());
}

extern "C" void *
area512_display_device(void) {
  return s_display;
}

extern "C" bool
area512_display_read_raw_touch_point(int *raw_x, int *raw_y) {
  lgfx::touch_point_t touch_point;

  if (!s_display || s_display->getTouchRaw(&touch_point, 1) == 0)
    return false;

  *raw_x = touch_point.x;
  *raw_y = touch_point.y;

  return true;
}

extern "C" void
area512_display_convert_screen_to_touch_calibration_point(
  int screen_x,
  int screen_y,
  int *calibration_x,
  int *calibration_y
) {

  *calibration_x = screen_x;
  *calibration_y = screen_y;
}

extern "C" void
area512_display_read_touch_calibration_size(
  int *calibration_width,
  int *calibration_height
) {

  *calibration_width = SCREEN_WIDTH;
  *calibration_height = SCREEN_HEIGHT;
}

extern "C" void
area512_display_set_touch_calibration(
  const uint16_t calibration_values[AREA512_TOUCH_CALIBRATION_VALUE_COUNT]
) {

  if (!s_display)
    return;

  uint16_t mutable_calibration_values[AREA512_TOUCH_CALIBRATION_VALUE_COUNT];

  memcpy(
    mutable_calibration_values,
    calibration_values,
    sizeof(mutable_calibration_values)
  );

  s_display->setTouchCalibrate(mutable_calibration_values);
}

extern "C" void
area512_display_reset_touch_calibration(void) {
  s_panel.touchCalibrate();
}

extern "C" EMSCRIPTEN_KEEPALIVE uint8_t *
area512_emulator_framebuffer(void) {
  return s_framebuffer;
}

// The page waits for the first read of the touch panel before it types or
// touches: the filer is running from then on.
extern "C" EMSCRIPTEN_KEEPALIVE int
area512_emulator_is_touch_panel_polled(void) {
  return s_is_touch_panel_polled.load() ? 1 : 0;
}

extern "C" EMSCRIPTEN_KEEPALIVE void
area512_emulator_press_touch(int touch_screen_x, int touch_screen_y) {
  if (touch_screen_x < 0)
    touch_screen_x = 0;
  else if (touch_screen_x >= SCREEN_WIDTH)
    touch_screen_x = SCREEN_WIDTH - 1;

  if (touch_screen_y < 0)
    touch_screen_y = 0;
  else if (touch_screen_y >= SCREEN_HEIGHT)
    touch_screen_y = SCREEN_HEIGHT - 1;

  s_pressed_touch_point.store(touch_screen_x << 16 | touch_screen_y);
}

extern "C" EMSCRIPTEN_KEEPALIVE void
area512_emulator_release_touch(void) {
  s_pressed_touch_point.store(-1);
}

// Called by the page with the bytes the soft keyboard sends for each key.
extern "C" EMSCRIPTEN_KEEPALIVE void
area512_emulator_push_typed_byte(int typed_byte) {
  uint32_t write_count = s_typed_byte_write_count.load();

  if (write_count - s_typed_byte_read_count.load() >= TYPED_BYTE_QUEUE_LENGTH)
    return;

  s_typed_bytes[write_count % TYPED_BYTE_QUEUE_LENGTH] = (uint8_t)typed_byte;
  s_typed_byte_write_count.store(write_count + 1);
}
