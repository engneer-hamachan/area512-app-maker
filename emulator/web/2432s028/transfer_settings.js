// How transfer.js reaches the 2432S028: the CH340 USB serial chip on its UART
// console, as tool/usb_send.py of area512 opens it.
'use strict';

const transferSettings = {
  deviceName: '2432S028',
  usbVendorIds: [0x1a86, 0x303a],
  // DTR and RTS of the CH340 reset the ESP32 or hold it in its bootloader.
  isResetSignalLoweredAfterOpen: true,
  receiveInstructions: 'Tap TRM in the file list, type recv and tap Enter.',
  runInstructions: (appName) => `open /home/apps, select ${appName} and tap RUN`,
};
