import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import { fetchJson } from "../../services/api";

// ── Types ────────────────────────────────────────────────────────────────────

type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "revision_requested";
type WorkflowStage = "submitted" | "screening" | "review" | "decision" | null;

type Application = {
  id: string;
  programmeCode: string | null;
  programmeName: string | null;
  projectTitle: string | null;
  status: ApplicationStatus;
  workflowStage: WorkflowStage;
  updatedAt: string;
};

type OrgProfile = {
  id?: string;
  name?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  revision_requested: "Revision Requested",
};

const STATUS_STYLES: Record<ApplicationStatus, React.CSSProperties> = {
  draft: { background: "#e5e7eb", color: "#374151" },
  submitted: { background: "#dbeafe", color: "#1e40af" },
  under_review: { background: "#fef3c7", color: "#92400e" },
  approved: { background: "#dcfce7", color: "#166534" },
  rejected: { background: "#fee2e2", color: "#991b1b" },
  revision_requested: { background: "#ede9fe", color: "#6d28d9" },
};

const STAGE_LABELS: Record<NonNullable<WorkflowStage>, string> = {
  submitted: "Submitted",
  screening: "AI Screening",
  review: "Expert Review",
  decision: "Final Decision",
};

const PROGRAMME_BADGE_COLOURS: Record<string, { bg: string; color: string }> = {
  CDG: { bg: "#ede9fe", color: "#5b21b6" },
  EIG: { bg: "#dbeafe", color: "#1e40af" },
  ECAG: { bg: "#d1fae5", color: "#065f46" },
};

function ProgrammeBadge({ code }: { code: string }) {
  const colours = PROGRAMME_BADGE_COLOURS[code] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.06em",
        background: colours.bg,
        color: colours.color,
      }}
    >
      {code}
    </span>
  );
}

