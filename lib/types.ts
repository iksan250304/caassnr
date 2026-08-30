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
  created_at: string;
  email?: string;
  deactivated?: boolean;
}

export interface Artwork {
  id: string;
  title: string;
  description: string | null;
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
  signed_at: string;
  actor?: Profile;
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