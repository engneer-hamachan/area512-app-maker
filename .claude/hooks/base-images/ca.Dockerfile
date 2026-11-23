# A base image with the cloud session's proxy CA trusted.
ARG BASE
FROM ${BASE}
USER root
COPY ccr-ca.crt /usr/local/share/ca-certificates/ccr-ca.crt
RUN mkdir -p /etc/ssl/certs && cat /usr/local/share/ca-certificates/ccr-ca.crt >> /etc/ssl/certs/ca-certificates.crt
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt PIP_CERT=/etc/ssl/certs/ca-certificates.crt \
    REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt CURL_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt \
    NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/ccr-ca.crt GIT_SSL_CAINFO=/etc/ssl/certs/ca-certificates.crt
