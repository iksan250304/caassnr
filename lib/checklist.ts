import { Category } from "./types";

// Kategori yang WAJIB mengisi checklist sebelum bisa submit ke Tim Produk.
export const CHECKLIST_REQUIRED_CATEGORIES: Category[] = ["inner_box", "pouch"];

// Daftar item checklist. Ganti/tambah/hapus item di sini sesuai kebutuhan Anda —
// dipakai otomatis di seluruh form upload & revisi.
export const CHECKLIST_ITEMS: { id: string; label: string }[] = [
  { id: "Sesuai NIE", label: "Sudah Sesuai NIE Kemenkes" },
  { id: "Konten Sudah Sesuai", label: "Konten sudah sesuai dengan spesifikasi" },
  { id: "Font Tidak Missing", label: "Font yang digunakan tidak missing" },
  { id: "Ukuran Sudah Sesuai", label: "Ukuran & dieline sudah sesuai spesifikasi cetak" },
  { id: "Warna", label: "Warna (CMYK/Pantone) sudah sesuai standar" },
];