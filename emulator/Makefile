# Compiles the firmware sources around libmruby.a and links them for the browser.
# Called by build.sh, which has already built libmruby.a.

SOURCE := $(AREA512_SOURCE_PATH)
EMULATOR := $(AREA512_EMULATOR_PATH)
OUTPUT := $(AREA512_EMULATOR_OUTPUT_PATH)

COMPONENTS := $(SOURCE)/components
AREA512 := $(COMPONENTS)/area512
HAL := $(COMPONENTS)/area512_hal
MICROPYTHON := $(COMPONENTS)/area512_micropython
MICROPYTHON_EMBED := $(MICROPYTHON)/micropython_embed
TREE_SITTER := $(COMPONENTS)/area512_tree_sitter
M5GFX := $(COMPONENTS)/m5gfx/src
PICORUBY := $(SOURCE)/R2P2-ESP32/components/picoruby-esp32/picoruby
PICORUBY_GEMS := $(PICORUBY)/mrbgems
PICORUBY_BUILD := $(PICORUBY)/build/wasm-femtoruby
PORT := $(EMULATOR)/port
OBJECTS := $(OUTPUT)/objects
WEB := $(OUTPUT)/web

COMMON_FLAGS := -O2 -pthread -DNDEBUG -DESP32_PLATFORM -DPICORB_VM_MRUBYC \
  -DPICORB_INT64 -DMRBC_INT64 -DMRBC_TICK_UNIT=10 \
  -DMRBC_TIMESLICE_TICK_COUNT=1 -DMRBC_USE_FLOAT=2 -DMRC_CUSTOM_ALLOC \
  -DMRBC_CONVERT_CRLF=1 -DMRBC_USE_ALLOC_PROF -DMRBC_NO_STDIO -DDISABLE_MRUBY \
  -DMRBC_SCHEDULER_EXIT=1 -DMRBC_USE_MATH=1 -DMAX_SYMBOLS_COUNT=2000 \
  -DMAX_VM_COUNT=255 -DMAX_REGS_SIZE=255 -DLGFX_LINUX_FB -D__linux__ \
  -Wno-format -Wno-unused-function -Wno-implicit-function-declaration \
  -Wno-int-conversion -Wno-incompatible-pointer-types -Wno-deprecated-declarations

INCLUDE_FLAGS := -I$(PORT)/include -I$(OUTPUT)/generated -I$(M5GFX) -I$(M5GFX)/lgfx -I$(AREA512) \
  -I$(HAL)/include -I$(HAL)/console -I$(HAL)/gfx \
  -I$(PICORUBY)/include -I$(PICORUBY)/include/picoruby \
  -I$(PICORUBY_GEMS)/picoruby-mrubyc/include \
  -I$(PICORUBY_GEMS)/picoruby-mrubyc/lib/mrubyc/src \
  -I$(PICORUBY_GEMS)/picoruby-machine/include \
  -I$(PICORUBY_GEMS)/picoruby-io-console/include \
  -I$(PICORUBY_GEMS)/picoruby-gpio/include \
  -I$(PICORUBY_GEMS)/picoruby-adc/include \
  -I$(PICORUBY_GEMS)/picoruby-i2c/include \
  -I$(PICORUBY_GEMS)/picoruby-spi/include \
  -I$(PICORUBY_GEMS)/picoruby-rng/include \
  -I$(PICORUBY_GEMS)/picoruby-watchdog/include \
  -I$(PICORUBY_GEMS)/picoruby-env/include \
  -I$(PICORUBY_GEMS)/picoruby-require/include \
  -I$(PICORUBY_GEMS)/mruby-compiler2/include \
  -I$(PICORUBY_GEMS)/mruby-compiler2/lib/prism/include \
  -I$(PICORUBY_BUILD)/mrbgems \
  -I$(AREA512)/mrbgems/micropython-ti/include \
  -I$(AREA512)/mrbgems/picoruby-area512-sandbox/src \
  -I$(AREA512)/mrbgems/picoruby-area512-compile/src \
  -I$(AREA512)/mrbgems/picoruby-area512-edit/src \
  -I$(AREA512)/mrbgems/picoruby-area512-dot/src \
  -I$(AREA512)/mrbgems/picoruby-area512-repl/src \
  -I$(AREA512)/mrbgems/picoruby-area512-widget/src \
  -I$(AREA512)/mrbgems/picoruby-area512-filer/src \
  -I$(MICROPYTHON) -I$(MICROPYTHON)/include -I$(MICROPYTHON_EMBED) \
  -I$(MICROPYTHON_EMBED)/port \
  -I$(TREE_SITTER)/tree-sitter/lib/include \
  -I$(TREE_SITTER)/tree-sitter/lib/src \
  -I$(TREE_SITTER)/tree-sitter-python/bindings/c \
  -I$(TREE_SITTER)/tree-sitter-python/src

