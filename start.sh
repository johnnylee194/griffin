#!/bin/sh
set -e

echo "Initializing database..."
npx prisma migrate deploy

echo "Seeding default data..."
npx prisma db seed 2>/dev/null || true

echo "Starting Griffin server..."
exec npm start