function StatusPill({ status }: { status: ApplicationStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 12px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
        ...style,
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function ApplicantDashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [appsError, setAppsError] = useState("");

  const [orgProfile, setOrgProfile] = useState<OrgProfile | null>(null);
  const [orgBannerDismissed, setOrgBannerDismissed] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Load applications
    fetchJson<Application[]>("/applications", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => setApplications(data))
      .catch((err) => setAppsError(err instanceof Error ? err.message : "Failed to load applications."))
      .finally(() => setLoadingApps(false));

    // Load org profile (non-blocking — just used for banner)
    fetchJson<OrgProfile>("/org-profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => setOrgProfile(data))
      .catch(() => setOrgProfile(null));
  }, [token]);

  const showOrgBanner = !orgBannerDismissed && (!orgProfile || !orgProfile.name);

  return (
    <>
      <style>{`
        .applicant-dashboard {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
        }

        .dashboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.75rem;
          flex-wrap: wrap;
        }

        .dashboard-header__left {}

        .dashboard-header__eyebrow {
          margin: 0 0 0.35rem;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #185fa5;
        }

        .dashboard-header__title {
          margin: 0 0 0.3rem;
          font-size: 1.6rem;
          font-weight: 700;
          color: #1a3a5c;
          line-height: 1.15;
        }

        .dashboard-header__subtitle {
          margin: 0;
          font-size: 0.9rem;
          color: #6b7280;
        }

        .org-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1.1rem;
          border-radius: 12px;
          background: #fffbeb;
          border: 1px solid #fcd34d;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          color: #78350f;
          flex-wrap: wrap;
        }

        .org-banner__text {
          flex: 1;
          min-width: 200px;
        }

        .org-banner__link {
          font-weight: 600;
          color: #b45309;
          text-decoration: underline;
          text-underline-offset: 2px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          font: inherit;
        }

        .org-banner__link:hover {
          color: #92400e;
        }

        .org-banner__dismiss {
          background: none;
          border: none;
          cursor: pointer;
          color: #b45309;
          font-size: 1rem;
          padding: 0 4px;
          line-height: 1;
          flex-shrink: 0;
        }

        .app-card {
          background: #fff;
          border: 1px solid #e8e6df;
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          margin-bottom: 0.85rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          transition: box-shadow 0.15s, border-color 0.15s;
          flex-wrap: wrap;
        }

        .app-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.07);
          border-color: #d1d5db;
        }

        .app-card__meta {
          flex: 1;
          min-width: 200px;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .app-card__top {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .app-card__title {
          font-size: 0.97rem;
          font-weight: 600;
          color: #1a3a5c;
          margin: 0;
        }

        .app-card__bottom {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .app-card__stage {
          font-size: 0.8rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .app-card__stage::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #9ca3af;
          flex-shrink: 0;
        }

        .app-card__date {
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .app-card__actions {
          flex-shrink: 0;
        }

        .continue-btn {
          padding: 0.55rem 1.1rem;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: background 0.15s, transform 0.12s;
          background: linear-gradient(135deg, #f1c96b, #d89b35);
          color: #14202c;
        }

        .continue-btn:hover {
          transform: translateY(-1px);
        }

        .view-btn {
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

        .view-btn:hover {
          background: #f9fafb;
          transform: translateY(-1px);
        }

        .new-app-btn {
          padding: 0.65rem 1.25rem;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 700;
          background: #1a3a5c;
          color: #fff;
          transition: background 0.15s, transform 0.12s;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .new-app-btn:hover {
          background: #153050;
          transform: translateY(-1px);
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          border: 2px dashed #e5e7eb;
          border-radius: 20px;
          background: #fff;
        }

        .empty-state__icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state__title {
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a3a5c;
        }

        .empty-state__body {
          margin: 0 0 1.5rem;
          color: #6b7280;
          font-size: 0.92rem;
          max-width: 28rem;
          margin-left: auto;
          margin-right: auto;
        }

        .loading-state {
          text-align: center;
          padding: 3rem;
          color: #9ca3af;
          font-size: 0.92rem;
        }

        .error-state {
          padding: 1.25rem;
          border-radius: 12px;
          background: #fff5f5;
          border: 1px solid #fecaca;
          color: #991b1b;
          font-size: 0.9rem;
        }
      `}</style>

      <div className="applicant-dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-header__left">
            <p className="dashboard-header__eyebrow">Applicant Portal</p>
            <h1 className="dashboard-header__title">My Applications</h1>
            <p className="dashboard-header__subtitle">
              {loadingApps
                ? "Loading..."
                : `${applications.length} application${applications.length !== 1 ? "s" : ""} on record`}
            </p>
          </div>

          <button
            type="button"
            className="new-app-btn"
            onClick={() => navigate("/portal/apply")}
          >
            + Start New Application
          </button>
        </div>

        {/* Org profile banner */}
        {showOrgBanner && (
          <div className="org-banner">
            <span>⚠</span>
            <span className="org-banner__text">
              <strong>Complete your organisation profile</strong> to speed up applications.{" "}
              <button
                type="button"
                className="org-banner__link"
                onClick={() => navigate("/portal/profile")}
              >
                Set up now →
              </button>
            </span>
            <button
              type="button"
              className="org-banner__dismiss"
              onClick={() => setOrgBannerDismissed(true)}
              aria-label="Dismiss"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        {loadingApps ? (
          <div className="loading-state">Loading your applications…</div>
        ) : appsError ? (
          <div className="error-state">{appsError}</div>
        ) : applications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📋</div>
            <h2 className="empty-state__title">No applications yet</h2>
            <p className="empty-state__body">
              Browse available grant programmes and start your first application. We'll guide
              you through each step of the process.
            </p>
            <button
              type="button"
              className="new-app-btn"
              style={{ display: "inline-block" }}
              onClick={() => navigate("/portal/apply")}
            >
              Browse Grants &amp; Apply
            </button>
          </div>
        ) : (
          <div>
            {applications.map((app) => (
              <div key={app.id} className="app-card">
                <div className="app-card__meta">
                  <div className="app-card__top">
                    {app.programmeCode && <ProgrammeBadge code={app.programmeCode} />}
                    <StatusPill status={app.status} />
                  </div>
                  <p className="app-card__title">{app.projectTitle || app.programmeName || "Untitled Application"}</p>
                  <div className="app-card__bottom">
                    {app.workflowStage && (
                      <span className="app-card__stage">
                        {STAGE_LABELS[app.workflowStage]}
                      </span>
                    )}
                    <span className="app-card__date">
                      Updated {formatDate(app.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="app-card__actions">
                  {app.status === "draft" ? (
                    <button
                      type="button"
                      className="continue-btn"
                      onClick={() => navigate(`/portal/apply/${app.id}`)}
                    >
                      Continue →
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="view-btn"
                      onClick={() => navigate(`/portal/applications/${app.id}`)}
                    >
                      View
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
