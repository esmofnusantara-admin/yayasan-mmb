# e-Management Yayasan MMB Indonesia

Sistem Informasi Manajemen terpadu untuk **Yayasan Murid Muda Bermisi (MMB)** — mencakup pengelolaan anggota, keuangan, kepegawaian, persuratan, arsip, dan pelaporan organisasi.

---

## 🗂️ Struktur Proyek

Proyek ini menggunakan arsitektur **monorepo terstruktur** dalam satu repository, dengan pemisahan yang jelas antara layer Frontend, Backend API, dan Database.

```
e-managamanet-yayasan-1/
├── src/                          ← Frontend React SPA
│   ├── components/               ← Tab dan komponen UI (13 modul)
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardTab.tsx
│   │   ├── MembersTab.tsx
│   │   ├── FinanceTab.tsx
│   │   ├── StaffTab.tsx
│   │   ├── PayrollTab.tsx
│   │   ├── PartnersTab.tsx
│   │   ├── LettersTab.tsx
│   │   ├── SmallGroupsTab.tsx
│   │   ├── ApprovalsTab.tsx
│   │   ├── ReportsTab.tsx
│   │   ├── StaffMeTab.tsx
│   │   └── SystemTab.tsx
│   ├── data/                     ← Data statis & seed awal
│   ├── utils/                    ← Utilitas (export PDF, dll.)
│   ├── App.tsx                   ← Root aplikasi & handler API global
│   ├── firebase.ts               ← Inisialisasi Firebase client (auth, db)
│   ├── types.ts                  ← TypeScript type definitions (20+ interface)
│   ├── index.css                 ← Global stylesheet (TailwindCSS 4)
│   └── main.tsx                  ← Entry point React
│
├── server/                       ← Backend Express API (Modular)
│   ├── config/
│   │   └── firebase.ts           ← Inisialisasi Firebase SDK sisi server
│   ├── db/
│   │   └── driver.ts             ← Unified DbDriver + cleanObjectForFirestore
│   ├── services/
│   │   ├── seed.service.ts       ← Seeding default users & structures
│   │   └── transaction-sync.service.ts ← Sinkronisasi subkoleksi transaksi
│   ├── routes/
│   │   ├── auth.routes.ts        ← Registrasi, login, lupa & reset password
│   │   ├── data.routes.ts        ← Generic CRUD (/api/data/:colName)
│   │   ├── documents.routes.ts   ← Upload, download, preview dokumen
│   │   ├── letters.routes.ts     ← Download & preview surat masuk
│   │   ├── finance.routes.ts     ← Sinkronisasi atomik kas & jurnal
│   │   └── system.routes.ts      ← Database cleanse / factory reset
│   └── index.ts                  ← Entry point Express + Vite middleware
│
├── index.html                    ← HTML entry point SPA
├── vite.config.ts                ← Konfigurasi Vite
├── tsconfig.json                 ← Konfigurasi TypeScript
├── package.json                  ← Dependensi & scripts
├── firestore.rules               ← Firestore Security Rules
└── firebase-applet-config.json   ← Konfigurasi Firebase
```

---

## 🔌 API Endpoints

Backend Express melayani seluruh operasi data melalui endpoint REST berikut:

| # | Method | Endpoint | Fungsi |
|---|--------|----------|--------|
| 1 | `POST` | `/api/auth/register` | Registrasi operator baru |
| 2 | `POST` | `/api/auth/login` | Login autentikasi |
| 3 | `POST` | `/api/auth/forgot-password/challenge` | Verifikasi identitas lupa password |
| 4 | `POST` | `/api/auth/forgot-password/reset` | Reset password |
| 5 | `GET`  | `/api/data/:colName` | Ambil seluruh dokumen dari koleksi |
| 6 | `POST` | `/api/data/:colName/:id` | Buat / set dokumen |
| 7 | `PUT`  | `/api/data/:colName/:id` | Update dokumen |
| 8 | `DELETE` | `/api/data/:colName/:id` | Soft-delete atau hard-delete dokumen |
| 9 | `POST` | `/api/documents/upload` | Upload arsip dokumen (base64) |
| 10 | `GET` | `/api/documents/download/:id` | Download arsip dokumen |
| 11 | `GET` | `/api/documents/preview/:id` | Pratinjau arsip dokumen (HTML/inline) |
| 12 | `GET` | `/api/inward_letters/download/:id` | Download surat masuk |
| 13 | `GET` | `/api/inward_letters/preview/:id` | Pratinjau surat masuk |
| 14 | `POST` | `/api/finance/sync` | Sinkronisasi atomik transaksi & saldo kas |
| 15 | `POST` | `/api/system/cleanse` | Factory reset & re-seed database |

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 19, TypeScript 5.8, TailwindCSS 4, Lucide React, Motion, jsPDF |
| **Backend** | Express 4, TypeScript, tsx (dev), esbuild (prod bundle) |
| **Database** | Google Cloud Firestore (Firebase Client SDK) |
| **Build Tool** | Vite 6 (frontend), esbuild (backend bundle) |
| **Runtime** | Node.js |

