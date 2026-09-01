"use client";

import { useState } from "react";
import { ApprovalLog } from "@/lib/types";
import AdminUserManager from "./AdminUserManager";
import AdminAuditTrail from "./AdminAuditTrail";

type LogRow = ApprovalLog & {
  actor: { full_name: string; role: string };
  artwork: { title: string; status: string };
};

export default function AdminTabs({ logs }: { logs: LogRow[] }) {
  const [tab, setTab] = useState<"pengguna" | "audit">("pengguna");

  return (
    <div className="flex flex-col gap-4">
      {/* Inline style langsung biar kontras selalu aman walau cache/build sempat stale */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab("pengguna")}
          style={
            tab === "pengguna"
              ? { backgroundColor: "#1A1A1A", color: "#FFFFFF", borderColor: "#1A1A1A" }
              : { backgroundColor: "#FFFFFF", color: "#1A1A1A", borderColor: "rgba(26,26,26,0.2)" }
          }
          className="border px-4 py-2 font-mono text-xs uppercase tracking-wider transition"
        >
          Pengguna
        </button>
        <button
          onClick={() => setTab("audit")}
          style={
            tab === "audit"
              ? { backgroundColor: "#1A1A1A", color: "#FFFFFF", borderColor: "#1A1A1A" }
              : { backgroundColor: "#FFFFFF", color: "#1A1A1A", borderColor: "rgba(26,26,26,0.2)" }
          }
          className="border px-4 py-2 font-mono text-xs uppercase tracking-wider transition"
        >
          Audit Trail
        </button>
      </div>

      {tab === "pengguna" && <AdminUserManager />}
      {tab === "audit" && <AdminAuditTrail logs={logs} />}
    </div>
  );
}
