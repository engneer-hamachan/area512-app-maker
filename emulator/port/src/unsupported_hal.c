// Hardware the emulator does not have: the OTA partition and the USB serial
// port. Each behaves like a device with nothing attached.
#include "area512_hal.h"

#include <stdio.h>

#define APP_IMAGE_UNAVAILABLE_MESSAGE "Not available in the emulator"

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
