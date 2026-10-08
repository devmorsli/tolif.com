FROM alpine:latest

RUN apk add --no-cache curl && \
    curl -fsSL https://github.com/minio/minio/releases/latest/download/minio.linux-amd64 -o /usr/local/bin/minio && \
    chmod +x /usr/local/bin/minio

EXPOSE 9000 9001

ENTRYPOINT ["/usr/local/bin/minio"]
