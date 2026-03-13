import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth";
import { fetchJson } from "../../services/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands",
  "Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi",
  "Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
] as const;

const STEP_NAMES = [
  "Select Programme",
  "Organisation",
  "Project",
  "Team",
  "Budget",
  "Documents",
  "Review & Submit",
];

// ── Types ─────────────────────────────────────────────────────────────────────

type GrantProgram = {
  id: string;
  name: string;
  programCode?: string;
  description?: string;
  applicationDeadline?: string;
  maxAmount?: string;
};

type OrgData = {
  name?: string;
  registrationNumber?: string;
  type?: string;
  state?: string;
  address?: string;
  annualBudget?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
};

type TeamMember = {
  name: string;
  designation: string;
  qualification: string;
  experienceYears: string;
};

type BudgetLine = {
  item: string;
  amount: string;
  justification: string;
};

type VaultDocument = {
  id: string;
  fileName: string;
  documentType?: string;
  createdAt?: string;
};

type Errors = Record<string, string>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children, required }: { htmlFor?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ fontSize: "0.82rem", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}
    >
      {children}{required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span style={{ color: "#dc2626", fontSize: "0.82rem", marginTop: "0.25rem", display: "block" }}>{msg}</span>;
}

function inputStyle(hasError?: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "0.85rem 1rem",
    border: `1px solid ${hasError ? "#dc2626" : "#e0ddd7"}`,
    borderRadius: 10,
    background: "#fff",
    color: "#1a3a5c",
    fontSize: "0.92rem",
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      fontSize: "0.72rem",
      color: "#9a8c6e",
      fontWeight: 700,
      margin: "1.25rem 0 0.75rem",
      paddingBottom: "0.5rem",
      borderBottom: "1px solid #e8e6df",
    }}>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value?: string | number }) {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ fontSize: "0.78rem", color: "#9a8c6e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>{label}</div>
      <div style={{ fontSize: "0.94rem", color: "#1a3a5c", fontWeight: 500 }}>{value || <span style={{ color: "#aaa" }}>—</span>}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ApplicationWizardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();

  const grantIdParam = searchParams.get("grantId") ?? "";
  const startStep = grantIdParam ? 1 : 0;

  // Core state
  const [step, setStep] = useState(startStep);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [grantProgramId, setGrantProgramId] = useState(grantIdParam);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  // Step 0 – programme list
  const [programs, setPrograms] = useState<GrantProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  // Step 1 – org
  const [orgData, setOrgData] = useState<OrgData | null>(null);

  // Step 2 – project
  const [projectTitle, setProjectTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [proposedSolution, setProposedSolution] = useState("");
  const [expectedOutcomes, setExpectedOutcomes] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [projectState, setProjectState] = useState("");
  const [projectDistrict, setProjectDistrict] = useState("");
  const [projectDurationMonths, setProjectDurationMonths] = useState("");
  const [beneficiaryCount, setBeneficiaryCount] = useState("");
  const [beneficiaryDescription, setBeneficiaryDescription] = useState("");

  // Step 3 – team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMember, setNewMember] = useState<TeamMember>({ name: "", designation: "", qualification: "", experienceYears: "" });
  const [memberErrors, setMemberErrors] = useState<Errors>({});

  // Step 4 – budget
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [newLine, setNewLine] = useState<BudgetLine>({ item: "", amount: "", justification: "" });
  const [lineErrors, setLineErrors] = useState<Errors>({});

  // Step 5 – documents
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Step 6 – declaration
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // ── Load programs ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 0) return;
    setLoadingPrograms(true);
    fetchJson<GrantProgram[]>("/grant-programs")
      .then(setPrograms)
      .catch(() => {})
      .finally(() => setLoadingPrograms(false));
  }, [step]);

  // ── Load org profile ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    fetchJson<OrgData>("/org-profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(setOrgData)
      .catch(() => {});
  }, [token]);

  // ── Load vault docs ────────────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 5 || !token) return;
    setLoadingDocs(true);
    fetchJson<VaultDocument[]>("/document-vault", { headers: { Authorization: `Bearer ${token}` } })
      .then(setVaultDocs)
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  }, [step, token]);

  // ── Create draft on mount (if grantId provided) ────────────────────────────

  useEffect(() => {
    if (!grantIdParam || !token || applicationId) return;
    fetchJson<{ id: string }>("/applications", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ grantProgramId: grantIdParam, applicationMode: "wizard" }),
    })
      .then((res) => setApplicationId(res.id))
      .catch((err) => setGlobalError(err instanceof Error ? err.message : "Failed to create application draft."));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantIdParam, token]);

  // ── Validation ─────────────────────────────────────────────────────────────

  function validateStep(s: number): Errors {
    const errs: Errors = {};
    if (s === 2) {
      if (!projectTitle.trim()) errs.projectTitle = "Project title is required.";
      if (!problemStatement.trim()) errs.problemStatement = "Problem statement is required.";
      else if (problemStatement.trim().length < 100) errs.problemStatement = "Please provide at least 100 characters.";
      if (!proposedSolution.trim()) errs.proposedSolution = "Proposed solution is required.";
      else if (proposedSolution.trim().length < 100) errs.proposedSolution = "Please provide at least 100 characters.";
      if (!expectedOutcomes.trim()) errs.expectedOutcomes = "Expected outcomes are required.";
      if (!projectLocation.trim()) errs.projectLocation = "Project location is required.";
      if (!projectDistrict.trim()) errs.projectDistrict = "District/City is required.";
      if (!projectDurationMonths || Number(projectDurationMonths) < 1) errs.projectDurationMonths = "Enter a valid duration in months.";
      if (!beneficiaryCount || Number(beneficiaryCount) < 1) errs.beneficiaryCount = "Enter number of beneficiaries.";
      if (!beneficiaryDescription.trim()) errs.beneficiaryDescription = "Beneficiary description is required.";
    }
    if (s === 3) {
      if (teamMembers.length === 0) errs.team = "Add at least one team member.";
    }
    if (s === 4) {
      if (budgetLines.length === 0) errs.budget = "Add at least one budget line.";
    }
    if (s === 6) {
      if (!declarationAccepted) errs.declaration = "You must accept the declaration before submitting.";
    }
    return errs;
  }

  // ── Auto-save ──────────────────────────────────────────────────────────────

  const saveCurrentStep = useCallback(async () => {
    if (!applicationId || !token) return;
    setIsSaving(true);
    const payload: Record<string, unknown> = {
      grantProgramId,
      projectTitle,
      problemStatement,
      proposedSolution,
      expectedOutcomes,
      projectLocation,
      projectState,
      projectDistrict,
      projectDurationMonths: projectDurationMonths ? Number(projectDurationMonths) : undefined,
      beneficiaryCount: beneficiaryCount ? Number(beneficiaryCount) : undefined,
      beneficiaryDescription,
      teamMembers,
      budgetLines: budgetLines.map((l) => ({ ...l, amount: Number(l.amount) })),
      totalBudgetAmount: budgetLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0) || undefined,
      declarationAccepted,
    };
    try {
      await fetchJson(`/applications/${applicationId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
    } catch {
      // non-blocking
    } finally {
      setIsSaving(false);
    }
  }, [applicationId, token, grantProgramId, projectTitle, problemStatement, proposedSolution, expectedOutcomes, projectLocation, projectState, projectDistrict, projectDurationMonths, beneficiaryCount, beneficiaryDescription, teamMembers, budgetLines, declarationAccepted]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  async function handleNext() {
    setGlobalError("");
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    await saveCurrentStep();
    setStep((s) => s + 1);
  }

  function handleBack() {
    setErrors({});
    setStep((s) => Math.max(startStep, s - 1));
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const errs = validateStep(6);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (!applicationId || !token) return;
    setIsSubmitting(true);
    try {
      await saveCurrentStep();
      await fetchJson(`/applications/${applicationId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      navigate(`/portal/applications/${applicationId}`, { state: { submitted: true } });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Step 0: Select Programme ───────────────────────────────────────────────

  async function handleSelectProgram(pid: string) {
    setGrantProgramId(pid);
    setGlobalError("");
    if (!token) return;
    try {
      const res = await fetchJson<{ id: string }>("/applications", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ grantProgramId: pid, applicationMode: "wizard" }),
      });
      setApplicationId(res.id);
      setStep(1);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to create application.");
    }
  }

  // ── Team helpers ───────────────────────────────────────────────────────────

  function addTeamMember() {
    const errs: Errors = {};
    if (!newMember.name.trim()) errs.name = "Name is required.";
    if (!newMember.designation.trim()) errs.designation = "Designation is required.";
    if (Object.keys(errs).length > 0) { setMemberErrors(errs); return; }
    setTeamMembers((prev) => [...prev, newMember]);
    setNewMember({ name: "", designation: "", qualification: "", experienceYears: "" });
    setMemberErrors({});
    setErrors((e) => { const c = { ...e }; delete c.team; return c; });
  }

  function removeMember(i: number) {
    setTeamMembers((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── Budget helpers ─────────────────────────────────────────────────────────

  function addBudgetLine() {
    const errs: Errors = {};
    if (!newLine.item.trim()) errs.item = "Line item is required.";
    if (!newLine.amount || Number(newLine.amount) <= 0) errs.amount = "Enter a valid amount.";
    if (!newLine.justification.trim()) errs.justification = "Justification is required.";
    if (Object.keys(errs).length > 0) { setLineErrors(errs); return; }
    setBudgetLines((prev) => [...prev, newLine]);
    setNewLine({ item: "", amount: "", justification: "" });
    setLineErrors({});
    setErrors((e) => { const c = { ...e }; delete c.budget; return c; });
  }

  function removeLine(i: number) {
    setBudgetLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalBudget = budgetLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  // ── Selected programme name ────────────────────────────────────────────────

  const selectedProgram = programs.find((p) => p.id === grantProgramId);

  // ── Visible steps in stepper ───────────────────────────────────────────────

  const visibleSteps = startStep === 0 ? STEP_NAMES : STEP_NAMES.slice(1);
  const stepperIndex = startStep === 0 ? step : step - 1;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .wizard-page { max-width: 820px; margin: 0 auto; padding: 2rem; font-family: 'DM Sans', 'Helvetica Neue', sans-serif; }
        .wizard-stepper { display: flex; align-items: flex-start; gap: 0; margin-bottom: 2.25rem; overflow-x: auto; padding-bottom: 0.5rem; }
        .wizard-step-item { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 60px; position: relative; }
        .wizard-step-item:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 14px;
          left: calc(50% + 14px);
          right: calc(-50% + 14px);
          height: 2px;
          background: #e8e6df;
          z-index: 0;
        }
        .wizard-step-item.completed:not(:last-child)::after { background: #c4a45a; }
        .wizard-step-dot {
          width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700; z-index: 1; flex-shrink: 0;
          border: 2px solid #e8e6df; background: #fff; color: #9ca3af;
        }
        .wizard-step-item.active .wizard-step-dot { border-color: #c4a45a; background: #c4a45a; color: #fff; }
        .wizard-step-item.completed .wizard-step-dot { border-color: #c4a45a; background: #c4a45a; color: #fff; }
        .wizard-step-label { font-size: 0.7rem; color: #9ca3af; margin-top: 0.35rem; text-align: center; font-weight: 500; white-space: nowrap; }
        .wizard-step-item.active .wizard-step-label { color: #c4a45a; font-weight: 700; }
        .wizard-step-item.completed .wizard-step-label { color: #c4a45a; }
        .wizard-card { background: #fff; border: 1px solid #e8e6df; border-radius: 16px; padding: 2rem; }
        .wizard-title { font-size: 1.35rem; font-weight: 700; color: #1a3a5c; margin: 0 0 0.35rem; }
        .wizard-subtitle { font-size: 0.88rem; color: #6b7280; margin: 0 0 1.5rem; }
        .wizard-field { margin-bottom: 1rem; }
        .wizard-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        @media (max-width: 600px) { .wizard-row { grid-template-columns: 1fr; } }
        .wizard-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid #e8e6df; gap: 1rem; }
        .btn-primary { padding: 0.8rem 1.75rem; border-radius: 999px; border: none; cursor: pointer; font-size: 0.92rem; font-weight: 800; background: linear-gradient(135deg, #f1c96b, #d89b35); color: #14202c; transition: transform 0.12s, box-shadow 0.12s; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(196,164,90,0.35); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { padding: 0.8rem 1.5rem; border-radius: 999px; border: 1px solid #e8e6df; cursor: pointer; font-size: 0.92rem; font-weight: 500; background: #fff; color: #555; transition: background 0.15s; }
        .btn-secondary:hover { background: #f8f7f3; }
        .programme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
        .programme-card { background: #fff; border: 2px solid #e8e6df; border-radius: 16px; padding: 1.5rem; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
        .programme-card:hover { border-color: #c4a45a; box-shadow: 0 4px 16px rgba(196,164,90,0.15); }
        .programme-card.selected { border-color: #c4a45a; box-shadow: 0 4px 16px rgba(196,164,90,0.2); }
        .programme-code { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 0.75rem; }
        .programme-name { font-weight: 700; color: #1a3a5c; font-size: 1rem; margin: 0 0 0.4rem; }
        .programme-desc { font-size: 0.82rem; color: #6b7280; line-height: 1.4; margin: 0 0 0.75rem; }
        .team-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; margin-bottom: 1rem; }
        .team-table th { text-align: left; padding: 0.5rem 0.75rem; color: #9a8c6e; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #e8e6df; }
        .team-table td { padding: 0.65rem 0.75rem; color: #333; border-bottom: 1px solid #f3f2ee; vertical-align: middle; }
        .remove-btn { background: none; border: none; cursor: pointer; color: #dc2626; font-size: 1rem; padding: 0; }
        .add-member-box { background: #f8f7f3; border: 1px dashed #d4cfc6; border-radius: 12px; padding: 1.25rem; margin-top: 0.75rem; }
        .add-member-box .box-title { font-size: 0.8rem; font-weight: 700; color: #9a8c6e; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; }
        .budget-total { background: linear-gradient(135deg, rgba(241,201,107,0.12), rgba(216,155,53,0.12)); border: 1px solid #e8d9a5; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; }
        .budget-total__label { font-size: 0.82rem; color: #9a8c6e; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }
        .budget-total__amount { font-size: 1.4rem; font-weight: 800; color: #1a3a5c; }
        .doc-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border: 1px solid #e8e6df; border-radius: 10px; margin-bottom: 0.6rem; background: #fff; }
        .doc-icon { font-size: 1.2rem; flex-shrink: 0; }
        .doc-name { font-size: 0.9rem; color: #1a3a5c; font-weight: 500; }
        .doc-type { font-size: 0.78rem; color: #9a8c6e; }
        .review-section { margin-bottom: 1.5rem; }
        .review-section__title { font-size: 0.72rem; font-weight: 700; color: #9a8c6e; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e8e6df; }
        .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1.5rem; }
        @media (max-width: 600px) { .review-grid { grid-template-columns: 1fr; } }
        .declaration-box { background: #f8f7f3; border: 1px solid #e8e6df; border-radius: 12px; padding: 1.25rem; margin-top: 1.5rem; display: flex; gap: 0.75rem; align-items: flex-start; cursor: pointer; }
        .declaration-box input { margin-top: 2px; flex-shrink: 0; cursor: pointer; width: 16px; height: 16px; }
        .declaration-text { font-size: 0.88rem; color: #333; line-height: 1.5; }
        .saving-indicator { font-size: 0.78rem; color: #9a8c6e; font-style: italic; }
        .global-error { padding: 0.85rem 1.1rem; border-radius: 12px; background: #fff5f5; border: 1px solid #fecaca; color: #991b1b; font-size: 0.9rem; margin-bottom: 1rem; }
      `}</style>

      <div className="wizard-page">
        {/* Eyebrow */}
        <p style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: "0.72rem", color: "#9a8c6e", fontWeight: 700, margin: "0 0 0.35rem" }}>
          Applicant Portal
        </p>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1a3a5c", margin: "0 0 0.35rem" }}>
          New Grant Application
        </h1>
        <p style={{ fontSize: "0.88rem", color: "#6b7280", margin: "0 0 1.75rem" }}>
          {selectedProgram ? `Applying for: ${selectedProgram.name}` : "Follow the steps to complete your application."}
        </p>

        {/* Progress Stepper */}
        <div className="wizard-stepper">
          {visibleSteps.map((name, i) => {
            const status = i < stepperIndex ? "completed" : i === stepperIndex ? "active" : "upcoming";
            return (
              <div key={name} className={`wizard-step-item ${status}`}>
                <div className="wizard-step-dot">
                  {status === "completed" ? "✓" : i + 1}
                </div>
                <span className="wizard-step-label">{name}</span>
              </div>
            );
          })}
        </div>

        {globalError && <div className="global-error">{globalError}</div>}

        {/* ── Step 0: Select Programme ── */}
        {step === 0 && (
          <div className="wizard-card">
            <h2 className="wizard-title">Select Grant Programme</h2>
            <p className="wizard-subtitle">Choose the grant programme you want to apply for.</p>
            {loadingPrograms ? (
              <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Loading programmes…</p>
            ) : programs.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No programmes available at this time.</p>
            ) : (
              <div className="programme-grid">
                {programs.map((p) => (
                  <div
                    key={p.id}
                    className={`programme-card${grantProgramId === p.id ? " selected" : ""}`}
                    onClick={() => handleSelectProgram(p.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSelectProgram(p.id); }}
                  >
                    <span className="programme-code">{p.programCode ?? "—"}</span>
                    <p className="programme-name">{p.name}</p>
                    {p.description && <p className="programme-desc">{p.description}</p>}
                    {p.maxAmount && (
                      <p style={{ fontSize: "0.82rem", color: "#c4a45a", fontWeight: 700 }}>
                        Up to {formatINR(Number(p.maxAmount))}
                      </p>
                    )}
                    {p.applicationDeadline && (
                      <p style={{ fontSize: "0.78rem", color: "#9ca3af" }}>Deadline: {new Date(p.applicationDeadline).toLocaleDateString("en-IN")}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Organisation ── */}
        {step === 1 && (
          <div className="wizard-card">
            <h2 className="wizard-title">Organisation Details</h2>
            <p className="wizard-subtitle">
              Pre-filled from your organisation profile.{" "}
              <a href="/portal/profile" style={{ color: "#c4a45a", fontWeight: 600, textDecoration: "underline" }}>Edit profile →</a>
            </p>
            {orgData ? (
              <>
                <SectionLabel>Basic Information</SectionLabel>
                <div className="wizard-row">
                  <ReadOnlyField label="Organisation Name" value={orgData.name} />
                  <ReadOnlyField label="Registration Number" value={orgData.registrationNumber} />
                </div>
                <div className="wizard-row">
                  <ReadOnlyField label="Organisation Type" value={orgData.type} />
                  <ReadOnlyField label="State" value={orgData.state} />
                </div>
                <ReadOnlyField label="Address" value={orgData.address} />
                <ReadOnlyField label="Annual Budget (INR)" value={orgData.annualBudget ? Number(orgData.annualBudget).toLocaleString("en-IN") : undefined} />
                <SectionLabel>Contact Person</SectionLabel>
                <div className="wizard-row">
                  <ReadOnlyField label="Contact Person" value={orgData.contactPerson} />
                  <ReadOnlyField label="Phone" value={orgData.phone} />
                </div>
                <ReadOnlyField label="Email" value={orgData.email} />
              </>
            ) : (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "#6b7280" }}>
                <p>No organisation profile found.</p>
                <a href="/portal/profile" style={{ color: "#c4a45a", fontWeight: 700 }}>Set up your profile →</a>
              </div>
            )}
            <div className="wizard-actions">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleNext}>Next: Project Details</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Project ── */}
        {step === 2 && (
          <div className="wizard-card">
            <h2 className="wizard-title">Project Details</h2>
            <p className="wizard-subtitle">Tell us about the project you're seeking funding for.</p>

            <div className="wizard-field">
              <FieldLabel htmlFor="projectTitle" required>Project Title</FieldLabel>
              <input id="projectTitle" style={inputStyle(!!errors.projectTitle)} value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)} placeholder="e.g. Clean Water Initiative for Rural Maharashtra" />
              <FieldError msg={errors.projectTitle} />
            </div>

            <div className="wizard-field">
              <FieldLabel htmlFor="problemStatement" required>Problem Statement</FieldLabel>
              <textarea id="problemStatement" style={{ ...inputStyle(!!errors.problemStatement), minHeight: 120, resize: "vertical" }}
                value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="Describe the problem your project addresses (min 100 characters)…" />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <FieldError msg={errors.problemStatement} />
                <span style={{ fontSize: "0.75rem", color: problemStatement.length < 100 ? "#dc2626" : "#9ca3af" }}>
                  {problemStatement.length}/100
                </span>
              </div>
            </div>

            <div className="wizard-field">
              <FieldLabel htmlFor="proposedSolution" required>Proposed Solution</FieldLabel>
              <textarea id="proposedSolution" style={{ ...inputStyle(!!errors.proposedSolution), minHeight: 120, resize: "vertical" }}
                value={proposedSolution} onChange={(e) => setProposedSolution(e.target.value)}
                placeholder="Describe your proposed solution (min 100 characters)…" />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <FieldError msg={errors.proposedSolution} />
                <span style={{ fontSize: "0.75rem", color: proposedSolution.length < 100 ? "#dc2626" : "#9ca3af" }}>
                  {proposedSolution.length}/100
                </span>
              </div>
            </div>

            <div className="wizard-field">
              <FieldLabel htmlFor="expectedOutcomes" required>Expected Outcomes</FieldLabel>
              <textarea id="expectedOutcomes" style={{ ...inputStyle(!!errors.expectedOutcomes), minHeight: 100, resize: "vertical" }}
                value={expectedOutcomes} onChange={(e) => setExpectedOutcomes(e.target.value)}
                placeholder="List the measurable outcomes you expect from this project…" />
              <FieldError msg={errors.expectedOutcomes} />
            </div>

            <div className="wizard-row">
              <div>
                <FieldLabel htmlFor="projectLocation" required>Project Location</FieldLabel>
                <input id="projectLocation" style={inputStyle(!!errors.projectLocation)} value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)} placeholder="e.g. Nashik District" />
                <FieldError msg={errors.projectLocation} />
              </div>
              <div>
                <FieldLabel htmlFor="projectState">Project State</FieldLabel>
                <select id="projectState" style={{ ...inputStyle(), appearance: "none" }} value={projectState}
                  onChange={(e) => setProjectState(e.target.value)}>
                  <option value="">— Select state —</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="wizard-row">
              <div>
                <FieldLabel htmlFor="projectDistrict" required>Project District / City</FieldLabel>
                <input id="projectDistrict" style={inputStyle(!!errors.projectDistrict)} value={projectDistrict}
                  onChange={(e) => setProjectDistrict(e.target.value)} placeholder="e.g. Nashik" />
                <FieldError msg={errors.projectDistrict} />
              </div>
              <div>
                <FieldLabel htmlFor="projectDurationMonths" required>Duration (months)</FieldLabel>
                <input id="projectDurationMonths" type="number" min={1} style={inputStyle(!!errors.projectDurationMonths)}
                  value={projectDurationMonths} onChange={(e) => setProjectDurationMonths(e.target.value)} placeholder="12" />
                <FieldError msg={errors.projectDurationMonths} />
              </div>
            </div>

            <div className="wizard-row">
              <div>
                <FieldLabel htmlFor="beneficiaryCount" required>Number of Beneficiaries</FieldLabel>
                <input id="beneficiaryCount" type="number" min={1} style={inputStyle(!!errors.beneficiaryCount)}
                  value={beneficiaryCount} onChange={(e) => setBeneficiaryCount(e.target.value)} placeholder="500" />
                <FieldError msg={errors.beneficiaryCount} />
              </div>
            </div>

            <div className="wizard-field">
              <FieldLabel htmlFor="beneficiaryDescription" required>Beneficiary Description</FieldLabel>
              <textarea id="beneficiaryDescription" style={{ ...inputStyle(!!errors.beneficiaryDescription), minHeight: 80, resize: "vertical" }}
                value={beneficiaryDescription} onChange={(e) => setBeneficiaryDescription(e.target.value)}
                placeholder="Describe the target beneficiaries of this project…" />
              <FieldError msg={errors.beneficiaryDescription} />
            </div>

            <div className="wizard-actions">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              {isSaving && <span className="saving-indicator">Saving…</span>}
              <button className="btn-primary" onClick={handleNext}>Next: Team</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Team ── */}
        {step === 3 && (
          <div className="wizard-card">
            <h2 className="wizard-title">Team Members</h2>
            <p className="wizard-subtitle">Add at least one team member. The project lead should be listed first.</p>

            {errors.team && <div className="global-error">{errors.team}</div>}

            {teamMembers.length > 0 && (
              <table className="team-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Designation</th>
                    <th>Qualification</th>
                    <th>Exp (yrs)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td>{m.designation}</td>
                      <td>{m.qualification || "—"}</td>
                      <td>{m.experienceYears || "—"}</td>
                      <td><button className="remove-btn" onClick={() => removeMember(i)} title="Remove">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="add-member-box">
              <div className="box-title">Add Team Member</div>
              <div className="wizard-row">
                <div>
                  <FieldLabel htmlFor="memberName" required>Full Name</FieldLabel>
                  <input id="memberName" style={inputStyle(!!memberErrors.name)} value={newMember.name}
                    onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))} placeholder="Priya Sharma" />
                  <FieldError msg={memberErrors.name} />
                </div>
                <div>
                  <FieldLabel htmlFor="memberDesig" required>Designation</FieldLabel>
                  <input id="memberDesig" style={inputStyle(!!memberErrors.designation)} value={newMember.designation}
                    onChange={(e) => setNewMember((p) => ({ ...p, designation: e.target.value }))} placeholder="Project Lead" />
                  <FieldError msg={memberErrors.designation} />
                </div>
              </div>
              <div className="wizard-row">
                <div>
                  <FieldLabel htmlFor="memberQual">Qualification</FieldLabel>
                  <input id="memberQual" style={inputStyle()} value={newMember.qualification}
                    onChange={(e) => setNewMember((p) => ({ ...p, qualification: e.target.value }))} placeholder="M.Sc. Environmental Science" />
                </div>
                <div>
                  <FieldLabel htmlFor="memberExp">Years of Experience</FieldLabel>
                  <input id="memberExp" type="number" min={0} style={inputStyle()} value={newMember.experienceYears}
                    onChange={(e) => setNewMember((p) => ({ ...p, experienceYears: e.target.value }))} placeholder="8" />
                </div>
              </div>
              <button className="btn-primary" style={{ marginTop: "0.5rem" }} onClick={addTeamMember}>+ Add Member</button>
            </div>

            <div className="wizard-actions">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              {isSaving && <span className="saving-indicator">Saving…</span>}
              <button className="btn-primary" onClick={handleNext}>Next: Budget</button>
            </div>
          </div>
        )}

        {/* ── Step 4: Budget ── */}
        {step === 4 && (
          <div className="wizard-card">
            <h2 className="wizard-title">Budget Breakdown</h2>
            <p className="wizard-subtitle">Add each budget line item. Provide clear justification for each cost.</p>

            {errors.budget && <div className="global-error">{errors.budget}</div>}

            <div className="budget-total">
              <span className="budget-total__label">Total Budget</span>
              <span className="budget-total__amount">{formatINR(totalBudget)}</span>
            </div>

            {budgetLines.length > 0 && (
              <table className="team-table">
                <thead>
                  <tr>
                    <th>Line Item</th>
                    <th>Amount (INR)</th>
                    <th>Justification</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {budgetLines.map((l, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{l.item}</td>
                      <td>{formatINR(Number(l.amount))}</td>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.justification}</td>
                      <td><button className="remove-btn" onClick={() => removeLine(i)} title="Remove">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="add-member-box">
              <div className="box-title">Add Budget Line</div>
              <div className="wizard-row">
                <div>
                  <FieldLabel htmlFor="lineItem" required>Line Item</FieldLabel>
                  <input id="lineItem" style={inputStyle(!!lineErrors.item)} value={newLine.item}
                    onChange={(e) => setNewLine((p) => ({ ...p, item: e.target.value }))} placeholder="e.g. Staff Salaries" />
                  <FieldError msg={lineErrors.item} />
                </div>
                <div>
                  <FieldLabel htmlFor="lineAmount" required>Amount (INR)</FieldLabel>
                  <input id="lineAmount" type="number" min={1} style={inputStyle(!!lineErrors.amount)} value={newLine.amount}
                    onChange={(e) => setNewLine((p) => ({ ...p, amount: e.target.value }))} placeholder="150000" />
                  <FieldError msg={lineErrors.amount} />
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="lineJust" required>Justification</FieldLabel>
                <textarea id="lineJust" style={{ ...inputStyle(!!lineErrors.justification), minHeight: 70, resize: "vertical" }}
                  value={newLine.justification} onChange={(e) => setNewLine((p) => ({ ...p, justification: e.target.value }))}
                  placeholder="Why is this expense necessary?" />
                <FieldError msg={lineErrors.justification} />
              </div>
              <button className="btn-primary" style={{ marginTop: "0.75rem" }} onClick={addBudgetLine}>+ Add Line</button>
            </div>

            <div className="wizard-actions">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              {isSaving && <span className="saving-indicator">Saving…</span>}
              <button className="btn-primary" onClick={handleNext}>Next: Documents</button>
            </div>
          </div>
        )}

        {/* ── Step 5: Documents ── */}
        {step === 5 && (
          <div className="wizard-card">
            <h2 className="wizard-title">Supporting Documents</h2>
            <p className="wizard-subtitle">
              Documents from your{" "}
              <a href="/portal/vault" style={{ color: "#c4a45a", fontWeight: 600, textDecoration: "underline" }}>Document Vault</a>{" "}
              will be automatically attached to your application.
            </p>

            {loadingDocs ? (
              <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Loading documents…</p>
            ) : vaultDocs.length === 0 ? (
              <div style={{ padding: "1.5rem", background: "#fffbeb", borderRadius: 12, border: "1px solid #fcd34d", color: "#78350f", fontSize: "0.9rem" }}>
                <strong>No documents in your vault.</strong> Please{" "}
                <a href="/portal/vault" style={{ color: "#b45309", fontWeight: 600, textDecoration: "underline" }}>upload documents</a>{" "}
                to the Document Vault before submitting your application. Common required documents include registration certificates, audited accounts, and board resolutions.
              </div>
            ) : (
              <>
                <p style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: "1rem" }}>
                  {vaultDocs.length} document{vaultDocs.length !== 1 ? "s" : ""} will be attached to your application.
                </p>
                {vaultDocs.map((doc) => (
                  <div key={doc.id} className="doc-item">
                    <span className="doc-icon">📄</span>
                    <div>
                      <div className="doc-name">{doc.fileName}</div>
                      {doc.documentType && <div className="doc-type">{doc.documentType}</div>}
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#16a34a", fontWeight: 600 }}>✓ Attached</span>
                  </div>
                ))}
              </>
            )}

            <div className="wizard-actions">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleNext}>Next: Review</button>
            </div>
          </div>
        )}

        {/* ── Step 6: Review & Submit ── */}
        {step === 6 && (
          <div className="wizard-card">
            <h2 className="wizard-title">Review & Submit</h2>
            <p className="wizard-subtitle">Please review all the information below before submitting.</p>

            {/* Org */}
            {orgData && (
              <div className="review-section">
                <div className="review-section__title">Organisation</div>
                <div className="review-grid">
                  <ReadOnlyField label="Name" value={orgData.name} />
                  <ReadOnlyField label="Type" value={orgData.type} />
                  <ReadOnlyField label="Registration No." value={orgData.registrationNumber} />
                  <ReadOnlyField label="State" value={orgData.state} />
                </div>
              </div>
            )}

            {/* Project */}
            <div className="review-section">
              <div className="review-section__title">Project</div>
              <ReadOnlyField label="Title" value={projectTitle} />
              <ReadOnlyField label="Problem Statement" value={problemStatement} />
              <ReadOnlyField label="Proposed Solution" value={proposedSolution} />
              <ReadOnlyField label="Expected Outcomes" value={expectedOutcomes} />
              <div className="review-grid">
                <ReadOnlyField label="Location" value={projectLocation} />
                <ReadOnlyField label="State" value={projectState} />
                <ReadOnlyField label="District" value={projectDistrict} />
                <ReadOnlyField label="Duration" value={projectDurationMonths ? `${projectDurationMonths} months` : undefined} />
                <ReadOnlyField label="Beneficiaries" value={beneficiaryCount} />
              </div>
              <ReadOnlyField label="Beneficiary Description" value={beneficiaryDescription} />
            </div>

            {/* Team */}
            <div className="review-section">
              <div className="review-section__title">Team ({teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""})</div>
              {teamMembers.map((m, i) => (
                <div key={i} style={{ padding: "0.5rem 0", borderBottom: "1px solid #f3f2ee", fontSize: "0.9rem" }}>
                  <span style={{ fontWeight: 600, color: "#1a3a5c" }}>{m.name}</span>
                  <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>— {m.designation}</span>
                  {m.experienceYears && <span style={{ color: "#9a8c6e", marginLeft: "0.5rem", fontSize: "0.82rem" }}>{m.experienceYears} yrs exp.</span>}
                </div>
              ))}
            </div>

            {/* Budget */}
            <div className="review-section">
              <div className="review-section__title">Budget</div>
              <table className="team-table">
                <thead><tr><th>Line Item</th><th>Amount</th></tr></thead>
                <tbody>
                  {budgetLines.map((l, i) => (
                    <tr key={i}>
                      <td>{l.item}</td>
                      <td style={{ fontWeight: 600 }}>{formatINR(Number(l.amount))}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 700, color: "#1a3a5c", borderTop: "2px solid #e8e6df" }}>Total</td>
                    <td style={{ fontWeight: 800, color: "#c4a45a", borderTop: "2px solid #e8e6df", fontSize: "1rem" }}>{formatINR(totalBudget)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Declaration */}
            <label className="declaration-box" htmlFor="declaration">
              <input
                id="declaration"
                type="checkbox"
                checked={declarationAccepted}
                onChange={(e) => {
                  setDeclarationAccepted(e.target.checked);
                  if (e.target.checked) setErrors((er) => { const c = { ...er }; delete c.declaration; return c; });
                }}
              />
              <span className="declaration-text">
                I confirm all information provided is accurate and complete. I understand that false information may result in disqualification.
              </span>
            </label>
            <FieldError msg={errors.declaration} />

            {globalError && <div className="global-error" style={{ marginTop: "1rem" }}>{globalError}</div>}

            <div className="wizard-actions">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={isSubmitting || !declarationAccepted}
              >
                {isSubmitting ? "Submitting…" : "Submit Application"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
