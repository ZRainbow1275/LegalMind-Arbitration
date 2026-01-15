#!/bin/bash

set -euo pipefail

echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "CSRF_SECRET=$(openssl rand -hex 16)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
echo "AUDIT_LOG_SECRET=$(openssl rand -base64 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "MINIO_PASSWORD=$(openssl rand -base64 24)"

