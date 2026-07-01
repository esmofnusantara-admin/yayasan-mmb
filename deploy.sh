#!/bin/bash
# ============================================================
# deploy.sh — Script deploy Yayasan MMB ke server Biznet
# Jalankan di server: bash deploy.sh
# ============================================================

set -e  # Stop jika ada error

echo "🚀 Mulai deploy Yayasan MMB..."

# === Cek .env file ===
if [ ! -f ".env" ]; then
  echo "❌ File .env tidak ditemukan!"
  echo "   Buat dulu file .env berdasarkan .env.example"
  exit 1
fi

# === Cek firebase-applet-config.json ===
if [ ! -f "firebase-applet-config.json" ]; then
  echo "❌ File firebase-applet-config.json tidak ditemukan!"
  echo "   Upload file ini ke server sebelum deploy"
  exit 1
fi

# === Pull kode terbaru ===
echo "📦 Pull kode terbaru dari GitHub..."
git pull origin main

# === Build dan jalankan Docker ===
echo "🐳 Build Docker image..."
docker compose build --no-cache

echo "🔄 Restart container..."
docker compose down
docker compose up -d

echo "✅ Deploy selesai!"
echo "   App berjalan di: http://localhost:3000"
echo "   Cek logs: docker compose logs -f app"
