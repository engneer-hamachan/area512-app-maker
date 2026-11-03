FROM emscripten/emsdk:6.0.5 AS wasm-tools

RUN apt-get update \
  && apt-get install -y --no-install-recommends ruby ruby-dev rake \
  && rm -rf /var/lib/apt/lists/* \
  && gem install rbs -v 3.10.0

FROM wasm-tools AS wasm-build

ARG AREA512_REF=main

WORKDIR /src

# M5Unified is replaced by emulator/port, and MicroPython's own submodules are
# hardware ports that the embed build does not use.
RUN git clone --depth 1 --branch "$AREA512_REF" \
    https://github.com/engneer-hamachan/area512.git \
  && cd area512 \
  && git submodule update --init --depth 1 --jobs 8 \
    components/m5gfx \
    components/micropython \
    components/area512/mrbgems/picoruby-ti \
    components/area512_tree_sitter/tree-sitter \
    components/area512_tree_sitter/tree-sitter-python \
  && git submodule update --init --recursive --depth 1 --jobs 8 R2P2-ESP32

COPY build.sh Makefile seed.sh /src/emulator/
COPY build_config /src/emulator/build_config
COPY port /src/emulator/port

RUN AREA512_SOURCE_PATH=/src/area512 \
    AREA512_EMULATOR_OUTPUT_PATH=/build \
    sh /src/emulator/build.sh

FROM python:3.13-slim

COPY --from=wasm-build /build/web /srv/emulator/web
COPY --from=wasm-build /src/area512/R2P2-ESP32/components/picoruby-esp32/picoruby/build/host/bin/picorbc /usr/local/bin/picorbc
COPY web /srv/emulator/web
COPY server.py compile_app.sh /srv/emulator/

EXPOSE 8080

CMD ["python3", "/srv/emulator/server.py"]
