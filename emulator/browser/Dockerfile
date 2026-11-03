FROM mcr.microsoft.com/playwright:v1.56.1-noble

WORKDIR /srv/emulator-browser

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY browser_server.mjs area512.mjs emulator_client.mjs ./
RUN ln -s /srv/emulator-browser/area512.mjs /usr/local/bin/area512 \
  && chmod +x area512.mjs

CMD ["node", "browser_server.mjs"]
