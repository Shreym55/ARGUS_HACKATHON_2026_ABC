import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../auth";
import { fetchJson } from "../../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "revision_requested";

type WorkflowStage = "submitted" | "screening" | "review" | "decision" | null;

type TeamMember = {
  name: string;
  designation: string;
  qualification?: string;
  experienceYears?: number;
};

type BudgetLine = {
  item: string;
  amount: number;
  justification?: string;
};

type VaultDocument = {
  id: string;
  fileName: string;
  documentType?: string;
  uploadedAt?: string;
};

type ApplicationDetail = {
  id: string;
  grantProgramId?: string;
  programmeCode?: string;
  programmeName?: string;
  status: ApplicationStatus;
  workflowStage?: WorkflowStage;
  applicationMode?: string;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  // Org
  orgName?: string;
  orgType?: string;
  orgState?: string;
  orgRegistrationNumber?: string;
  // Project
  projectTitle?: string;
  problemStatement?: string;
  proposedSolution?: string;
  expectedOutcomes?: string;
  projectLocation?: string;
  projectState?: string;
  projectDistrict?: string;
  projectDurationMonths?: number;
  beneficiaryCount?: number;
  beneficiaryDescription?: string;
  // Team, budget, docs
  teamMembers?: TeamMember[];
  budgetLines?: BudgetLine[];
  documents?: VaultDocument[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; bg: string; color: string }> = {
  draft:              { label: "Draft",               bg: "#e5e7eb", color: "#6b7280" },
  submitted:          { label: "Submitted",           bg: "#dbeafe", color: "#2563eb" },
  under_review:       { label: "Under Review",        bg: "#fef3c7", color: "#d97706" },
  approved:           { label: "Approved",            bg: "#dcfce7", color: "#16a34a" },
  rejected:           { label: "Rejected",            bg: "#fee2e2", color: "#dc2626" },
  revision_requested: { label: "Revision Requested",  bg: "#ede9fe", color: "#7c3aed" },
};

const STAGES: { key: WorkflowStage; label: string }[] = [
  { key: "submitted",  label: "Submitted"  },
  { key: "screening",  label: "Screening"  },
  { key: "review",     label: "Review"     },
  { key: "decision",   label: "Decision"   },
];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function truncateId(id: string) {
  return id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: ApplicationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "#e5e7eb", color: "#374151" };
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 14px",
      borderRadius: "999px",
      fontSize: "0.78rem",
      fontWeight: 700,
      background: cfg.bg,
      color: cfg.color,
      letterSpacing: "0.04em",
    }}>
      {cfg.label}
    </span>
  );
}

