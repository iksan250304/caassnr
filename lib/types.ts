export type Role = "design" | "product" | "purchasing" | "admin";

export type ArtworkStatus =
  | "draft"
  | "pending_product"
  | "approved_product"
  | "rejected_product"
  | "printed";

export type ApprovalAction =
  | "submitted"
  | "approved"
  | "rejected"
  | "sent_to_print";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  signature_url: string | null;
  last_notifications_seen_at?: string;
  created_at: string;
  email?: string;
  deactivated?: boolean;
}

export type Category =
  | "inner_box"
  | "pouch"
  | "ifu"
  | "label"
  | "master_carton"
  | "lainnya";

export const CATEGORY_LABEL: Record<Category, string> = {
  inner_box: "Inner Box",
  pouch: "Pouch",
  ifu: "IFU",
  label: "Label",
  master_carton: "Master Carton",
  lainnya: "Lainnya",
};

// Kode singkat yang dipakai sebagai prefix nama file, mis. "[InnerBox] nama-file"
export const CATEGORY_CODE: Record<Category, string> = {
  inner_box: "InnerBox",
  pouch: "Pouch",
  ifu: "IFU",
  label: "Label",
  master_carton: "MasterCarton",
  lainnya: "Lainnya",
};

export interface Artwork {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  file_url: string;
  version: number;
  status: ArtworkStatus;
  created_by: string;
  created_at: string;
  // joined
  creator?: Profile;
}

export interface ApprovalLog {
  id: string;
  artwork_id: string;
  actor_id: string;
  action: ApprovalAction;
  feedback_notes: string | null;
  annotated_pdf_url: string | null;
  signature_url: string | null;
  signed_at: string;
  actor?: Profile;
}

export type NotificationType =
  | "new_submission"
  | "resubmitted"
  | "revision_needed"
  | "ready_to_print"
  | "reminder";

export interface AppNotification {
  id: string;
  target_role: Role | null;
  recipient_id: string | null;
  artwork_id: string | null;
  type: NotificationType;
  message: string;
  created_at: string;
}

export const STATUS_LABEL: Record<ArtworkStatus, string> = {
  draft: "Draf",
  pending_product: "Menunggu Review Produk",
  approved_product: "Disetujui — Menunggu Cetak",
  rejected_product: "Revisi Diminta",
  printed: "Sudah Naik Cetak",
};

export const STATUS_COLOR: Record<ArtworkStatus, string> = {
  draft: "bg-inkfaint/10 text-inkfaint",
  pending_product: "bg-amber/10 text-amber",
  approved_product: "bg-approve/10 text-approve",
  rejected_product: "bg-press/10 text-press",
  printed: "bg-proof/10 text-proof",
};