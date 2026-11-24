# PicoRuby built for this machine from the Area512 firmware's source, for
# logic tests (see "Test the logic without the screen" in docs/app-development.md).
FROM emscripten/emsdk:6.0.5

RUN apt-get update \
  && apt-get install -y --no-install-recommends ruby ruby-dev rake \
  && rm -rf /var/lib/apt/lists/*

ARG AREA512_REF=cyd

WORKDIR /src

RUN git clone --depth 1 --branch "$AREA512_REF" \
    https://github.com/engneer-hamachan/area512.git \
  && cd area512 \
  && git submodule update --init --recursive --depth 1 --jobs 8 R2P2-ESP32

COPY host.rb /src/host.rb

RUN cd /src/area512/R2P2-ESP32/components/picoruby-esp32/picoruby \
  && MRUBY_CONFIG=/src/host.rb rake \
  && cp build/host/bin/femtoruby /usr/local/bin/picoruby \
  && cp build/host/bin/picorbc /usr/local/bin/picorbc

COPY prelude.rb run.sh /opt/logic-test/

WORKDIR /workspace
ENTRYPOINT ["sh", "/opt/logic-test/run.sh"]