function ProgrammeBadge({ code }: { code?: string }) {
  if (!code) return null;
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: "999px",
      background: "#fef3c7",
      color: "#92400e",
      fontSize: "0.72rem",
      fontWeight: 700,
      letterSpacing: "0.08em",
    }}>
      {code}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div style={{ fontSize: "0.75rem", color: "#9a8c6e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "0.93rem", color: "#1a3a5c", lineHeight: 1.5 }}>
        {value ?? <span style={{ color: "#aaa" }}>—</span>}
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e6df", borderRadius: 16, padding: "1.5rem", marginBottom: "1.25rem" }}>
      <div style={{
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        fontSize: "0.72rem",
        color: "#9a8c6e",
        fontWeight: 700,
        marginBottom: "1rem",
        paddingBottom: "0.5rem",
        borderBottom: "1px solid #f3f2ee",
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── Stage Timeline ─────────────────────────────────────────────────────────────

function StageTimeline({ currentStage, status }: { currentStage?: WorkflowStage; status: ApplicationStatus }) {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage);
  const isTerminal = status === "approved" || status === "rejected";

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 0,
      background: "#fff",
      border: "1px solid #e8e6df",
      borderRadius: 16,
      padding: "1.5rem 2rem",
      marginBottom: "1.5rem",
      overflowX: "auto",
    }}>
      {STAGES.map((stage, i) => {
        const isCompleted = isTerminal || i < currentIdx;
        const isActive = !isTerminal && i === currentIdx;

        return (
          <div key={stage.key} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 80 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              {/* Dot */}
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.82rem", fontWeight: 700,
                background: isCompleted || isActive
                  ? (isActive ? "linear-gradient(135deg, #f1c96b, #c4a45a)" : "#c4a45a")
                  : "#f3f2ee",
                color: isCompleted || isActive ? "#fff" : "#b0a89a",
                border: isActive ? "2px solid #d89b35" : isCompleted ? "2px solid #c4a45a" : "2px solid #e0ddd7",
                boxShadow: isActive ? "0 0 0 4px rgba(196,164,90,0.18)" : "none",
                transition: "all 0.2s",
                flexShrink: 0,
              }}>
                {isCompleted ? "✓" : i + 1}
              </div>
              {/* Label */}
              <div style={{
                fontSize: "0.72rem",
                marginTop: "0.4rem",
                color: isActive ? "#c4a45a" : isCompleted ? "#9a8c6e" : "#b0a89a",
                fontWeight: isActive ? 700 : 500,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}>
                {stage.label}
              </div>
            </div>

            {/* Connector line */}
            {i < STAGES.length - 1 && (
              <div style={{
                height: 2,
                flex: 1,
                background: isCompleted ? "#c4a45a" : "#e8e6df",
                marginBottom: 18,
                minWidth: 20,
                transition: "background 0.2s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { token } = useAuth();

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "messages">("details");

  const justSubmitted = (location.state as { submitted?: boolean } | null)?.submitted;

  useEffect(() => {
    if (!id || !token) return;
    setIsLoading(true);
    fetchJson<Record<string, any>>(`/applications/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((raw) => {
        // Backend returns { ...appRow, programme, org, documents }
        // Map nested objects to flat fields the UI expects
        const app: ApplicationDetail = {
          id: raw.id,
          status: raw.status,
          workflowStage: raw.workflowStage ?? null,
          applicationMode: raw.applicationMode,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
          submittedAt: raw.submittedAt,
          grantProgramId: raw.grantProgramId,
          programmeCode: raw.programme?.programCode ?? null,
          programmeName: raw.programme?.name ?? null,
          orgName: raw.org?.name ?? raw.orgNameSnapshot ?? null,
          orgType: raw.org?.type ?? null,
          orgState: raw.org?.state ?? null,
          orgRegistrationNumber: raw.org?.registrationNumber ?? null,
          projectTitle: raw.projectTitle,
          problemStatement: raw.problemStatement,
          proposedSolution: raw.proposedSolution,
          expectedOutcomes: raw.expectedOutcomes,
          projectLocation: raw.projectLocation,
          projectState: raw.projectState,
          projectDistrict: raw.projectDistrict,
          projectDurationMonths: raw.projectDurationMonths,
          beneficiaryCount: raw.beneficiaryCount,
          beneficiaryDescription: raw.beneficiaryDescription,
          teamMembers: raw.teamMembers ?? [],
          budgetLines: raw.budgetLines ?? [],
          documents: (raw.documents ?? []).map((d: any) => ({
            id: d.id,
            fileName: d.fileName,
            documentType: d.documentType,
            uploadedAt: d.createdAt,
          })),
        };
        setApplication(app);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load application."))
      .finally(() => setIsLoading(false));
  }, [id, token]);

  const budgetTotal = (application?.budgetLines ?? []).reduce((s, l) => s + (Number(l.amount) || 0), 0);

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af", fontFamily: "DM Sans, sans-serif" }}>
        Loading application…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ padding: "1rem 1.25rem", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 12, color: "#991b1b" }}>
          {error}
        </div>
      </div>
    );
  }

  if (!application) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .app-detail-page {
          max-width: 860px;
          margin: 0 auto;
          padding: 2rem;
          font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
        }
        .detail-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 2rem; }
        @media (max-width: 600px) { .detail-grid-2 { grid-template-columns: 1fr; } }
        .team-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
        .team-table th { text-align: left; padding: 0.45rem 0.75rem; color: #9a8c6e; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #e8e6df; }
        .team-table td { padding: 0.6rem 0.75rem; color: #333; border-bottom: 1px solid #f3f2ee; }
        .team-table tr:last-child td { border-bottom: none; }
        .tab-bar { display: flex; gap: 0; border-bottom: 2px solid #e8e6df; margin-bottom: 1.5rem; }
        .tab-btn { padding: 0.65rem 1.25rem; border: none; background: none; cursor: pointer; font-size: 0.9rem; font-family: inherit; color: #6b7280; font-weight: 500; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color 0.15s, border-color 0.15s; }
        .tab-btn.active { color: #c4a45a; font-weight: 700; border-bottom-color: #c4a45a; }
        .tab-btn:hover:not(.active) { color: #1a3a5c; }
        .success-banner { background: #f0fdf4; border: 1px solid #bbf7d0; borderRadius: 12px; padding: 0.85rem 1.1rem; color: #166534; font-size: 0.9rem; font-weight: 500; margin-bottom: 1.5rem; }
        .empty-messages { text-align: center; padding: 4rem 2rem; color: #9ca3af; }
        .empty-messages__icon { font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.45; }
        .empty-messages__title { font-size: 1rem; font-weight: 600; color: #6b7280; margin: 0 0 0.4rem; }
        .empty-messages__body { font-size: 0.88rem; color: #9ca3af; max-width: 320px; margin: 0 auto; }
      `}</style>

      <div className="app-detail-page">
        {/* Success banner */}
        {justSubmitted && (
          <div className="success-banner">
            Your application has been submitted successfully. We'll review it and be in touch.
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: "0.72rem", color: "#9a8c6e", fontWeight: 700, margin: "0 0 0.35rem" }}>
            Applicant Portal
          </p>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: "1.45rem", fontWeight: 700, color: "#1a3a5c", margin: "0 0 0.5rem" }}>
                {application.projectTitle || "Application Details"}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.8rem", color: "#9a8c6e", fontFamily: "monospace", background: "#f3f2ee", padding: "2px 8px", borderRadius: 6 }}>
                  #{truncateId(application.id)}
                </span>
                <ProgrammeBadge code={application.programmeCode} />
                <StatusPill status={application.status} />
                {application.workflowStage && (
                  <span style={{ fontSize: "0.78rem", color: "#6b7280", background: "#f3f2ee", padding: "2px 8px", borderRadius: 6 }}>
                    Stage: {application.workflowStage.charAt(0).toUpperCase() + application.workflowStage.slice(1)}
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: "0.8rem", color: "#9a8c6e", flexShrink: 0 }}>
              {application.submittedAt && <div>Submitted: {formatDate(application.submittedAt)}</div>}
              {application.updatedAt && <div>Updated: {formatDate(application.updatedAt)}</div>}
            </div>
          </div>
        </div>

        {/* ── Stage Timeline ── */}
        <StageTimeline currentStage={application.workflowStage} status={application.status} />

        {/* ── Tabs ── */}
        <div className="tab-bar">
          <button
            className={`tab-btn${activeTab === "details" ? " active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            Application Details
          </button>
          <button
            className={`tab-btn${activeTab === "messages" ? " active" : ""}`}
            onClick={() => setActiveTab("messages")}
          >
            Messages
          </button>
        </div>

        {/* ── Application Details Tab ── */}
        {activeTab === "details" && (
          <>
            {/* Organisation */}
            <SectionCard title="Organisation">
              <div className="detail-grid-2">
                <InfoRow label="Organisation Name" value={application.orgName} />
                <InfoRow label="Organisation Type" value={application.orgType} />
                <InfoRow label="State" value={application.orgState} />
                <InfoRow label="Registration Number" value={application.orgRegistrationNumber} />
              </div>
            </SectionCard>

            {/* Project */}
            <SectionCard title="Project">
              <InfoRow label="Project Title" value={application.projectTitle} />
              {application.problemStatement && (
                <InfoRow label="Problem Statement" value={application.problemStatement} />
              )}
              {application.proposedSolution && (
                <InfoRow label="Proposed Solution" value={application.proposedSolution} />
              )}
              {application.expectedOutcomes && (
                <InfoRow label="Expected Outcomes" value={application.expectedOutcomes} />
              )}
              <div className="detail-grid-2">
                <InfoRow label="Location" value={application.projectLocation} />
                <InfoRow label="State" value={application.projectState} />
                <InfoRow label="District / City" value={application.projectDistrict} />
                <InfoRow label="Duration" value={application.projectDurationMonths ? `${application.projectDurationMonths} months` : undefined} />
                <InfoRow label="Number of Beneficiaries" value={application.beneficiaryCount?.toLocaleString("en-IN")} />
              </div>
              {application.beneficiaryDescription && (
                <InfoRow label="Beneficiary Description" value={application.beneficiaryDescription} />
              )}
            </SectionCard>

            {/* Team */}
            {(application.teamMembers ?? []).length > 0 && (
              <SectionCard title={`Team (${application.teamMembers!.length} member${application.teamMembers!.length !== 1 ? "s" : ""})`}>
                <table className="team-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Designation</th>
                      <th>Qualification</th>
                      <th>Experience</th>
                    </tr>
                  </thead>
                  <tbody>
                    {application.teamMembers!.map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: "#1a3a5c" }}>{m.name}</td>
                        <td>{m.designation}</td>
                        <td>{m.qualification || "—"}</td>
                        <td>{m.experienceYears != null ? `${m.experienceYears} yrs` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            )}

            {/* Budget */}
            {(application.budgetLines ?? []).length > 0 && (
              <SectionCard title="Budget">
                {/* Total callout */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(241,201,107,0.1), rgba(216,155,53,0.1))",
                  border: "1px solid #e8d9a5",
                  borderRadius: 12,
                  padding: "0.85rem 1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}>
                  <span style={{ fontSize: "0.8rem", color: "#9a8c6e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Total Budget
                  </span>
                  <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1a3a5c" }}>
                    {formatINR(budgetTotal)}
                  </span>
                </div>

                <table className="team-table">
                  <thead>
                    <tr>
                      <th>Line Item</th>
                      <th>Amount (INR)</th>
                      <th>Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {application.budgetLines!.map((l, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: "#1a3a5c" }}>{l.item}</td>
                        <td style={{ fontWeight: 600 }}>{formatINR(Number(l.amount))}</td>
                        <td style={{ color: "#6b7280" }}>{l.justification || "—"}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ fontWeight: 700, color: "#1a3a5c", borderTop: "2px solid #e8e6df", paddingTop: "0.75rem" }}>Total</td>
                      <td style={{ fontWeight: 800, color: "#c4a45a", borderTop: "2px solid #e8e6df", paddingTop: "0.75rem", fontSize: "1rem" }}>
                        {formatINR(budgetTotal)}
                      </td>
                      <td style={{ borderTop: "2px solid #e8e6df" }} />
                    </tr>
                  </tbody>
                </table>
              </SectionCard>
            )}

            {/* Documents */}
            {(application.documents ?? []).length > 0 ? (
              <SectionCard title="Attached Documents">
                {application.documents!.map((doc) => (
                  <div key={doc.id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.65rem 0.85rem",
                    border: "1px solid #e8e6df",
                    borderRadius: 10,
                    marginBottom: "0.5rem",
                    background: "#fff",
                  }}>
                    <span style={{ fontSize: "1.1rem" }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.9rem", color: "#1a3a5c", fontWeight: 500 }}>{doc.fileName}</div>
                      {doc.documentType && (
                        <div style={{ fontSize: "0.75rem", color: "#9a8c6e" }}>{doc.documentType}</div>
                      )}
                    </div>
                    {doc.uploadedAt && (
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{formatDate(doc.uploadedAt)}</span>
                    )}
                  </div>
                ))}
              </SectionCard>
            ) : (
              <SectionCard title="Attached Documents">
                <p style={{ fontSize: "0.88rem", color: "#9ca3af", margin: 0 }}>No documents attached.</p>
              </SectionCard>
            )}
          </>
        )}

        {/* ── Messages Tab ── */}
        {activeTab === "messages" && (
          <div style={{ background: "#fff", border: "1px solid #e8e6df", borderRadius: 16, minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="empty-messages">
              <div className="empty-messages__icon">💬</div>
              <h3 className="empty-messages__title">No messages yet</h3>
              <p className="empty-messages__body">
                Program Officer communications will appear here once your application enters review.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
