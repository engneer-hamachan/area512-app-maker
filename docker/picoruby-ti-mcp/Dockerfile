FROM golang:1.26-trixie AS build

ARG PICORUBY_TI_REF=main
ARG AREA512_REF=cyd
# picoruby for the Cardputer, picoruby_cyd for the ESP32-2432S028.
ARG AREA512_SIG_DIR=picoruby

RUN apt-get update \
  && apt-get install -y --no-install-recommends ruby \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /src

RUN git clone --depth 1 --branch "$PICORUBY_TI_REF" \
    --recurse-submodules --shallow-submodules \
    https://github.com/engneer-hamachan/picoruby-ti.git

# Only the signatures are needed, so the firmware and submodules are not fetched.
RUN git clone --depth 1 --branch "$AREA512_REF" \
    --filter=blob:none --sparse \
    https://github.com/engneer-hamachan/area512.git \
  && git -C area512 sparse-checkout set components/area512/sig

WORKDIR /src/picoruby-ti

RUN cp /src/area512/components/area512/sig/"$AREA512_SIG_DIR"/*.rbs sig/ \
  && make gendb \
  && make -C lsp build

FROM debian:trixie-slim

COPY --from=build /src/picoruby-ti/lsp/picoruby-ti-lsp /usr/local/bin/picoruby-ti-lsp

WORKDIR /workspace

ENTRYPOINT ["picoruby-ti-lsp", "--mcp"]
