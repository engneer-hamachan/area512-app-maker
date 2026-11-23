# Stands in for golang:1.26-trixie: deb.debian.org is blocked in cloud sessions,
# so Ruby (and the rbs that Debian trixie ships) comes from Ubuntu instead.
FROM mirror.gcr.io/library/golang:1.26-trixie AS go
FROM mirror.gcr.io/library/ubuntu:noble
COPY ccr-ca.crt /usr/local/share/ca-certificates/ccr-ca.crt
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git make gcc libc6-dev ruby ruby-dev \
  && cat /usr/local/share/ca-certificates/ccr-ca.crt >> /etc/ssl/certs/ca-certificates.crt && rm -rf /var/lib/apt/lists/*
RUN gem install rbs -v 3.4.4 --no-document
COPY --from=go /usr/local/go /usr/local/go
ENV GOPATH=/go PATH=/go/bin:/usr/local/go/bin:$PATH SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt GIT_SSL_CAINFO=/etc/ssl/certs/ca-certificates.crt
