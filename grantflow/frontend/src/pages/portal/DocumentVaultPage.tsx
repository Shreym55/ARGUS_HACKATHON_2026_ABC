import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../auth";
import { fetchJson } from "../../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type DocumentType = "registration_certificate" | "audited_financials" | "80g_certificate";

type VaultDocument = {
  id: string;
  documentType: DocumentType;
  fileName: string;
  createdAt: string;
  fileSize?: number;
};

type SlotConfig = {
  type: DocumentType;
  label: string;
  icon: string;
  description: string;
};

// ── Slot configuration ────────────────────────────────────────────────────────

const SLOTS: SlotConfig[] = [
  {
    type: "registration_certificate",
    label: "Registration Certificate",
    icon: "📄",
    description: "Official certificate of registration for your organisation.",
  },
  {
    type: "audited_financials",
    label: "Audited Financials",
    icon: "📊",
    description: "Latest audited financial statements (last 2 years preferred).",
  },
  {
    type: "80g_certificate",
    label: "80G Certificate",
    icon: "🏛",
    description: "Certificate under Section 80G of the Income Tax Act, if applicable.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DocumentVaultPage() {
  const { token } = useAuth();

  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Per-slot state: uploading / deleting / error
  const [uploadingSlot, setUploadingSlot] = useState<DocumentType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [slotErrors, setSlotErrors] = useState<Partial<Record<DocumentType, string>>>({});
  const [slotSuccess, setSlotSuccess] = useState<Partial<Record<DocumentType, string>>>({});

  // Hidden file inputs — one per slot
  const fileInputRefs = useRef<Partial<Record<DocumentType, HTMLInputElement>>>({});

  async function loadDocuments() {
    if (!token) return;
    try {
      const data = await fetchJson<VaultDocument[]>("/document-vault", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function clearSlotFeedback(type: DocumentType) {
    setSlotErrors((prev) => { const n = { ...prev }; delete n[type]; return n; });
    setSlotSuccess((prev) => { const n = { ...prev }; delete n[type]; return n; });
  }

  function triggerFilePicker(type: DocumentType) {
    clearSlotFeedback(type);
    fileInputRefs.current[type]?.click();
  }

  async function handleFileChange(type: DocumentType, file: File | null) {
    if (!file || !token) return;

    // Client-side validation
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

    if (file.size > MAX_BYTES) {
      setSlotErrors((prev) => ({ ...prev, [type]: `File too large. Maximum size is 10 MB.` }));
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setSlotErrors((prev) => ({ ...prev, [type]: `Invalid file type. Accepted: PDF, JPG, PNG.` }));
      return;
    }

    setUploadingSlot(type);
    clearSlotFeedback(type);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/document-vault/upload?documentType=${encodeURIComponent(type)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const msg =
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : `Upload failed (${res.status})`;
        throw new Error(msg);
      }

      setSlotSuccess((prev) => ({ ...prev, [type]: "Uploaded successfully." }));
      await loadDocuments();
    } catch (err) {
      setSlotErrors((prev) => ({
        ...prev,
        [type]: err instanceof Error ? err.message : "Upload failed.",
      }));
    } finally {
      setUploadingSlot(null);
      // Reset the input so the same file can be re-uploaded if needed
      if (fileInputRefs.current[type]) {
        fileInputRefs.current[type]!.value = "";
      }
    }
  }

  async function handleDelete(doc: VaultDocument) {
    if (!token) return;
    if (!window.confirm(`Delete "${doc.fileName}"?`)) return;

    setDeletingId(doc.id);

    try {
      await fetchJson<{ success: boolean }>(`/document-vault/${doc.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      const type = doc.documentType;
      setSlotErrors((prev) => ({
        ...prev,
        [type]: err instanceof Error ? err.message : "Delete failed.",
      }));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <style>{`
        .vault-page {
          max-width: 760px;
          margin: 0 auto;
          padding: 2rem;
          font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
        }

        .vault-page__eyebrow {
          margin: 0 0 0.35rem;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #185fa5;
        }

        .vault-page__title {
          margin: 0 0 0.35rem;
          font-size: 1.6rem;
          font-weight: 700;
          color: #1a3a5c;
          line-height: 1.15;
        }

        .vault-page__subtitle {
          margin: 0 0 0.5rem;
          font-size: 0.9rem;
          color: #6b7280;
        }

        .vault-hint {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: #9ca3af;
          margin-bottom: 1.75rem;
          padding: 0.45rem 0.85rem;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .vault-slot {
          background: #fff;
          border: 1px solid #e8e6df;
          border-radius: 16px;
          padding: 1.4rem 1.5rem;
          margin-bottom: 1rem;
          transition: box-shadow 0.15s, border-color 0.15s;
        }

        .vault-slot:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          border-color: #d1d5db;
        }

        .vault-slot__header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .vault-slot__icon {
          font-size: 1.6rem;
          line-height: 1;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .vault-slot__info {
          flex: 1;
          min-width: 0;
        }

        .vault-slot__label {
          font-size: 0.97rem;
          font-weight: 600;
          color: #1a3a5c;
          margin: 0 0 0.2rem;
        }

        .vault-slot__desc {
          font-size: 0.83rem;
          color: #6b7280;
          margin: 0;
        }

        .vault-slot__status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.9rem;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-dot--uploaded { background: #22c55e; }
        .status-dot--empty    { background: #d1d5db; }

        .status-text--uploaded {
          font-size: 0.85rem;
          font-weight: 500;
          color: #166534;
        }

        .status-text--empty {
          font-size: 0.85rem;
          color: #9ca3af;
        }

        .vault-file-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.9rem;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          margin-bottom: 0.85rem;
          flex-wrap: wrap;
        }

        .vault-file-info__name {
          flex: 1;
          font-size: 0.88rem;
          font-weight: 500;
          color: #166534;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }

        .vault-file-info__meta {
          font-size: 0.78rem;
          color: #4ade80;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .vault-slot__actions {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .upload-btn {
          padding: 0.55rem 1.1rem;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          background: #1a3a5c;
          color: #fff;
          transition: background 0.15s, transform 0.12s;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        .upload-btn:hover:not(:disabled) {
          background: #153050;
          transform: translateY(-1px);
        }

        .upload-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .replace-btn {
          padding: 0.55rem 1.1rem;
          border-radius: 999px;
          border: 1px solid #d1d5db;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          background: #fff;
          color: #374151;
          transition: background 0.15s, transform 0.12s;
        }

        .replace-btn:hover:not(:disabled) {
          background: #f9fafb;
          transform: translateY(-1px);
        }

        .replace-btn:disabled { opacity: 0.6; cursor: wait; }

        .delete-btn {
          padding: 0.55rem 1.1rem;
          border-radius: 999px;
          border: 1px solid #fecaca;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          background: #fff;
          color: #dc2626;
          transition: background 0.15s, transform 0.12s;
        }

        .delete-btn:hover:not(:disabled) {
          background: #fff5f5;
          transform: translateY(-1px);
        }

        .delete-btn:disabled { opacity: 0.6; cursor: wait; }

        .slot-error {
          font-size: 0.83rem;
          color: #dc2626;
          margin-top: 0.5rem;
          padding: 0.45rem 0.75rem;
          background: #fff5f5;
          border-radius: 8px;
          border: 1px solid #fecaca;
        }

        .slot-success {
          font-size: 0.83rem;
          color: #166534;
          margin-top: 0.5rem;
          padding: 0.45rem 0.75rem;
          background: #f0fdf4;
          border-radius: 8px;
          border: 1px solid #bbf7d0;
        }

        .vault-loading {
          padding: 3rem;
          text-align: center;
          color: #9ca3af;
          font-size: 0.92rem;
        }

        .vault-load-error {
          padding: 1.1rem;
          border-radius: 12px;
          background: #fff5f5;
          border: 1px solid #fecaca;
          color: #991b1b;
          font-size: 0.9rem;
        }
      `}</style>

      <div className="vault-page">
        <p className="vault-page__eyebrow">Applicant Portal</p>
        <h1 className="vault-page__title">Document Vault</h1>
        <p className="vault-page__subtitle">
          Upload and manage your key compliance documents. These are reused across applications.
        </p>

        <div className="vault-hint">
          <span>📎</span>
          Accepted formats: PDF, JPG, PNG — Max file size: 10 MB per document
        </div>

        {isLoading ? (
          <div className="vault-loading">Loading documents…</div>
        ) : loadError ? (
          <div className="vault-load-error">{loadError}</div>
        ) : (
          SLOTS.map((slot) => {
            const uploaded = documents.find((d) => d.documentType === slot.type);
            const isUploading = uploadingSlot === slot.type;
            const isDeleting = uploaded ? deletingId === uploaded.id : false;
            const slotErr = slotErrors[slot.type];
            const slotOk = slotSuccess[slot.type];

            return (
              <div key={slot.type} className="vault-slot">
                {/* Hidden file input */}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  style={{ display: "none" }}
                  ref={(el) => {
                    if (el) fileInputRefs.current[slot.type] = el;
                  }}
                  onChange={(e) => handleFileChange(slot.type, e.target.files?.[0] ?? null)}
                />

                <div className="vault-slot__header">
                  <div className="vault-slot__icon">{slot.icon}</div>
                  <div className="vault-slot__info">
                    <p className="vault-slot__label">{slot.label}</p>
                    <p className="vault-slot__desc">{slot.description}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="vault-slot__status">
                  <span className={`status-dot status-dot--${uploaded ? "uploaded" : "empty"}`} />
                  <span className={`status-text--${uploaded ? "uploaded" : "empty"}`}>
                    {uploaded ? "Document uploaded" : "No document uploaded"}
                  </span>
                </div>

                {/* File info row */}
                {uploaded && (
                  <div className="vault-file-info">
                    <span className="vault-file-info__name" title={uploaded.fileName}>
                      📎 {uploaded.fileName}
                    </span>
                    <span className="vault-file-info__meta">
                      {uploaded.fileSize ? formatBytes(uploaded.fileSize) + " · " : ""}
                      {formatDate(uploaded.createdAt)}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="vault-slot__actions">
                  {!uploaded ? (
                    <button
                      type="button"
                      className="upload-btn"
                      disabled={isUploading}
                      onClick={() => triggerFilePicker(slot.type)}
                    >
                      {isUploading ? "Uploading…" : "↑ Upload document"}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="replace-btn"
                        disabled={isUploading || isDeleting}
                        onClick={() => triggerFilePicker(slot.type)}
                      >
                        {isUploading ? "Uploading…" : "Replace"}
                      </button>
                      <button
                        type="button"
                        className="delete-btn"
                        disabled={isDeleting || isUploading}
                        onClick={() => handleDelete(uploaded)}
                      >
                        {isDeleting ? "Deleting…" : "Delete"}
                      </button>
                    </>
                  )}
                </div>

                {slotErr && <div className="slot-error">⚠ {slotErr}</div>}
                {slotOk && <div className="slot-success">✓ {slotOk}</div>}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
