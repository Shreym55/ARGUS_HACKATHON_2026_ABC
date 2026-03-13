#!/bin/sh
set -e

echo "⏳ Installing dependencies..."
npm install

echo "🔄 Running migrations..."
npm run db:migrate

echo "🌱 Seeding database..."
npm run db:seed

echo "🚀 Starting NestJS..."
exec npm run start:dev
