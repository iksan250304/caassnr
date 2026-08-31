import { Category } from "./types";

// Kategori yang WAJIB mengisi checklist sebelum bisa submit ke Tim Produk.
export const CHECKLIST_REQUIRED_CATEGORIES: Category[] = ["inner_box", "pouch"];

// Daftar item checklist. Ganti/tambah/hapus item di sini sesuai kebutuhan Anda —
// dipakai otomatis di seluruh form upload & revisi.
export const CHECKLIST_ITEMS: { id: string; label: string }[] = [
  { id: "dieline", label: "Ukuran & dieline sudah sesuai spesifikasi cetak" },
  { id: "warna", label: "Warna (CMYK/Pantone) sudah sesuai standar" },
  { id: "barcode", label: "Barcode/QR sudah diverifikasi dan terbaca" },
  { id: "teks", label: "Seluruh teks & informasi produk sudah diperiksa (bebas typo)" },
  { id: "legal", label: "Informasi legal/regulasi (jika ada) sudah sesuai ketentuan" },
];