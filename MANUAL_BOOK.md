# 📘 Buku Panduan Sistem Inventaris Outsole & Tooling (V2.1.5 - Command Center)

Selamat datang di **Outsole Inventory Command Center**! Sistem ini merupakan pusat komando logistik pabrik *real-time* yang dirancang untuk mempercepat, mengamankan, dan mencatat setiap pergerakan barang (Inbound, Outbound, Handover, dan Tooling) di area gudang Anda.

Buku panduan ini akan memandu Anda memahami fitur-fitur yang ada, hak akses pengguna, serta cara pengoperasian setiap modul di dalam sistem.

---

## 🔐 1. Hak Akses (Role-Based Access Control)

Sistem ini sangat aman dan menerapkan proteksi berlapis. Akses Anda terhadap fitur dan menu bergantung pada **Peran (Role)** dan **Izin Spesifik (Permissions)** yang diberikan oleh Super Admin.

*   👑 **SUPER ADMIN**: Memiliki akses tak terbatas ke seluruh sistem. Hanya peran ini yang dapat mengakses **Account Control** untuk menambah, mengedit, mengubah izin (misal: *MANAGE_INBOUND*, *VIEW_HISTORY*), atau menghapus akun pengguna lain.
*   🛡️ **ADMIN**: Memiliki akses penuh ke operasional gudang, namun tidak dapat mengatur akun pengguna.
*   👷 **OPERATOR**: Akses terbatas yang disesuaikan dengan tugas harian. Menu yang muncul akan menyesuaikan dengan izin yang dimiliki.

> [!CAUTION]
> **Proteksi Sesi Keamanan Ketat (Zombie Session Protection)**
> Jika akun seorang pengguna tiba-tiba dinonaktifkan atau dihapus oleh Super Admin dari panel *Account Control*, maka pada detik itu juga, sistem akan mendeteksi dan secara otomatis menendang (*log out* paksa) pengguna tersebut meskipun ia sedang aktif bekerja di dalam sistem.

---

## 🧭 2. Panduan Modul Utama

Berikut adalah panduan penggunaan layar dan menu utama pada antarmuka Dasbor.

### 📊 A. Dashboard (Pusat Informasi)
Halaman pertama setelah Anda masuk (Login). Dirancang agar Anda dapat mengetahui detak jantung gudang hanya dalam hitungan detik.
*   **Metrik Cepat (Quick Metrics)**: Menampilkan total ringkasan barang, pergerakan barang hari ini, dan peringatan stok menipis.
*   **Grafik Visual (Charts)**: Grafik batang (Bar) dan lingkaran (Pie) interaktif untuk menganalisis tren pergerakan stok selama periode tertentu secara visual.
*   **Real-time Activity Feed**: Tabel umpan langsung yang menampilkan 20 aktivitas transaksi terbaru.
    *   *Catatan Warna QTY*: Angka berwarna **Hijau (+)** menandakan barang masuk (Inbound/Adjustment naik). Angka berwarna **Merah (-)** menandakan barang keluar (Outbound/Handover/Adjustment turun).

### 📦 B. Inventory (Manajemen Stok)
Pusat pengaturan fisik barang Anda. Di halaman ini, sistem mampu menangani puluhan ribu data tanpa melambat berkat teknologi *Server-Side Pagination*.
*   **Pencarian Pintar**: Ketik nama atau kode barang pada kolom pencarian, sistem akan menemukan barang secara presisi.
*   **[+] Inbound (Barang Masuk)**: Digunakan untuk menambah jumlah stok barang yang baru tiba.
*   **[-] Outbound (Barang Keluar)**: Digunakan untuk memotong stok saat barang dipakai untuk produksi.
*   **Adjustment (Penyesuaian Stok)**: Digunakan khusus jika ada selisih perhitungan fisik. **Wajib mengisi kolom "Catatan (Remarks)"** agar diaudit dengan jelas alasan penyesuaiannya.

### 🧰 C. Tooling (MES)
Halaman khusus untuk manajemen peralatan cetak/produksi (Tooling).
*   **Proteksi Nama Ganda**: Sistem memiliki perlindungan *Unique Constraint*. Anda tidak bisa memasukkan dua atau lebih peralatan dengan nama yang sama persis, mencegah duplikasi data ganda yang membingungkan.

### 🤝 D. Handover (Serah Terima)
Modul ini mencatat peminjaman, perpindahan antar-departemen, atau serah terima barang secara formal. Memastikan barang yang keluar untuk alasan non-produksi tetap tercatat jejak asalnya.

### 🕰️ E. History / Audit (Riwayat Transaksi Lengkap)
Buku besar (*Master Ledger*) dari seluruh aktivitas gudang.
*   **Akses Terbatas**: Menu ini sangat rahasia dan hanya dapat dibuka oleh pengguna yang diberi izin spesifik `VIEW_HISTORY` oleh Super Admin.
*   **Data Terpusat**: Menggabungkan seluruh data riwayat dari *Transaction* (Inbound/Outbound/Adjustment) dan *Handover* ke dalam satu tabel urut waktu dengan presisi tinggi.

---

## 📷 3. Fitur Khusus: Pemindai QR & Barcode (Scanner)

Untuk mempercepat pekerjaan tanpa harus mengetik manual, sistem telah dilengkapi dengan modul kamera pemindai internal!

1.  **Cari Ikon Kamera/Barcode**: Pada berbagai kolom pencarian (seperti di halaman *Inventory* atau *History*), Anda akan melihat ikon kecil bergambar Barcode/QR Code.
2.  **Klik & Pindai**: Klik ikon tersebut untuk mengaktifkan kamera perangkat Anda (HP, Tablet, atau Laptop).
3.  **Sorot Kode**: Arahkan kamera ke label QR Code/Barcode di fisik kardus atau barang.
4.  **Otomatis**: Teks kode akan otomatis masuk ke dalam kolom pencarian dan sistem akan langsung memfilter/mengeksekusi data tersebut tanpa penundaan.

---

*Disusun khusus untuk tim logistik dan operasional gudang.*
*Tetap teliti dalam menginput data, karena setiap pergerakan stok Anda tercatat oleh sistem.* 🚀
