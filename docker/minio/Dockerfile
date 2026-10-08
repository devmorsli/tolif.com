FROM alpine:latest

RUN apk add --no-cache curl && \
    curl -fsSL https://dl.min.io/server/minio/release/linux-amd64/minio -o /usr/local/bin/minio && \
    chmod +x /usr/local/bin/minio

EXPOSE 9000 9001

ENTRYPOINT ["/usr/local/bin/minio"]
