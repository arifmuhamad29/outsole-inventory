export const PERMISSIONS = [
  { id: "VIEW_HANDOVER", label: "Lihat Data Handover" },
  { id: "CREATE_HANDOVER", label: "Buat Handover Baru" },
  { id: "DELETE_HANDOVER", label: "Hapus Data Handover" },
  { id: "VIEW_INVENTORY", label: "Lihat Stok BPM/TFM" },
  { id: "EDIT_INVENTORY", label: "Edit Stok BPM/TFM" },
  { id: "MANAGE_USERS", label: "Kelola Akun (Super Admin)" },
  { id: "VIEW_TOOLING_MES", label: "Lihat Tooling (MES)" },
  { id: "EDIT_TOOLING_MES", label: "Edit Tooling (MES)" },
  { id: "MANAGE_STOCK_OPNAME", label: "Kelola Stock Opname" },
  { id: "MANAGE_INBOUND", label: "Kelola Inbound (Scan In)" },
  { id: "MANAGE_OUTBOUND", label: "Kelola Outbound (Scan Out)" },
  { id: "VIEW_HISTORY", label: "Lihat Riwayat Transaksi" },
  { id: "VIEW_TRACKING", label: "Lihat Tracking Pembelian" },
  { id: "MANAGE_TRACKING", label: "Kelola Tracking Pembelian" }
] as const;

export type PermissionId = typeof PERMISSIONS[number]["id"];
