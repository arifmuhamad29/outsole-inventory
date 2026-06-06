export const PERMISSIONS = [
  { id: "VIEW_HANDOVER", label: "Lihat Data Handover" },
  { id: "CREATE_HANDOVER", label: "Buat Handover Baru" },
  { id: "DELETE_HANDOVER", label: "Hapus Data Handover" },
  { id: "VIEW_INVENTORY", label: "Lihat Stok BPM/TFM" },
  { id: "MANAGE_USERS", label: "Kelola Akun (Super Admin)" }
] as const;

export type PermissionId = typeof PERMISSIONS[number]["id"];
