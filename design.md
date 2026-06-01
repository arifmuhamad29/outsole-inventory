# Outsole Inventory Management System

## Overview

Aplikasi web inventory untuk mengelola stok outsole sepatu menggunakan QR Code.

Sistem harus mendukung:

* Barang Masuk (Inbound)
* Barang Keluar (Outbound)
* Scan QR Code
* Riwayat Transaksi
* Audit Log
* Stock Adjustment
* Stock Opname
* Export Excel
* Multi User Authentication

Target pengguna:

* Admin Gudang
* Operator Gudang

---

# Technology Stack

## Frontend

* Next.js 15 App Router
* TypeScript
* TailwindCSS
* Shadcn UI

## Backend

* Next.js Server Actions
* Route Handlers untuk Scanner API

## Database

* PostgreSQL

## ORM

* Prisma ORM

## Authentication

* NextAuth/Auth.js

## Deployment

* Vercel

---

# User Roles

## Admin

Hak akses:

* Tambah stok
* Edit data outsole
* Stock adjustment
* Stock opname
* Melihat laporan
* Export data
* Kelola user

## Operator

Hak akses:

* Scan outbound
* Melihat stok

Tidak boleh:

* Mengubah stok manual
* Menghapus data
* Mengelola user

---

# Database Design

## User

* id
* name
* email
* passwordHash
* role (ADMIN | OPERATOR)
* createdAt
* updatedAt

---

## Outsole

* id (UUID)
* qrCode (unique)
* model
* color
* size
* stock
* minimumStock
* isActive
* createdAt
* updatedAt

Constraint:

Unique combination:

(model, color, size)

---

## Transaction

* id
* outsoleId
* userId
* type

Enum:

* INBOUND
* OUTBOUND
* ADJUSTMENT
* STOCK_OPNAME

Fields:

* qty
* notes
* createdAt

---

# QR Code Rules

QR Code tidak boleh menggunakan nama model.

Gunakan format:

OSL-{SHORT_UUID}

Contoh:

OSL-8F3D7A2B

QR hanya menyimpan identifier unik.

Data produk diambil dari database.

---

# Inbound Flow

1. Admin membuka halaman Inbound.
2. Mengisi:

   * Model
   * Warna
   * Size
   * Qty
3. Sistem memeriksa kombinasi model-color-size.
4. Jika sudah ada:

   * tambah stok.
5. Jika belum:

   * buat produk baru.
6. Simpan transaksi INBOUND.
7. Generate QR Code.
8. Tampilkan label siap cetak.

---

# Outbound Flow

1. Operator membuka halaman Scan.
2. Input selalu autofocus.
3. Scanner mengirim QR Code.
4. Sistem mencari data outsole.
5. Jika stok tersedia:

   * stock = stock - 1
6. Simpan transaksi OUTBOUND.
7. Tampilkan notifikasi sukses.
8. Input langsung siap scan berikutnya.

---

# Stock Adjustment

Digunakan saat:

* barang rusak
* salah hitung
* koreksi stok

Admin dapat mengubah stok.

Semua adjustment wajib memiliki alasan.

---

# Stock Opname

Flow:

1. Admin membuat sesi opname.
2. User scan semua barang fisik.
3. Sistem menghitung jumlah fisik.
4. Sistem membandingkan dengan stok database.
5. Tampilkan selisih.
6. Admin dapat menyimpan hasil opname.

---

# Dashboard

Tampilkan:

* Total SKU
* Total Stock
* Low Stock Count
* Recent Transactions

Inventory Table:

* QR Code
* Model
* Color
* Size
* Stock
* Minimum Stock
* Status

Jika:

stock <= minimumStock

Tampilkan warning merah.

---

# Reporting

Export:

* Excel
* CSV

Laporan:

* Inventory Report
* Transaction Report
* Stock Adjustment Report
* Stock Opname Report

---

# Audit Requirements

Semua perubahan data harus menyimpan:

* User
* Action
* Timestamp
* Data sebelum perubahan
* Data sesudah perubahan

Audit log tidak boleh dihapus.
