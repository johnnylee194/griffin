#!/bin/sh
set -e

echo "Waiting for database..."
sleep 5

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding default data..."
npx prisma db seed 2>/dev/null || true

echo "Starting server..."
exec "$@"

