# FitInfinity

Sistem manajemen gym berbasis web yang dibangun dengan **Next.js 15**, **tRPC**, **Prisma**, dan **MySQL**. Mencakup manajemen member, kelas, langganan, pembayaran (DOKU/Midtrans), point of sale (POS), laporan keuangan, absensi berbasis IoT (MQTT/ESP32), notifikasi email, dan OCR untuk dokumen.

---

## Daftar Isi

1. [Ringkasan Proyek](#ringkasan-proyek)
2. [Prasyarat](#prasyarat)
3. [Setup Environment](#setup-environment)
4. [Instalasi Dependensi](#instalasi-dependensi)
5. [Konfigurasi Environment Variables](#konfigurasi-environment-variables)
6. [Migrasi & Seed Database](#migrasi--seed-database)
7. [Menjalankan Development Server](#menjalankan-development-server)
8. [Build & Production](#build--production)
9. [Struktur Folder Inti](#struktur-folder-inti)
10. [Skrip Penting](#skrip-penting)
11. [Docker](#docker)
12. [Troubleshooting](#troubleshooting)

---

## Ringkasan Proyek

FitInfinity adalah platform SaaS manajemen gym yang melayani:
- **Admin & Staf**: Dashboard manajemen member, kelas, paket langganan, inventaris, supplier, laporan keuangan (kas & bank), dan purchase order.
- **Member**: Portal self-service untuk melihat jadwal kelas, riwayat langganan, reward, dan pembayaran.
- **Fitness Consultant (FC) & Personal Trainer (PT)**: Manajemen klien dan sesi latihan.
- **IoT**: Integrasi perangkat absensi berbasis ESP32 via MQTT (Mosquitto).
- **Pembayaran**: Integrasi gateway DOKU Snap dan Midtrans.
- **OCR**: Ekstraksi data dokumen menggunakan Tesseract.js / PaddleOCR.

**Stack teknologi utama:**
| Teknologi | Versi |
|---|---|
| Next.js | ^16.0.7 |
| React | ^18.3.1 |
| TypeScript | ^5.5.3 |
| tRPC | ^11.0.0-rc |
| Prisma ORM | ^5.22.0 |
| MySQL (mysql2) | ^3.12.0 |
| NextAuth.js | ^5.0.0-beta.30 |
| Tailwind CSS | ^3.4.3 |
| TanStack Query | ^5.50.0 |
| MQTT.js | ^5.13.1 |
| Winston (logging) | ^3.17.0 |
| Prom-client (metrics) | ^15.1.3 |

---

## Prasyarat

Pastikan environment berikut sudah terinstal sebelum memulai:

| Kebutuhan | Versi Minimum | Catatan |
|---|---|---|
| **Node.js** | 20.x LTS | Direkomendasikan v20 atau v22 |
| **npm** | 10.8.2 | Sesuai `packageManager` di `package.json` |
| **MySQL** | 8.0+ | Database utama aplikasi |
| **Git** | – | Untuk clone repo |
| **Mosquitto MQTT Broker** | 2.x | Opsional, hanya jika pakai fitur IoT/absensi |

> **Catatan Docker**: Jika ingin menjalankan seluruh stack via Docker, cukup butuh Docker Desktop dan Docker Compose — tidak perlu instalasi Node.js atau MySQL secara lokal.

---

## Setup Environment

### 1. Clone Repository

```bash
git clone <url-repository> fitinfinity
cd fitinfinity
```

### 2. Salin File Environment

```bash
cp .env.example .env
```

Kemudian isi file `.env` dengan nilai yang sesuai (lihat bagian [Konfigurasi Environment Variables](#konfigurasi-environment-variables)).

---

## Instalasi Dependensi

```bash
npm install
```

Perintah ini juga akan otomatis menjalankan `prisma generate` (via script `postinstall`) untuk menghasilkan Prisma Client.

---

## Konfigurasi Environment Variables

Edit file `.env` dan isi semua variabel berikut:

```dotenv
# ─── Auth ──────────────────────────────────────────────────────────────────────
# Generate dengan: npx auth secret
AUTH_SECRET="isi_dengan_secret_acak_yang_panjang"
NEXT_PUBLIC_BYPASS_SECRET="your_super_secret_bypass_key"

# NextAuth URL (harus sesuai domain/port yang digunakan)
NEXTAUTH_URL="http://localhost:3099"

# Discord OAuth (opsional, jika login Discord diaktifkan)
AUTH_DISCORD_ID=""
AUTH_DISCORD_SECRET=""

# ─── Database ──────────────────────────────────────────────────────────────────
# Format: mysql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="mysql://root:password@localhost:3306/fitinfinity"

# Aktifkan RBAC (Role-Based Access Control)
ALLOW_RBAC=false

```

> **Catatan**: Skema validasi environment variables ada di [`src/env.js`](src/env.js). Jika menambah variabel baru, update file tersebut.

---

## Migrasi & Seed Database

### Membuat Database

Pastikan MySQL sudah berjalan dan database `fitinfinity` sudah dibuat:

```sql
CREATE DATABASE fitinfinity CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Jalankan Migrasi

**Development** (membuat file migrasi baru jika schema berubah):
```bash
npm run db:generate
```

**Production / CI** (menerapkan migrasi yang sudah ada tanpa membuat file baru):
```bash
npm run db:migrate
```

**Push langsung** (tanpa file migrasi — cocok untuk prototyping cepat, **hindari di production**):
```bash
npm run db:push
```

### Seed Data Awal

```bash
npm run db:seed
```

Seed dijalankan dari [`prisma/seed.ts`](prisma/seed.ts).

Untuk seed khusus tipe kelas:
```bash
npm run seed:class-types
```

### Prisma Studio (GUI Database)

```bash
npm run db:studio
```

Membuka antarmuka visual di `http://localhost:5555` untuk menjelajahi dan mengedit data database secara langsung.

---

## Menjalankan Development Server

```bash
npm run dev
```

Server akan berjalan di **`http://localhost:3000`** dengan Turbopack (mode `--turbo`) untuk build yang lebih cepat.

> **Port default**: 3000. Jika ingin mengubah port, jalankan: `npm run dev -- -p 3099`

---

## Build & Production

### Build Aplikasi

```bash
npm run build
```

### Jalankan Production Server

```bash
npm run start
```

### Preview (Build + Start sekaligus)

```bash
npm run preview
```

### Informasi Build Profil

```bash
npm run build:info
```

---

## Struktur Folder Inti

```
fitinfinity/
├── prisma/                  # Skema dan file migrasi Prisma
│   ├── schema.prisma        # Definisi model database
│   └── seed.ts              # Script seeding data awal
├── public/                  # Aset statis (gambar, manifest, SW)
│   └── assets/              # Gambar dan media aplikasi
├── scripts/                 # Script utilitas (seeding, konversi, dll.)
├── src/
│   ├── app/                 # Next.js App Router (halaman & layout)
│   │   ├── (authenticated)/ # Halaman yang membutuhkan autentikasi
│   │   │   ├── finance/     # Modul keuangan
│   │   │   ├── inventory/   # Modul inventaris
│   │   │   ├── pos/         # Point of Sale
│   │   │   └── reports/     # Laporan
│   │   ├── (home)/          # Landing page publik
│   │   ├── api/             # Route API Next.js (metrics, debug, dll.)
│   │   └── auth/            # Halaman autentikasi
│   ├── components/          # Komponen UI yang dapat digunakan ulang
│   │   └── ui/              # Komponen dasar (button, dialog, table, dll.)
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilitas, konfigurasi, service library
│   │   ├── config/          # Konfigurasi situs
│   │   ├── email/           # Service pengiriman email (SMTP/Nodemailer)
│   │   ├── mqtt/            # Service MQTT client
│   │   ├── payment/         # Integrasi payment gateway (DOKU)
│   │   └── wifi/            # Konfigurasi WiFi untuk perangkat IoT
│   ├── server/              # Backend (tRPC routers, auth, DB, metrics)
│   │   ├── api/
│   │   │   └── routers/     # Semua tRPC routers (member, payment, device, dll.)
│   │   ├── auth/            # Konfigurasi NextAuth
│   │   ├── metrics/         # Prometheus metrics
│   │   └── utils/           # Utilitas server (AI service, logging, dll.)
│   └── env.js               # Validasi & ekspor environment variables
├── firmware/                # Kode firmware ESP32 (Arduino/C++)
│   └── lib/                 # Library C++ untuk komunikasi API & MQTT
├── mqtt/                    # Konfigurasi Mosquitto MQTT broker
│   └── config/              # ACL, konfigurasi, dan file password
├── middleware.ts             # Next.js middleware (proteksi route, auth)
├── next.config.js            # Konfigurasi Next.js
├── docker-compose.yml        # Orchestrasi Docker (app + DB + MQTT)
├── Dockerfile                # Dockerfile untuk development
├── Dockerfile.prod           # Dockerfile untuk production
├── tailwind.config.ts        # Konfigurasi Tailwind CSS
├── tsconfig.json             # Konfigurasi TypeScript
└── package.json              # Dependensi dan skrip npm
```

---

## Skrip Penting

| Skrip | Perintah | Keterangan |
|---|---|---|
| Dev server | `npm run dev` | Jalankan server development (Turbopack) |
| Build | `npm run build` | Build untuk production |
| Start production | `npm run start` | Jalankan server production |
| Lint | `npm run lint` | Cek kode dengan ESLint |
| Lint & fix | `npm run lint:fix` | Perbaiki otomatis masalah lint |
| Type check | `npm run typecheck` | Validasi TypeScript tanpa emit |
| Format cek | `npm run format:check` | Cek format dengan Prettier |
| Format tulis | `npm run format:write` | Format otomatis semua file |
| DB generate | `npm run db:generate` | Buat & jalankan migrasi baru |
| DB migrate | `npm run db:migrate` | Deploy migrasi (production) |
| DB push | `npm run db:push` | Push schema langsung ke DB |
| DB seed | `npm run db:seed` | Isi data awal ke database |
| DB studio | `npm run db:studio` | Buka GUI Prisma Studio |
| Seed class types | `npm run seed:class-types` | Seed tipe kelas khusus |
| Init email | `npm run init:email` | Inisialisasi template email |

---

## Docker

### Development dengan Docker Compose

```bash
docker-compose up -d
```

Ini akan menjalankan:
- Aplikasi Next.js
- Database MySQL
- MQTT Broker (Mosquitto)

### Production dengan Docker

Build image production:
```bash
docker build -f Dockerfile.prod -t fitinfinity:prod .
```

Jalankan container:
```bash
docker run -p 3000:3000 --env-file .env fitinfinity:prod
```

> Lihat [`docker-compose.yml`](docker-compose.yml) untuk konfigurasi lengkap service dan volume.

---

## Troubleshooting

### `DATABASE_URL` tidak terhubung
- Pastikan MySQL berjalan dan database sudah dibuat.
- Cek format URL: `mysql://USER:PASSWORD@HOST:PORT/DATABASE`
- Untuk MySQL lokal di Mac (Homebrew): `brew services start mysql`

### `prisma generate` gagal setelah `npm install`
Jalankan secara manual:
```bash
npx prisma generate
```

### Error saat migrasi: "Migration file already applied"
Gunakan `npm run db:migrate` (bukan `db:generate`) pada environment production/staging.

### Port 3000 sudah dipakai
Jalankan pada port lain:
```bash
npm run dev -- -p 3001
```

### Prisma Client tidak terupdate setelah ubah schema
```bash
npx prisma generate
```
Kemudian restart dev server.

### MQTT tidak terhubung
- Pastikan Mosquitto broker berjalan di host dan port yang dikonfigurasi di `.env`.
- Cek file konfigurasi di [`mqtt/config/mosquitto.conf`](mqtt/config/mosquitto.conf).
- Pastikan kredensial MQTT di `.env` sesuai dengan file [`mqtt/config/passwords`](mqtt/config/passwords).

### Build gagal karena error TypeScript
```bash
npm run typecheck
```
Perbaiki semua error yang muncul sebelum melakukan build ulang.

### Halaman menampilkan error 500 di production
- Cek log server: `docker logs <container_id>` atau output terminal.
- Pastikan semua environment variables sudah diisi dengan benar di `.env` (atau environment container).
- Pastikan migrasi database sudah dijalankan: `npm run db:migrate`.
