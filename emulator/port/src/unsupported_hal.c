// Hardware the emulator does not have: Bluetooth, the OTA partition and the USB
// serial port. Each behaves like a device with nothing attached.
#include "area512_hal.h"

#include <stdio.h>

#define BLUETOOTH_UNAVAILABLE_MESSAGE "not available in the emulator"
#define APP_IMAGE_UNAVAILABLE_MESSAGE "Not available in the emulator"

void area512_bluetooth_load_config(void) {}
void area512_bluetooth_start_if_enabled(void) {}
bool area512_bluetooth_save_bonds(void) { return false; }
bool area512_bluetooth_is_running(void) { return false; }
bool area512_bluetooth_is_keyboard_connected(void) { return false; }
int area512_bluetooth_scan_keyboards(void) { return 0; }

const char *
area512_bluetooth_found_keyboard_label(int found_keyboard_index) {
  (void)found_keyboard_index;

  return "";
}

void
area512_bluetooth_start_pairing(int found_keyboard_index) {
  (void)found_keyboard_index;
}

void area512_bluetooth_cancel_pairing(void) {}

int
area512_bluetooth_pairing_state(void) {
  return AREA512_BLUETOOTH_PAIRING_FAILED;
}

uint32_t
area512_bluetooth_pairing_passkey(void) {
  return 0;
}

const char *
area512_bluetooth_pairing_failure_message(void) {
  return BLUETOOTH_UNAVAILABLE_MESSAGE;
}

void area512_usb_receive_files(void) {}
bool area512_usb_receive_owns_rxfifo(void) { return false; }

void area512_restore_factory_boot_partition(void) {}

int
area512_read_installed_app_name(char *name, size_t name_size) {
  (void)name;
  (void)name_size;

  return -1;
}

static int
write_app_image_unavailable(char *message, size_t message_size) {
  snprintf(message, message_size, APP_IMAGE_UNAVAILABLE_MESSAGE);

  return -1;
}

int
area512_install_app_image(
  const char *path,
  char *message,
  size_t message_size
) {

  (void)path;

  return write_app_image_unavailable(message, message_size);
}

int
area512_launch_installed_app(char *message, size_t message_size) {
  return write_app_image_unavailable(message, message_size);
}

int
area512_uninstall_app(char *message, size_t message_size) {
  return write_app_image_unavailable(message, message_size);
}
