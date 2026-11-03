FROM python:3.13-slim

RUN pip install --no-cache-dir pillow==11.3.0

COPY area512_assets.py /usr/local/bin/area512-assets

WORKDIR /workspace

ENTRYPOINT ["python3", "/usr/local/bin/area512-assets"]
