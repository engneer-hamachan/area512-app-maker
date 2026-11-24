# PicoRuby for this machine, to run an app's logic tests outside the emulator.
# Same source, VM (femtoruby, mruby/c) and number settings as the Cardputer
# firmware (components/area512/build_config/area512.rb), with three changes:
# - memory comes from malloc, so a test is not bound by the device's 100 KB;
# - it runs on POSIX, so `picoruby file.rb` prints to the terminal;
# - only the gems a logic test needs: no screen, keyboard, SD or pins.
MRuby::Build.new do |conf|
  conf.toolchain

  conf.cc.defines << 'PICORB_PLATFORM_POSIX'
  conf.cc.defines << 'MRBC_TICK_UNIT=10'
  conf.cc.defines << 'MRBC_TIMESLICE_TICK_COUNT=1'
  conf.cc.defines << 'MRBC_USE_FLOAT=2'
  conf.cc.defines << 'MRBC_CONVERT_CRLF=1'
  conf.cc.defines << 'PICORB_INT64'
  conf.cc.defines << 'NDEBUG'
  conf.cc.defines << 'MAX_SYMBOLS_COUNT=2000'
  conf.femtoruby(alloc_libc: true)

  conf.gembox 'minimum'
  conf.gembox 'core'
  conf.gem core: 'picoruby-metaprog'
  conf.gem core: 'picoruby-rng'
  conf.gem core: 'picoruby-env'
end
