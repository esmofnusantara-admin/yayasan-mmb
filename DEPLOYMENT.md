# Panduan Setup & Deployment Production - Yayasan MMB

Dokumentasi ini berisi langkah-langkah lengkap dari awal hingga berhasil untuk men-deploy aplikasi **Yayasan MMB Finance & Management System** di server **Biznet (Ubuntu/Debian)** menggunakan **PM2**, **Nginx**, dan **SSL Certbot (Let's Encrypt)**.

---

## 🛠️ Prasyarat Sistem & Persiapan Awal

### 1. Upgrade Node.js ke v20 LTS
Aplikasi membutuhkan Node.js versi modern (v20+). Untuk melakukan instalasi/upgrade dari Node lama:
```bash
# Setup repositori NodeSource untuk Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install nodejs -y

# Verifikasi versi Node & NPM
node --version # Harus v20.x.x
npm --version
```

### 2. Install Compiler C++ Modern (untuk SQLite Native Addon)
Modul `better-sqlite3` memerlukan compiler C++ modern yang mendukung standar C++20.
```bash
# Install compiler g++-10
sudo apt install -y g++-10

# Set g++-10 sebagai default compiler di system-wide alternatif
sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-10 10
```

### 3. Install PM2 (Process Manager) secara Global
```bash
sudo npm install -g pm2
pm2 --version
```

---

## 🚀 Langkah Deployment Aplikasi

### 1. Clone Project & Pindah Direktori
```bash
git clone git@github.com:esmofnusantara-admin/yayasan-mmb.git
cd yayasan-mmb
```

### 2. Konfigurasi Environment (`.env`)
Salin file environment contoh dan isi nilainya:
```bash
cp .env.example .env
nano .env
```

Isi file `.env` dengan konfigurasi berikut:
```env
# API Key untuk AI Assistant dari Google AI Studio (aistudio.google.com)
GEMINI_API_KEY=isi_api_key_gemini_kamu_disini

# URL Aplikasi setelah SSL aktif
APP_URL=https://prod.yayasan-mmb.web.id

# JWT Secret Key yang aman (silakan gunakan string random yang kuat)
JWT_SECRET=de86398131d801c891559b90b1ca70bb0283a25e99f92eb96fa3dbbe8fe21fda
```

> **Tips:** Untuk membuat string random yang aman sebagai `JWT_SECRET`, kamu bisa jalankan perintah ini di terminal:
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. Install Dependensi & Build Aplikasi
```bash
# Install seluruh package node_modules
npm install

# Build frontend (Vite) & compile server (Esbuild)
npm run build
```

---

## 🔄 Konfigurasi PM2

Aplikasi dijalankan menggunakan file konfigurasi `ecosystem.config.cjs` agar PM2 dapat memantau resources, logging, dan auto-restart.

### 1. Jalankan Aplikasi dengan PM2
```bash
# Buat folder log
mkdir -p logs

# Start aplikasi menggunakan config ecosystem
pm2 start ecosystem.config.cjs --env production
```

### 2. Setup Auto-boot on Server Restart
Agar aplikasi otomatis menyala kembali jika server Biznet mengalami reboot/mati lampu:
```bash
pm2 save
pm2 startup
```
*Salin dan jalankan perintah `sudo env PATH=...` yang dikeluarkan oleh output dari terminal PM2 startup tersebut.*

### 3. Perintah Monitoring PM2
* **Lihat log real-time**: `pm2 logs yayasan-mmb`
* **Cek status aplikasi**: `pm2 status`
* **Restart aplikasi**: `pm2 restart yayasan-mmb`

---

## 🌐 Konfigurasi DNS & Nginx (Port 80)

### 1. Arahkan Domain di Panel DNS (NEO DNS Biznet)
Tambahkan **A Record** baru pada panel DNS domain `yayasan-mmb.web.id`:
* **Type**: `A`
* **Name**: `prod`
* **Value**: `103.93.134.220` (IP Biznet Server)
* **TTL**: `3600`

### 2. Install & Konfigurasi Nginx
```bash
# Install Nginx
sudo apt install nginx -y

# Buat file konfigurasi web server baru
sudo nano /etc/nginx/sites-available/yayasan-mmb
```

Masukkan konfigurasi Server Block Nginx berikut:
```nginx
server {
    listen 80;
    server_name prod.yayasan-mmb.web.id;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Aktifkan Konfigurasi Nginx
```bash
# Buat symlink ke folder sites-enabled
sudo ln -s /etc/nginx/sites-available/yayasan-mmb /etc/nginx/sites-enabled/

# Test syntax konfigurasi Nginx
sudo nginx -t

# Restart Nginx untuk menerapkan perubahan
sudo systemctl restart nginx
```

---

## 🔒 Mengamankan dengan SSL/HTTPS (Let's Encrypt)

Langkah terakhir adalah mengaktifkan sertifikat SSL gratis agar situs diakses via HTTPS secara aman.

### 1. Install Certbot Nginx Plugin
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Dapatkan Sertifikat & Auto-Config Nginx
```bash
sudo certbot --nginx -d prod.yayasan-mmb.web.id
```
* Masukkan email kamu saat diminta.
* Setujui Terms of Service (`A`).
* Pilih opsi **`2` (Redirect)** ketika ditanya apakah ingin mengalihkan traffic HTTP ke HTTPS secara otomatis.

---

## 📂 Lokasi Database (SQLite)

Database utama bertipe file SQLite dan tersimpan di direktori:
📂 `/home/Muridmudabermisi2026/yayasan-mmb/data/yayasan.db`

### Cara cek database di server:
```bash
sqlite3 ~/yayasan-mmb/data/yayasan.db

# Di dalam SQLite terminal shell:
.tables
SELECT collection, count(*) FROM kv GROUP BY collection;
.quit
```

---

## 🔄 Alur Pembaruan Kode (Update Deploy)
Setiap kali ada pembaruan kode di repositori lokal dan ingin dirilis ke server Biznet:
```bash
cd ~/yayasan-mmb
git pull
npm install
npm run build
pm2 restart yayasan-mmb
```