---

## 🚀 Menjalankan Secara Lokal

**Prasyarat:** Node.js (v18+)

### Development

```bash
# 1. Install semua dependensi
npm install

# 2. Jalankan server development (Express + Vite middleware)
npm run dev
```

Aplikasi akan berjalan di **http://localhost:3000**. Hot Module Replacement (HMR) aktif secara otomatis.

### Production Build & Run

```bash
# Build frontend (Vite) + bundle backend (esbuild)
npm run build

# Jalankan server produksi (file statis dari dist/)
npm run start
```

---

## 🗄️ Database (Firestore)

Aplikasi menggunakan **Firebase Client SDK** pada sisi server (bukan Admin SDK), sehingga Firestore Security Rules tetap berlaku.

Koleksi Firestore yang digunakan (28 total):

`users` · `profiles` · `structures` · `system_state` · `members` · `member_notes` · `prayer_requests` · `follow_ups` · `small_groups` · `meeting_logs` · `materials` · `transactions` · `financial_transactions` · `incomes` · `expenses` · `fundraising` · `payroll_payments` · `categories` · `partners` · `donations` · `staff` · `salaries` · `inward_letters` · `outward_letters` · `documents` · `approvals` · `audits` · `kas` · `detail_pengeluaran` · `detail_expenses`

---

## 📋 Akun Default

Saat pertama dijalankan dengan database kosong, sistem akan otomatis membuat akun:

| Field | Value |
|-------|-------|
| Email | `superadmin@esm.or.id` |
| Password | `admin123` |
| Role | `Super Admin` |

---

## 📦 Changelog

### v2.0.0 — Restrukturisasi Monorepo Internal (Juni 2025)

- **[REFACTOR]** Memecah monolith `server.ts` (1.288 baris) menjadi modul-modul terorganisir di bawah direktori `server/`
- **[NEW]** `server/config/firebase.ts` — Inisialisasi Firebase terpisah untuk layer server
- **[NEW]** `server/db/driver.ts` — Unified database access layer (`dbDriver`) & helper `cleanObjectForFirestore`
- **[NEW]** `server/services/seed.service.ts` — Logika seeding data awal (users & structures)
- **[NEW]** `server/services/transaction-sync.service.ts` — Propagasi sinkronisasi transaksi ke subkoleksi
- **[NEW]** `server/routes/auth.routes.ts` — Router autentikasi (register, login, forgot password)
- **[NEW]** `server/routes/data.routes.ts` — Generic CRUD router untuk semua koleksi Firestore
- **[NEW]** `server/routes/documents.routes.ts` — Manajemen arsip dokumen (upload/download/preview)
- **[NEW]** `server/routes/letters.routes.ts` — Unduhan & pratinjau surat masuk
- **[NEW]** `server/routes/finance.routes.ts` — Sinkronisasi atomik transaksi keuangan & kas
- **[NEW]** `server/routes/system.routes.ts` — Factory reset & pembersihan database
- **[NEW]** `server/index.ts` — Entry point server yang merangkai semua router & Vite middleware
- **[REMOVE]** `server.ts` — File monolith lama dihapus setelah migrasi selesai
- **[CLEANUP]** `src/firebase.ts` — Menghapus fungsi `syncFinanceData()` yang tidak terpakai (digantikan sepenuhnya oleh `/api/finance/sync`)
- **[UPDATE]** `package.json` — Script `dev` dan `build` diperbarui untuk menggunakan `server/index.ts`

### v1.0.0 — Rilis Awal

- Aplikasi manajemen yayasan monolith pertama dengan frontend React + backend Express dalam satu file `server.ts`
