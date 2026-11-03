# The gem set of components/area512/build_config/area512.rb, built with
# Emscripten. Hardware ports are provided by emulator/port.
area512_source_path = ENV.fetch('AREA512_SOURCE_PATH')
area512_component_path = "#{area512_source_path}/components/area512"
picoruby_gems_path = "#{area512_source_path}/R2P2-ESP32/components/picoruby-esp32/picoruby/mrbgems"

MRuby::CrossBuild.new('wasm-femtoruby') do |conf|
  conf.toolchain('clang')

  conf.cc.command = 'emcc'
  conf.linker.command = 'emcc'
  conf.archiver.command = 'emar'

  conf.cc.host_command = 'gcc'
  conf.cc.flags << '-O2'
  conf.cc.flags << '-pthread'
  conf.cc.flags << '-Wno-format'
  conf.cc.flags << '-Wno-unused-function'
  conf.cc.flags << '-Wno-implicit-function-declaration'
  conf.cc.flags << '-Wno-int-conversion'
  conf.cc.flags << '-Wno-incompatible-pointer-types'

  conf.cc.include_paths << "#{ENV.fetch('AREA512_EMULATOR_PORT_PATH')}/include"

  conf.cc.defines << 'MRBC_TICK_UNIT=10'
  conf.cc.defines << 'MRBC_TIMESLICE_TICK_COUNT=1'
  conf.cc.defines << 'MRBC_USE_FLOAT=2'
  conf.cc.defines << 'MRBC_CONVERT_CRLF=1'
  conf.cc.defines << 'ESP32_PLATFORM'
  conf.cc.defines << 'PICORB_INT64'
  conf.cc.defines << 'NDEBUG'
  conf.cc.defines << 'MAX_SYMBOLS_COUNT=2000'
  conf.cc.defines << 'TI_ARENA_SIZE=24576'
  conf.femtoruby(alloc_libc: false)

  conf.gem gemdir: "#{picoruby_gems_path}/mruby-compiler2"

  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-machine"
  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-mrubyc"
  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-io-console"

  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-require"

  conf.gem gemdir: "#{area512_component_path}/mrbgems/stubs/picoruby-vfs"
  conf.gem gemdir: "#{area512_component_path}/mrbgems/stubs/picoruby-littlefs"

  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-picorubyvm"
  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-time"
  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-watchdog"
  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-env"
  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-gpio"
  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-metaprog"

  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-sandbox"
  conf.gem gemdir: "#{area512_component_path}/mrbgems/picoruby-area512-sandbox"
  conf.gem gemdir: "#{area512_component_path}/mrbgems/picoruby-area512-compile"
  conf.gem gemdir: "#{area512_component_path}/mrbgems/picoruby-area512-micropython"

  conf.gem gemdir: "#{area512_component_path}/mrbgems/picoruby-ti"
  conf.gem gemdir: "#{area512_component_path}/mrbgems/micropython-ti"
  conf.gem gemdir: "#{area512_component_path}/mrbgems/picoruby-area512-edit"

  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-rng"
  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-i2c"
  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-adc"
  conf.gem gemdir: "#{picoruby_gems_path}/picoruby-spi"

  conf.gem gemdir: "#{area512_component_path}/mrbgems/picoruby-area512-sprite"
  conf.gem gemdir: "#{area512_component_path}/mrbgems/picoruby-area512-widget"
  conf.gem gemdir: "#{area512_component_path}/mrbgems/picoruby-area512-dot"
  conf.gem gemdir: "#{area512_component_path}/mrbgems/picoruby-area512-console"
  conf.gem gemdir: "#{area512_component_path}/mrbgems/picoruby-area512-repl"
  conf.gem gemdir: "#{area512_component_path}/mrbgems/picoruby-area512-filer"
  conf.gem gemdir: "#{area512_component_path}/mrbgems/picoruby-area512-sdfat"
end
