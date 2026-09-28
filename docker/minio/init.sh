#!/bin/sh
# Waits for MinIO to be ready, then creates the application bucket.
set -e

MC=/usr/bin/mc

until $MC alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" 2>/dev/null; do
  echo "Waiting for MinIO..."
  sleep 2
done

$MC mb --ignore-existing local/"$MINIO_BUCKET"
$MC anonymous set none local/"$MINIO_BUCKET"

echo "MinIO bucket '$MINIO_BUCKET' is ready."