FIRMWARE_SOURCES := \
  $(AREA512)/area512.c \
  $(AREA512)/area512_arena.c \
  $(AREA512)/area512_ruby_vm.c \
  $(AREA512)/filer_shell.c \
  $(AREA512)/ports/tree_sitter_port.c \
  $(AREA512)/ports/machine_port.c \
  $(PICORUBY_GEMS)/picoruby-machine/ports/common/machine.c \
  $(PICORUBY_GEMS)/picoruby-io-console/ports/esp32/io-console.c \
  $(PICORUBY_GEMS)/picoruby-env/ports/esp32/env.c \
  $(PICORUBY_GEMS)/picoruby-rng/ports/esp32/rng.c \
  $(PICORUBY_GEMS)/picoruby-watchdog/ports/esp32/watchdog.c \
  $(PICORUBY_GEMS)/picoruby-require/ports/esp32/platform.c \
  $(HAL)/console/input.cpp \
  $(HAL)/console/keyboard.cpp \
  $(HAL)/console/getch.cpp \
  $(HAL)/console/output.c \
  $(HAL)/console/system_metrics.cpp \
  $(HAL)/gfx/area512_display.cpp \
  $(HAL)/gfx/area512_gfx.cpp \
  $(HAL)/gfx/area512_crt.cpp \
  $(HAL)/sd/area512_data_path.c \
  $(HAL)/sd/area512_manifest.c \
  $(HAL)/sd/area512_seed.c \
  $(HAL)/theme/area512_theme.c \
  $(HAL)/ui/area512_default_ui.c \
  $(HAL)/ui/area512_next_app.c \
  $(HAL)/animation/area512_animation_timer.c \
  $(HAL)/animation/filer_cursor_animation.c \
  $(HAL)/animation/filer_terminal_cursor_animation.c \
  $(HAL)/animation/filer_window_box.c \
  $(HAL)/animation/filer_window_open_animation.c \
  $(HAL)/animation/filer_window_close_animation.c

PORT_SOURCES := $(wildcard $(PORT)/src/*.c) $(wildcard $(PORT)/src/*.cpp)

M5GFX_SOURCES := \
  $(wildcard $(M5GFX)/lgfx/v1/*.cpp) \
  $(wildcard $(M5GFX)/lgfx/v1/misc/*.cpp) \
  $(M5GFX)/lgfx/v1/panel/Panel_Device.cpp \
  $(M5GFX)/lgfx/v1/panel/Panel_FrameBufferBase.cpp \
  $(M5GFX)/lgfx/v1/platforms/framebuffer/common.cpp \
  $(wildcard $(M5GFX)/lgfx/utility/*.c) \
  $(M5GFX)/lgfx/Fonts/efont/lgfx_efont_ja.c

TREE_SITTER_SOURCES := \
  $(TREE_SITTER)/tree-sitter/lib/src/lib.c \
  $(TREE_SITTER)/tree-sitter-python/src/parser.c \
  $(TREE_SITTER)/tree-sitter-python/src/scanner.c

MICROPYTHON_SOURCES := \
  $(wildcard $(MICROPYTHON)/*.c) \
  $(wildcard $(MICROPYTHON)/modules/*.c) \
  $(wildcard $(MICROPYTHON_EMBED)/py/*.c) \
  $(MICROPYTHON_EMBED)/shared/runtime/gchelper_generic.c \
  $(MICROPYTHON_EMBED)/port/embed_util.c

SOURCES := $(FIRMWARE_SOURCES) $(PORT_SOURCES) $(M5GFX_SOURCES) \
  $(TREE_SITTER_SOURCES) $(MICROPYTHON_SOURCES)

# Each source's full path under $(OBJECTS) keeps same-named files apart.
OBJECT_FILES := $(patsubst %,$(OBJECTS)%.o,$(SOURCES)) $(OBJECTS)/area512_seed_tar.o

TREE_SITTER_FLAGS := -DHAVE_ENDIAN_H=1 -DTREE_SITTER_REUSE_ALLOCATOR \
  -D_POSIX_C_SOURCE=200112L -D_DEFAULT_SOURCE -D_BSD_SOURCE

$(OBJECTS)$(TREE_SITTER)/%.c.o: CFLAGS_FOR_SOURCE := $(TREE_SITTER_FLAGS)

LINK_FLAGS := -O2 -pthread -sPROXY_TO_PTHREAD -sPTHREAD_POOL_SIZE=8 \
  -sINITIAL_MEMORY=256MB -sSTACK_SIZE=8MB -sDEFAULT_PTHREAD_STACK_SIZE=2MB \
  -sEXIT_RUNTIME=0 -sFORCE_FILESYSTEM=1 \
  -sEXPORTED_RUNTIME_METHODS=FS,HEAPU8,addRunDependency,removeRunDependency \
  -sEXPORTED_FUNCTIONS=_main,_area512_emulator_framebuffer,_area512_emulator_is_keyboard_configured,_area512_emulator_push_key_event \
  -sENVIRONMENT=web,worker

all: $(WEB)/area512.js

$(WEB)/area512.js: $(OBJECT_FILES) $(PICORUBY_BUILD)/lib/libmruby.a
	@mkdir -p $(@D)
	emcc $(LINK_FLAGS) -o $@ $(OBJECT_FILES) $(PICORUBY_BUILD)/lib/libmruby.a

$(OBJECTS)/%.c.o: /%.c
	@mkdir -p $(@D)
	emcc -std=gnu17 $(COMMON_FLAGS) $(CFLAGS_FOR_SOURCE) $(INCLUDE_FLAGS) -c $< -o $@

$(OBJECTS)/%.cpp.o: /%.cpp
	@mkdir -p $(@D)
	em++ -std=gnu++17 -fno-exceptions -fno-rtti $(COMMON_FLAGS) $(INCLUDE_FLAGS) -c $< -o $@

# The seed staging of components/area512_hal/CMakeLists.txt for the Cardputer's
# built-in display, as one object that defines the symbols area512_seed.c needs.
$(OUTPUT)/area512_seed.tar: $(EMULATOR)/seed.sh
	sh $(EMULATOR)/seed.sh $(SOURCE)/storage $(OUTPUT)/seed_staging $@

$(OBJECTS)/area512_seed_tar.o: $(OUTPUT)/area512_seed.tar $(PORT)/seed_tar.c
	@mkdir -p $(@D)
	emcc -O2 -pthread -DAREA512_SEED_TAR_PATH=\"$(OUTPUT)/area512_seed.tar\" -c $(PORT)/seed_tar.c -o $@
