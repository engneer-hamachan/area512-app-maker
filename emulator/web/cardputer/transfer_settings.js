// How transfer.js reaches the Cardputer: its ESP32-S3's own USB serial port.
'use strict';

const transferSettings = {
  deviceName: 'Cardputer',
  usbVendorIds: [0x303a],
  // The CH340's reset wiring is not on the Cardputer.
  isResetSignalLoweredAfterOpen: false,
  receiveInstructions: 'Press t in the file list, type recv and press Enter.',
  runInstructions: (appName) => `open /home/apps, select ${appName} and press R`,
};
