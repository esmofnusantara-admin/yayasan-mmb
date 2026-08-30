# Yayasan MMB - Executive Management & Financial System (ESM)

Sistem Tata Kelola Manajemen Terpadu, Tata Kerja Institusional, Pelayanan Anggota, Kas & Donasi Finansial, Manajemen Payroll, Administrasi Surat Menyurat, dan Pusat Laporan Siklus Cut-off Yayasan MMB.

---

## 📚 Knowledge Base & Dokumentasi Lengkap
Untuk panduan arsitektur teknis, aturan bisnis cut-off, deployment server Biznet, dan petunjuk prompt AI, silakan baca:
👉 **[KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md)**

---

## 🚀 Menjalankan Aplikasi Secara Lokal

### Prasyarat
* Node.js (v18+ direkomendasikan)
* npm

### Langkah Instalasi
1. Install dependensi:
   ```bash
   npm install
   ```
2. Jalankan server lokal:
   ```bash
   npm run dev
   ```
3. Buka browser di: `http://localhost:3000`

---

## 🛠️ Build & Type Check
* **Pemeriksaan Tipe TypeScript:**
  ```bash
  npm run lint
  ```
* **Production Build:**
  ```bash
  npm run build
  ```

---

## 🌐 Alur Deployment Server (Biznet VPS)
```bash
ssh Muridmudabermisi2026@103.93.134.220 "cd ~/yayasan-mmb && git pull origin main && npm run build && pm2 restart yayasan-mmb"
```
