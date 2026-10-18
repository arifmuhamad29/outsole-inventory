# 📋 DOKUMEN PANDUAN QUALITY & TESTING (QA/QC & UAT)
## Development Outsole & Tooling Inventory System (Command Center)
**Versi Sistem:** `v2.2.15`  
**Otoritas Pengembang:** Arif Setiawan  
**Klasifikasi Dokumen:** Internal Quality Assurance, Testing & User Acceptance Testing (UAT) Guide  
**Terakhir Diperbarui:** 18 Oktober 2026  

---

## 📑 DAFTAR ISI
1. [Ringkasan Eksekutif & Arsitektur Teknologi](#1-ringkasan-eksekutif--arsitektur-teknologi)
2. [Hierarki Hak Akses & Matriks Otorisasi (RBAC)](#2-hierarki-hak-akses--matriks-otorisasi-rbac)
3. [Panduan Mendetail Setiap Menu & Fitur](#3-panduan-mendetail-setiap-menu--fitur)
   - [3.1 Dashboard Eksekutif (`/`)](#31-dashboard-eksekutif-)
   - [3.2 Inventory Master (`/inventory`)](#32-inventory-master-inventory)
   - [3.3 Inbound - Penerimaan Barang (`/inbound`)](#33-inbound---penerimaan-barang-inbound)
   - [3.4 Outbound - Pengeluaran Barang (`/outbound`)](#34-outbound---pengeluaran-barang-outbound)
   - [3.5 Adjustment - Koreksi Stok (`/adjustment`)](#35-adjustment---koreksi-stok-adjustment)
   - [3.6 Stock Opname - Audit Fisik Berkala (`/opname`)](#36-stock-opname---audit-fisik-berkala-opname)
   - [3.7 Tooling MES - Bottom & Assembly Tooling (`/tooling`)](#37-tooling-mes---bottom--assembly-tooling-tooling)
   - [3.8 Dev Tooling Stock - BPM / TFM (`/bpm-tfm`)](#38-dev-tooling-stock---bpm--tfm-bpm-tfm)
   - [3.9 Shoe Last - Acuan Sepatu (`/lasts` & `/public/lasts`)](#39-shoe-last---acuan-sepatu-lasts--publiclasts)
   - [3.10 Handover - Serah Terima & Cetak Dokumen (`/handover`)](#310-handover---serah-terima--cetak-dokumen-handover)
   - [3.11 Reports & Ekspor Excel (`/reports`)](#311-reports--ekspor-excel-reports)
   - [3.12 History & Audit Trail (`/history`)](#312-history--audit-trail-history)
   - [3.13 Purchase Tracking (`/tracking`)](#313-purchase-tracking-tracking)
   - [3.14 Color Conform History (`/conform-history`)](#314-color-conform-history-conform-history)
   - [3.15 Account Control & Security (`/account-control`)](#315-account-control--security-account-control)
   - [3.16 Fitur Pendukung: Notification Bell & Kamera Pemindai QR](#316-fitur-pendukung-notification-bell--kamera-pemindai-qr)
4. [Matriks Kasus Uji QA (Test Scenarios & Test Cases)](#4-matriks-kasus-uji-qa-test-scenarios--test-cases)
5. [Protokol Pelaporan Bug & Kriteria Kelulusan UAT](#5-protokol-pelaporan-bug--kriteria-kelulusan-uat)

---

## 1. Ringkasan Eksekutif & Arsitektur Teknologi

Aplikasi **Development Outsole & Tooling Inventory System** adalah sistem informasi manajemen inventaris logistik pabrik sepatu yang dirancang untuk mengelola stok material sol (Midsole, Outsole, Wedge, CR Device), cetakan produksi (Tooling MES), cetakan pengembangan (BPM/TFM), acuan sepatu (Shoe Lasts), pelacakan pembelian (Purchase Tracking), serta riwayat konfirmasi warna sampel (*Color Conform History*).

### Arsitektur Teknologi:
- **Framework Utama:** Next.js 15 (React 19, Server Components, Server Actions, Dynamic Suspense).
- **Bahasa Pemrograman:** TypeScript (Strict Type Safety).
- **Styling UI:** Tailwind CSS, Glassmorphism, Dark/Light adaptive color system, Base UI/Radix UI Primitives.
- **ORM & Database:** Prisma ORM v5 dengan database relational PostgreSQL (Supabase/Neon Database).
- **Autentikasi & Sesi:** Auth.js (NextAuth v5) dengan proteksi sesi ketat (*Zombie Session Revocation*).
- **Ekspor/Impor Spreadsheet:** SheetJS (`xlsx`) dengan komputasi aman di server/klien.
- **Komponen Ikon:** Lucide React.
- **Feedback & Notifikasi:** Sonner Toaster (toast notifications) & Real-time Notification Ledger.

---

## 2. Hierarki Hak Akses & Matriks Otorisasi (RBAC)

Sistem menerapkan prinsip *Least Privilege* dengan 3 Role utama dan izin granular (*Granular Permissions*):

| Menu / Modul | SUPER ADMIN | ADMIN | OPERATOR (Default) | Izin Granular Terkait |
| :--- | :---: | :---: | :---: | :--- |
| **Dashboard** (`/`) | ✅ Full | ✅ Full | ✅ Full | Akses Dasbor |
| **Inventory Master** (`/inventory`) | ✅ Full | ✅ Full | ✅ View Only | `MANAGE_INVENTORY` |
| **Inbound** (`/inbound`) | ✅ Full | ✅ Full | ❌ Akses Izin | `MANAGE_INBOUND` |
| **Outbound** (`/outbound`) | ✅ Full | ✅ Full | ✅ Full | `MANAGE_OUTBOUND` |
| **Adjustment** (`/adjustment`) | ✅ Full | ✅ Full | ❌ Akses Izin | `MANAGE_ADJUSTMENT` |
| **Stock Opname** (`/opname`) | ✅ Full | ✅ Full | ❌ Akses Izin | `MANAGE_OPNAME` |
| **Tooling MES** (`/tooling`) | ✅ Full | ✅ Full | ✅ Full | `MANAGE_TOOLING` |
| **Dev Tooling Stock** (`/bpm-tfm`) | ✅ Full | ✅ Full | ✅ Full | `MANAGE_TOOLING` |
| **Shoe Last** (`/lasts`) | ✅ Full | ✅ Full | ✅ Full | `MANAGE_LASTS` |
| **Handover** (`/handover`) | ✅ Full | ✅ Full | ✅ Full | `MANAGE_HANDOVER` |
| **Reports** (`/reports`) | ✅ Full | ✅ Full | ❌ Akses Izin | `VIEW_REPORTS` |
| **History / Audit** (`/history`) | ✅ Full | ✅ Full | ❌ Akses Izin | `VIEW_HISTORY` |
| **Purchase Tracking** (`/tracking`) | ✅ Full | ✅ Full | ✅ Full | `MANAGE_TRACKING` |
| **Color Conform History** (`/conform-history`) | ✅ Full | ✅ Full | ✅ Full | `MANAGE_TRACKING` |
| **Account Control** (`/account-control`) | ✅ Full | ❌ Terlarang | ❌ Terlarang | Khusus Role `SUPER_ADMIN` |

> [!IMPORTANT]
> **Zombie Session Protection:**  
> Jika seorang pengguna dinonaktifkan (`isDeleted = true`) atau hak aksesnya diubah oleh Super Admin di panel `Account Control`, sistem otomatis meningkatkan nilai `sessionVersion`. Saat pengguna tersebut melakukan klik atau navigasi apa pun, sesi langsung di-invalidasi dan pengguna secara otomatis ter-logout (*forced logout*) ke layar login.

---

## 3. Panduan Mendetail Setiap Menu & Fitur

---

### 3.1 Dashboard Eksekutif (`/`)

#### A. Deskripsi & Tujuan
Pusat komando logistik yang menampilkan ringkasan performa pergudangan, metrik stok, tren keluar-masuk, serta peringatan stok menipis secara *real-time*.

#### B. Elemen & Fitur Utama
1. **KPI Cards:**
   - **Total Items:** Jumlah SKU/varian outsole yang terdaftar di sistem.
   - **Total Fisik Stok:** Akumulasi seluruh kuantitas unit sol yang ada di gudang.
   - **Inbound Hari Ini:** Jumlah unit sol yang masuk ke gudang hari ini.
   - **Outbound Hari Ini:** Jumlah unit sol yang keluar untuk produksi/sampel hari ini.
   - **Peringatan Stok Menipis:** Indikator merah jika ada item yang stoknya `≤ minimumStock`.
2. **Grafik Visual Interaktif:**
   - Grafik batang & tren pergerakan barang dalam rentang waktu yang dapat dipilih.
   - Grafik breakdown distribusi tipe sol (Lokal vs Impor), Bottom Treatment, dan komponen.
3. **Filter Rentang Tanggal & Summary Pintar:**
   - Pemilihan rentang tanggal fleksibel (Start Date - End Date).
   - **Fitur Catatan Artikel Duplikat:** Jika dalam rentang tanggal yang difilter terdapat artikel yang sama yang mengalami transaksi berulang, sistem menampilkan kartu catatan informatif: *"Terdapat X transaksi pada artikel [Kode Artikel] dalam rentang tanggal ini"*, memudahkan tim analisis dalam menyusun laporan harian/mingguan.
4. **Real-time Activity Feed:**
   - 20 mutasi terakhir dengan penanda visual:
     - 🟢 **Hijau (+)** untuk transaksi barang masuk (Inbound / Penyesuaian Naik).
     - 🔴 **Merah (-)** untuk transaksi barang keluar (Outbound / Handover / Penyesuaian Turun).

---

### 3.2 Inventory Master (`/inventory`)

#### A. Deskripsi & Tujuan
Katalog induk seluruh material outsole dengan pengelolaan multi-spesifikasi yang mampu menangani puluhan ribu data secara responsif menggunakan *Server-Side Pagination*.

#### B. Struktur Data Spesifikasi Unik Outsole
Setiap item outsole diidentifikasi secara unik oleh kombinasi 8 parameter (*Composite Unique Constraint*):
1. **Model:** Nama model sepatu (contoh: `574`, `VL COURT 3.0`).
2. **Article:** Kode artikel (contoh: `G5741WL`, `HQ0170`).
3. **Color:** Nama/kode warna sol (contoh: `RAIN CLOUDE`, `SEA SALT`).
4. **Size:** Ukuran sol (contoh: `42`, `8.5`, `3K`).
5. **PO Number:** Nomor PO pemesanan barang.
6. **Bottom Treatment:** Perlakuan khusus (None, Spray, Marble, Spackle, Painting).
7. **Sole Type:** Asal/tipe sol (Lokal vs Impor).
8. **Component:** Bagian komponen sol (Midsole, Outsole, Wedge, CR Device).

#### C. Fitur Operasional
- **Badge Status Stok:**
  - 🟢 **Aman:** Stok di atas batas minimum.
  - 🟡 **Menipis (Warning):** Stok berada pada atau di bawah `minimumStock`.
  - 🔴 **Habis / Kritis:** Stok = 0.
- **Ekspor / Impor Excel:**
  - Tombol **Export Excel** untuk mengunduh seluruh database inventaris ke file `.xlsx`.
  - Tombol **Import Excel** dengan validasi otomatis format kolom dan nilai kuantitas.
- **Modal Edit Minimum Stock:** Pengguna Admin dapat menyesuaikan ambang batas peringatan minimum stok per varian outsole.

---

### 3.3 Inbound - Penerimaan Barang (`/inbound`)

#### A. Deskripsi & Tujuan
Modul pencatatan barang datang dari supplier pabrik atau sub-kontraktor untuk menambah stok secara akurat dan transparan.

#### B. Alur Bisnis & Validasi
1. Operator memindai label QR Code atau memilih spesifikasi outsole dari katalog.
2. Operator memasukkan jumlah barang masuk (**QTY Inbound**).
3. **Validasi Input:**
   - Nilai QTY harus bilangan bulat positif (`qty > 0`). Nilai 0 atau negatif akan ditolak oleh sistem.
4. **Hasil Eksekusi:**
   - Stok fisik pada tabel `Outsole` otomatis bertambah.
   - Record transaksi baru bertipe `INBOUND` tercatat di tabel `Transaction`.
   - Log jejak audit tersimpan di tabel `AuditLog`.
   - Notifikasi masuk ke sistem pemberitahuan *real-time*.

---

### 3.4 Outbound - Pengeluaran Barang (`/outbound`)

#### A. Deskripsi & Tujuan
Modul pemotongan stok ketika outsole disalurkan ke lini produksi, trial sampel development, atau transfer antar divisi.

#### B. Alur Bisnis & Proteksi Stok Minus (*Negative Stock Prevention*)
1. Operator memilih item outsole yang akan dikeluarkan (melalui scan QR atau pencarian).
2. Operator memasukkan jumlah pengeluaran (**QTY Outbound**) dan mengisi kolom catatan tujuan/pemohon.
3. **Validasi Kritis Anti-Minus:**
   - Sistem melakukan pengecekan *real-time*: `QTY Outbound ≤ Stok Tersedia`.
   - Jika QTY yang dimasukkan melebihi stok yang ada, sistem akan memblokir transaksi dengan pesan kesalahan: *"Stok tidak mencukupi untuk melakukan pengeluaran barang."*
4. **Hasil Eksekusi:**
   - Stok outsole berkurang secara otomatis.
   - Record transaksi bertipe `OUTBOUND` dibuat.
   - Jika stok setelah transaksi menjadi `≤ minimumStock`, sistem otomatis menyalakan alarm alert stok menipis di Dashboard dan Notification Bell.

---

### 3.5 Adjustment - Koreksi Stok (`/adjustment`)

#### A. Deskripsi & Tujuan
Modul penyesuaian administratif stok jika terdapat perbedaan antara catatan sistem dengan fisik di gudang akibat barang cacat (*defect*), hilang, atau kesalahan input sebelumnya.

#### B. Fitur & Validasi Audit
1. Pemilihan Aksi: **Penambahan (+)** atau **Pengurangan (-)** stok.
2. Masukkan QTY koreksi.
3. **Wajib Catatan (Mandatory Remarks):**
   - Kolom *Catatan Alasan Koreksi* **wajib diisi**. Transaksi tidak dapat disimpan jika alasan koreksi kosong.
4. **Validasi Pengurangan:** Pengurangan stok tidak boleh membuat stok akhir menjadi minus.
5. Record tercatat di `Transaction` bertipe `ADJUSTMENT` dan mencatat data perbandingan sebelum (*beforeData*) dan sesudah (*afterData*) di `AuditLog`.

---

### 3.6 Stock Opname - Audit Fisik Berkala (`/opname`)

#### A. Deskripsi & Tujuan
Modul audit stok periodik untuk menguji kebenaran catatan inventaris sistem terhadap perhitungan fisik nyata di rak gudang.

#### B. Alur Kerja Modul Opname
1. **Buka Sesi Opname Baru:**
   - Super Admin/Admin membuat sesi baru dengan nama unik (contoh: *"Opname Akhir Bulan Oktober 2026"*).
2. **Input Perhitungan Fisik (Stock Counting):**
   - Operator memasukkan jumlah fisik yang dihitung di lapangan pada kolom *Physical Stock*.
3. **Kalkulasi Selisih Otomatis (*Difference Calculation*):**
   - Sistem secara otomatis menghitung selisih: `Selisih = Physical Stock - System Stock`.
   - 🟢 Selisih = 0 (Sesuai / Match).
   - 🟡 Selisih > 0 (Surplus / Fisik Berlebih).
   - 🔴 Selisih < 0 (Defisit / Fisik Kurang).
4. **Rekonsiliasi & Finalisasi Sesi:**
   - Ketika sesi ditutup (*Finished*), stok sistem otomatis diperbarui menyesuaikan kuantitas fisik riil.
   - Riwayat selisih tersimpan permanen sebagai dokumen audit resmi.

---

### 3.7 Tooling MES - Bottom & Assembly Tooling (`/tooling`)

#### A. Deskripsi & Tujuan
Modul pelacakan kesiapan cetakan produksi dan alat perakitan sepatu dari tahap sampel hingga produksi massal.

#### B. Struktur Kategori & Tahapan Tooling
1. **Shoe Model Master:** Setiap tooling dikelompokkan berdasarkan model sepatu (contoh: *LITE RACER ADAPT 8.0*).
2. **Dua Kategori Tooling:**
   - **BOTTOM TOOLING:** Cetakan sol bawah (Mold Sole, Plate, Cutting Die).
   - **ASSEMBLY TOOLING:** Alat perakitan atas-bawah (3D Gauge, Gauge Top Net, Heel Jig).
3. **Tiga Fase Pengembangan (Phases):**
   - **SAMPLE:** Fase trial prototipe awal.
   - **EXTREME:** Fase uji ketahanan / kondisi ekstrem.
   - **FSR (Final Sample Review):** Fase konfirmasi cetakan akhir sebelum rilis massal.
4. **Parameter Pemantauan:**
   - QTY Cetakan (misal: `1 SET`, `3 PRS`).
   - Order Date (Tanggal pemesanan ke vendor cetakan).
   - Target ETA vs Actual ETA (Evaluasi ketepatan waktu vendor).
   - Status Fase: `VERIFIED`, `EXISTING`, `ON PROCESS`, `NOT USE`.
5. **Proteksi Duplikasi:** Diterapkan *Unique Constraint* `[modelId, name]`, mencegah input nama peralatan yang sama ganda pada satu model sepatu.

---

### 3.8 Dev Tooling Stock - BPM / TFM (`/bpm-tfm`)

#### A. Deskripsi & Tujuan
Modul pencatatan stok fisik peralatan cetak pengembangan (*Bottom Project Mold / Tooling Fabrication Mold*) yang berada di area Development.

#### B. Atribut Data:
- **Code Last:** Kode acuan sepatu pendukung tooling (contoh: `41TUR`, `574K`).
- **Tool Name & Type:** Nama cetakan dan jenis tooling.
- **Size & Gender:** Ukuran sol dan peruntukan gender (Men, Women, Kids).
- **Satuan:** Pilihan `SET`, `PAIR`, atau `PCS`.
- **devStock:** Kuantitas stok aktif yang tersedia di area pengembangan.
- **Integrasi Handover:** Jika tooling diserahterimakan ke departemen lain melalui menu Handover, stok di modul ini otomatis terpotong sesuai QTY yang diserahkan.

---

### 3.9 Shoe Last - Acuan Sepatu (`/lasts` & `/public/lasts`)

#### A. Deskripsi & Tujuan
Modul pengelolaan fisik acuan cetak sepatu (*Shoe Lasts*) dengan inovasi matriks ukuran tanpa batas (*Universal Size Matrix*).

#### B. Fitur Unggulan
1. **Universal Size Matrix (JSON-based):**
   - Menghilangkan batasan kolom ukuran konvensional. Satu nomor kode Last dapat memiliki stok multi-kategori dari ukuran bayi (`2K`, `3K`), anak-anak (`10K`, `12K`), hingga dewasa (`7`, `8.5`, `12`) dalam satu baris data fleksibel berbasis JSON.
2. **Kategori & Status:**
   - Kategori: `ADULT` atau `KIDS`.
   - Status: `NEW` (Acuan baru untuk model baru) atau `EXISTING` (Acuan lama yang sudah ada).
3. **Akses Publik Tanpa Login (`/public/lasts`):**
   - Disediakan tautan publik khusus yang aman dan responsif untuk pekerja lapangan.
   - Pekerja gudang/produksi cukup memindai QR Code pada rak acuan Last menggunakan smartphone tanpa perlu melakukan login akun untuk memeriksa ketersediaan stok Last.

---

### 3.10 Handover - Serah Terima & Cetak Dokumen (`/handover`)

#### A. Deskripsi & Tujuan
Modul pencatatan formal pemindahan tanggung jawab alat cetak/tooling antar bagian (misal: dari Development ke Production/Subkon).

#### B. Alur Bisnis & Format Dokumen Cetak
1. **Pencatatan Multi-Item:**
   - Masukkan tanggal serah terima.
   - Pihak Penyerah (*Giver*) dan Pihak Penerima (*Recipient*).
   - Daftar barang (Tool Name, Type, Size, Qty, Satuan, Keterangan).
2. **Fitur Cetak Bukti Serah Terima Resmi:**
   - Tombol **Print Handover Receipt** menghasilkan dokumen cetak standar industri:
     - Header resmi perusahaan & barcode nomor dokumen.
     - Tabel rincian barang serah terima yang rapi.
     - 3 Kolom tanda tangan resmi: **Pihak Menyerahkan**, **Pihak Menerima**, dan **Mengetahui (Supervisor/Manager)**.
     - Opsi cetak format lembar **A4** atau format cetak ringkas **Thermal**.

---

### 3.11 Reports & Ekspor Excel (`/reports`)

#### A. Deskripsi & Tujuan
Pusat rekapitulasi data logistik untuk kebutuhan pelaporan manajerial, audit bulanan, dan evaluasi rantai pasok.

#### B. Fitur Operasional
- **Filter Fleksibel:** Filter rentang tanggal awal dan tanggal akhir transaksi.
- **Filter Tipe Transaksi:** Pilihan Inbound saja, Outbound saja, Adjustment saja, atau Seluruh Transaksi.
- **Akumulasi Otomatis:** Kartu metrik otomatis menjumlahkan total unit barang masuk, keluar, dan selisih bersih (*net movement*).
- **Unduh File Excel Asli (`.xlsx`):** Mengonversi data tabel ke dalam file spreadsheet Excel dengan penamaan otomatis sesuai filter tanggal.

---

### 3.12 History & Audit Trail (`/history`)

#### A. Deskripsi & Tujuan
Buku besar log audit (*Audit Ledger*) yang mencatat setiap aksi pengguna secara permanen dan tidak dapat diubah atau dihapus (*immutable tamper-proof log*).

#### B. Parameter Rekaman Audit:
- **Timestamp:** Waktu tepat terjadinya aksi (tanggal, jam, menit, detik).
- **User Pelaksana:** Nama dan username pengguna yang mengeksekusi aksi.
- **Action Type:** `CREATE`, `UPDATE`, `DELETE`, `STOCK_IN`, `STOCK_OUT`, `STOCK_ADJUSTMENT`, `STOCK_OPNAME`.
- **Entity & Entity ID:** Modul dan ID data yang diubah.
- **Perubahan Data (Before & After Data):** Menyimpan snapshot JSON kondisi data sebelum diubah dan kondisi data sesudah diubah, memudahkan pelacakan jika terjadi ketidaksesuaian data.
- **Proteksi Akses:** Hanya dapat dibuka oleh pengguna yang memiliki izin `VIEW_HISTORY` atau role `SUPER_ADMIN`/`ADMIN`.

---

### 3.13 Purchase Tracking (`/tracking`)

#### A. Deskripsi & Tujuan
Modul pelacakan pembelian outsole per nomor pesanan (PO) dan artikel, dirancang terisolasi tanpa membebani tabel stok fisik sampai barang benar-benar tiba di pabrik.

#### B. Alur Bisnis & Siklus Status Pesanan (*Order Lifecycle*)
1. **Pengelompokan Batch ID:**
   - Satu form pengajuan dapat menginput puluhan ukuran sekaligus (Size Matrix). Semua baris ukuran tersebut diikat oleh satu `batchId` yang sama.
2. **Musim Pemesanan (Season):**
   - Filter dan pengelompokan berdasarkan musim produksi (misal: `SS27`, `FW27`).
3. **Spesifikasi 4 Komponen Sol:**
   - Midsole (Material & Warna).
   - Outsole (Material & Warna).
   - Wedge (Material & Warna).
   - CR Device / Heel Counter (Material & Warna).
   - Bottom Treatment (Spray, Marble, Spackle, dll.).
   - Gambar Sampel Sepatu (Upload/URL preview).
4. **4 Tahapan Status Pesanan (*Order Status Lifecycle*):**
   - ⚪ `NOT_ORDERED`: Artikel baru direncanakan, belum ada PO resmi.
   - 🔵 `ORDERED`: PO Number telah diterbitkan ke vendor supplier, memiliki target ETA kedatangan.
   - 🟡 `ON_PAINTING_SUPPLIER`: Komponen sedang dalam proses pewarnaan/finishing di supplier.
   - 🟢 `DONE`: Barang telah selesai dan siap dialihkan ke Inbound stok fisik.
5. **Drag and Drop Sorting:** Pengguna dapat menggeser baris pesanan secara interaktif untuk mengatur prioritas urutan di layar.

---

### 3.14 Color Conform History (`/conform-history`)

#### A. Deskripsi & Tujuan
Modul alur konfirmasi persetujuan warna sol (*Color Confirmation / CFM*) secara bertahap ke tim Project Developer (PD) untuk 4 komponen sol (Midsole, Outsole, Wedge, CR Device).

#### B. Desain Antarmuka Utama (Daftar Bersih)
Tabel utama dirancang ramping dan fokus dengan 4 kolom utama:
1. **Foto:** Thumbnail gambar sepatu/artikel yang jelas (atau ikon placeholder jika belum ada foto).
2. **Artikel & Model:** Kode artikel (contoh: `G5741WL`), nama model (`574`), serta ringkasan nama developer dan vendor.
3. **Progress Konfirmasi Warna:**
   - Badge status keseluruhan (*Belum Diajukan / All 4 Approved / Pending Review PD / Rejected*).
   - Progress bar persentase kelulusan (rasio `X / 4 Approved`).
   - 4 Mini Indikator Status Komponen (`MID`, `OUT`, `WDG`, `CR`) dengan jumlah putaran CFM yang sudah berjalan.
4. **Aksi:** Tombol **`Edit CFM`** di sisi kanan untuk membuka pusat kendali konfirmasi berupa Windowed Modal.

#### C. Fitur Windowed Modal Dialog (Pusat Kendali CFM)
Ketika tombol `Edit CFM` atau `+ New Color Conform` diklik, muncul modal dialog mengambang di tengah layar (*bukan side drawer samping*):
1. **Header Artikel & Kustomisasi Fleksibel:**
   - Menampilkan kode artikel dan nama model.
   - Menampilkan *Project Developer* dan *Supplier/Vendor*.
   - **Tombol `[✏️ Ubah]`**: Nama Project Developer dan Supplier **tidak dikunci mati**, melainkan dapat diubah secara bebas oleh user melalui dialog khusus untuk menyesuaikan PIC developer dan vendor aktual.
2. **4 Kartu Tab Komponen Sol:**
   - `MID` (Midsole) - Warna standar sky/biru.
   - `OUT` (Outsole) - Warna standar indigo/ungu.
   - 🟠 `WDG` (Wedge) - Dilengkapi dot aksen oranye.
   - 🟢 `CR` (CR Device) - Dilengkapi dot aksen hijau.
   - Kartu komponen yang sedang aktif ditandai dengan **border tebal biru/indigo** yang kontras.
3. **Kartu Rincian Komponen Terpilih:**
   - Ikon aksen komponen dan deskripsi alur.
   - Target Color (Standar PO): Warna acuan yang harus diikuti supplier.
   - Vendor / Supplier: Nama vendor spesifik komponen tersebut.
   - Riwayat Pengajuan: Total putaran CFM yang telah diajukan.
4. **Riwayat Putaran CFM Bertahap (*Multi-Round Timeline*):**
   - Menampilkan seluruh putaran pengajuan secara kronologis terbalik: `1st CFM`, `2nd CFM`, `3rd CFM`, dst.
   - Menampilkan tanggal pengajuan, warna standar target, warna sampel aktual dari vendor (dengan penanda khusus jika ada deviasi warna), catatan pemohon, dan hasil keputusan Project Developer beserta tanggal persetujuannya.
5. **Form Pengajuan Putaran Baru (`+ Ajukan Round #N`):**
   - Input tanggal pengajuan.
   - Input nama Project Developer (bebas kustomisasi).
   - Input nama Vendor komponen (bebas kustomisasi).
   - Input target color PO & warna sampel aktual supplier.
   - Input catatan pemohon.
6. **Dialog Evaluasi Keputusan PD (Review Decision):**
   - Tombol `⚡ Keputusan PD` memungkinkan Project Developer menetapkan hasil:
     - 🟢 `APPROVED`: Warna sampel disetujui, komponen dinyatakan OK.
     - 🔵 `APPROVED_WITH_NOTE`: Disetujui dengan catatan toleransi khusus.
     - 🔴 `REJECTED / REVISE`: Sampel ditolak, supplier wajib mengirim sampel revisi untuk putaran CFM berikutnya.
     - 🟡 `PENDING`: Masih dalam tahap pengujian visual/laboratorium.
   - Kolom feedback developer untuk memberikan arahan teknis perbaikan warna ke supplier.
7. **Proteksi Hapus Anti-Spam (*Spam-Proof Delete Protection*):**
   - Saat pengguna menghapus riwayat putaran CFM pada dialog konfirmasi *"Hapus Putaran CFM Ini?"*, tombol **Hapus** langsung **meredup (*opacity 50%*, *cursor not-allowed*)** dan menampilkan ikon animasi loading spinner (`Loader2 animate-spin`) dengan teks **`Menghapus...`**.
   - Tombol Batal dan backdrop dialog dikunci sementara hingga request selesai.
   - Terdapat pencegahan ganda di kode server/klien (`if (!deletingId || isDeleting) return`), memastikan user tidak dapat melakukan klik ganda (*spam-click*) yang dapat merusak integritas data.

---

### 3.15 Account Control & Security (`/account-control`)

#### A. Deskripsi & Tujuan
Panel otoritas tertinggi khusus **Super Admin** untuk mengatur akun pengguna, penugasan role, dan pemberian izin modular.

#### B. Fitur & Validasi Keamanan
1. **Pembuatan Pengguna Baru:**
   - Input: Nama Lengkap, Username (Unik), Email, Password (minimal 6 karakter), Role.
2. **Matriks Izin Granular (*Granular Permission Checkboxes*):**
   - Pilihan izin: `MANAGE_USERS`, `MANAGE_TRACKING`, `MANAGE_TOOLING`, `VIEW_HISTORY`, `MANAGE_INBOUND`, `MANAGE_OUTBOUND`, `MANAGE_OPNAME`.
3. **Reset Password Mandiri oleh Super Admin:**
   - Super Admin dapat mengubah password pengguna yang lupa kata sandi tanpa perlu mengetahui password lama.
4. **Deaktivasi Akun & Zombie Session Revocation:**
   - Akun yang dinonaktifkan (`isDeleted = true`) otomatis ditendang keluar dari sistem dalam hitungan milidetik saat melakukan interaksi berikutnya.

---

### 3.16 Fitur Pendukung: Notification Bell & Kamera Pemindai QR

1. **Notification Bell System:**
   - Ikon lonceng di sudut kanan atas antarmuka desktop dan mobile.
   - Menampilkan badge angka merah berisi jumlah notifikasi yang belum dibaca (*unread count*).
   - Menampilkan ringkasan aksi sistem terkini (misal: pengajuan CFM baru, keputusan review PD, barang masuk, serah terima cetakan).
   - Tombol **Mark as Read** untuk menandai notifikasi telah ditinjau.
2. **Kamera Pemindai QR & Barcode Terintegrasi:**
   - Setiap kolom pencarian kode inventaris dan form transaksi dilengkapi tombol kamera pemindai.
   - Memanfaatkan *HTML5 MediaDevices WebRTC* yang kompatibel dengan kamera belakang smartphone/tablet maupun webcam laptop.
   - Hasil pemindaian langsung dimasukkan ke kolom input tanpa memerlukan alat scanner fisik eksternal.

---

## 4. Matriks Kasus Uji QA (Test Scenarios & Test Cases)

Berikut adalah panduan kasus uji (*Test Cases*) yang wajib dieksekusi dan diverifikasi oleh tim Quality Assurance / Penguji Sistem:

### Kategori A: Autentikasi & Hak Akses (Security & RBAC)

| Test ID | Skenario Pengujian | Langkah Pengujian | Ekspektasi Hasil | Status (P/F) |
| :--- | :--- | :--- | :--- | :---: |
| **TC-AUTH-01** | Login dengan kredensial valid | Masukkan username & password yang benar, klik Sign In. | Berhasil masuk ke Dashboard sesuai role yang ditentukan. | [ ] |
| **TC-AUTH-02** | Login dengan password salah | Masukkan password sembarang, klik Sign In. | Muncul pesan error "Kredensial tidak valid", tidak bisa login. | [ ] |
| **TC-AUTH-03** | Pembatasan akses Account Control | Login sebagai `OPERATOR` atau `ADMIN`, ketik manual URL `/account-control`. | Sistem memblokir akses dan mengalihkan (*redirect*) ke Dashboard. | [ ] |
| **TC-AUTH-04** | Zombie Session Revocation | User A sedang aktif membuka halaman. Super Admin menonaktifkan akun User A dari panel Account Control. User A mencoba klik menu lain. | User A langsung di-*log out* paksa dan diarahkan ke layar login. | [ ] |

---

### Kategori B: Transaksi Inventaris & Anti-Stok Minus (Inventory Core)

| Test ID | Skenario Pengujian | Langkah Pengujian | Ekspektasi Hasil | Status (P/F) |
| :--- | :--- | :--- | :--- | :---: |
| **TC-INV-01** | Inbound Stok Normal | Pilih outsole, masukkan QTY = 50, klik Simpan Inbound. | Stok bertambah +50, muncul di Transaction dan Audit Log. | [ ] |
| **TC-INV-02** | Inbound Validasi QTY Negatif | Masukkan QTY = -10 atau 0 pada form Inbound. | Sistem memvalidasi dan menolak form (wajib > 0). | [ ] |
| **TC-INV-03** | Outbound Stok Mencukupi | Stok ada 100. Lakukan Outbound QTY = 30. | Stok berkurang menjadi 70, transaksi tercatat rapi. | [ ] |
| **TC-INV-04** | Outbound Melebihi Stok (Anti-Minus) | Stok ada 20. Coba lakukan Outbound QTY = 50. | Transaksi **ditolak**, muncul notifikasi error stok tidak mencukupi, stok tidak minus. | [ ] |
| **TC-INV-05** | Adjustment Wajib Catatan | Buka menu Adjustment, isi QTY = 5, kosongkan kolom Remarks/Catatan. | Form menolak submit dan mewajibkan pengisian alasan koreksi. | [ ] |
| **TC-INV-06** | Ekspor Excel Inventaris | Pada menu `/inventory`, klik tombol Export Excel. | Mengunduh file `.xlsx` berisi seluruh data inventaris yang valid. | [ ] |

---

### Kategori C: Color Conform History & Anti-Spam (CFM Module)

| Test ID | Skenario Pengujian | Langkah Pengujian | Ekspektasi Hasil | Status (P/F) |
| :--- | :--- | :--- | :--- | :---: |
| **TC-CFM-01** | Tampilan Tabel Ramping | Buka menu `/conform-history`. | Tabel menampilkan 4 kolom bersih: Foto, Artikel & Model, Progress Konfirmasi Warna, dan Aksi (Edit CFM). | [ ] |
| **TC-CFM-02** | Buka Windowed Modal Dialog | Klik tombol `Edit CFM` pada salah satu baris artikel. | Muncul modal pop-up di tengah layar (*Windowed Dialog*) dengan header artikel, 4 tab komponen sol, rincian komponen, dan riwayat putaran CFM. | [ ] |
| **TC-CFM-03** | Kustomisasi Nama Developer & Vendor | Pada header Windowed modal, klik tombol `[✏️ Ubah]`. Ganti nama PD menjadi "Budi (PD)" dan Vendor menjadi "Pou Chen", klik Simpan. | Data nama developer dan vendor langsung diperbarui pada header dan tabel tanpa terikat nama default. | [ ] |
| **TC-CFM-04** | Pengajuan Putaran CFM Baru | Pilih komponen `CR Device`. Klik `+ Ajukan 1st CFM CR`. Isi form (Tanggal, Target Color, Vendor, dsb.), klik Kirim. | Putaran CFM tersimpan sebagai `1st CFM` berstatus `PENDING`, counter putaran menjadi 1, dan progress bar ter-update. | [ ] |
| **TC-CFM-05** | Evaluasi & Keputusan PD | Klik `⚡ Keputusan PD` pada kartu putaran CFM. Pilih status `APPROVED`, isi feedback, klik Simpan. | Status putaran berubah menjadi `Approved`, badge komponen menjadi hijau, indikator kelulusan bertambah (misal: 1/4 Approved). | [ ] |
| **TC-CFM-06** | Pengujian Hapus Putaran Anti-Spam | Klik ikon tempat sampah (Hapus) pada putaran CFM. Pada dialog konfirmasi, klik tombol `Hapus` berkali-kali secara cepat (*spam click*). | - Tombol langsung meredup (*disabled, cursor not-allowed*).<br>- Teks tombol berubah menjadi `Menghapus...` dengan ikon spinner berputar.<br>- Tombol Batal terkunci.<br>- Hanya ada 1 request ke server, data terhapus sukses tanpa error duplikasi. | [ ] |

---

### Kategori D: Purchase Tracking, Tooling & Handover

| Test ID | Skenario Pengujian | Langkah Pengujian | Ekspektasi Hasil | Status (P/F) |
| :--- | :--- | :--- | :--- | :---: |
| **TC-TRK-01** | Siklus Status Pesanan Tracking | Ubah status dari `NOT_ORDERED` ke `ORDERED` lalu isi PO Number dan ETA. | Status pesanan ter-update dengan badge warna yang sesuai. | [ ] |
| **TC-TRK-02** | Drag and Drop Prioritas Pesanan | Geser urutan baris artikel pada tabel Purchase Tracking. | Urutan baris tersimpan dan tetap konsisten saat halaman di-refresh. | [ ] |
| **TC-TOOL-01** | Proteksi Duplikasi Tooling | Tambahkan tooling baru dengan nama yang persis sama pada satu Shoe Model yang sama. | Sistem menolak input dengan pesan error duplikasi nama tooling. | [ ] |
| **TC-LAST-01** | Universal Size Matrix Shoe Last | Buka menu `/lasts`, edit Last code tertentu, isi stok ukuran `3K` = 10 dan ukuran `9` = 25. | Matriks ukuran JSON tersimpan sempurna dan menampilkan total pasang yang sesuai. | [ ] |
| **TC-LAST-02** | Akses Scanner Publik Last | Buka URL `/public/lasts` pada jendela browser *Incognito* / tanpa login. | Halaman scanner publik terbuka dengan lancar dan dapat menampilkan informasi ketersediaan Last. | [ ] |
| **TC-HAND-01** | Cetak Bukti Serah Terima | Buka menu `/handover`, buat transaksi serah terima, lalu klik tombol Cetak. | Muncul jendela print preview dengan format resmi (header, tabel rincian, dan 3 kolom tanda tangan). | [ ] |

---

## 5. Protokol Pelaporan Bug & Kriteria Kelulusan UAT

### Tingkat Keparahan Cacat (*Defect Severity Levels*):
1. **Critical (S1):** Sistem *crash*, data hilang, celah keamanan otorisasi jebol, atau stok menjadi negatif.
2. **Major (S2):** Fitur utama tidak berjalan (misal: gagal simpan transaksi, ekspor Excel error, tombol macet) tanpa ada jalan pintas (*no workaround*).
3. **Minor (S3):** Masalah tampilan antarmuka (UI misalignment, teks terpotong, badge warna kurang kontras) namun fungsionalitas inti tetap bekerja.
4. **Trivial (S4):** Saran perbaikan kosmetik, *typo* penulisan label, atau penambahan ikon.

### Kriteria Kelulusan (*Acceptance Criteria for Sign-off*):
- **100% Kasus Uji Kategori A (Security/RBAC)** berstatus **PASS**.
- **100% Kasus Uji Kategori B (Inventory Core Anti-Minus)** berstatus **PASS**.
- **100% Kasus Uji Kategori C (CFM & Anti-Spam Delete)** berstatus **PASS**.
- Tidak ada cacat berstatus **Critical (S1)** atau **Major (S2)** yang masih terbuka (*open*).
- Dokumen UAT telah ditandatangani bersama oleh tim Quality & Testing, Operator Gudang, dan Lead Project Developer.

---
*Dokumen ini diterbitkan sebagai standar mutu pengujian perangkat lunak pergudangan pabrik. Harap simpan dokumen ini di tempat yang aman.* 🚀
