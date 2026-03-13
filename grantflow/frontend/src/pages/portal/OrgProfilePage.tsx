import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import { fetchJson } from "../../services/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_TYPES = [
  "NGO",
  "Trust",
  "Registered Society",
  "Section 8 Company",
  "EdTech Non-Profit",
  "Research Institution",
  "University",
  "Farmer Producer Organisation",
  "Panchayat Body",
  "Government Body",
  "Other",
] as const;

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type OrgProfileData = {
  organisationName: string;
  registrationNumber: string;
  organisationType: string;
  state: string;
  address: string;
  annualBudget: string;
  contactPersonName: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
};

const EMPTY_FORM: OrgProfileData = {
  organisationName: "",
  registrationNumber: "",
  organisationType: "",
  state: "",
  address: "",
  annualBudget: "",
  contactPersonName: "",
  contactPhone: "",
  contactEmail: "",
  website: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrgProfilePage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState<OrgProfileData>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!token) return;

    fetchJson<Record<string, any>>("/org-profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => {
        if (!data) return;
        // Map backend field names → frontend form fields
        setForm((prev) => ({
          ...prev,
          organisationName: data.name ?? "",
          registrationNumber: data.registrationNumber ?? "",
          organisationType: data.type ?? "",
          state: data.state ?? "",
          address: data.address ?? "",
          annualBudget: data.annualBudget ?? "",
          contactPersonName: data.contactPerson ?? "",
          contactPhone: data.phone ?? "",
          contactEmail: data.email ?? "",
          website: data.website ?? "",
        }));
      })
      .catch(() => {
        // 404 or empty is fine — means no profile yet
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      // Map frontend form fields → backend DTO field names
      await fetchJson("/org-profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.organisationName,
          registrationNumber: form.registrationNumber || undefined,
          type: form.organisationType || undefined,
          state: form.state || undefined,
          address: form.address || undefined,
          annualBudget: form.annualBudget ? Number(form.annualBudget) : undefined,
          contactPerson: form.contactPersonName || undefined,
          phone: form.contactPhone || undefined,
          email: form.contactEmail || undefined,
          website: form.website || undefined,
        }),
      });

      setSuccessMsg("Organisation profile saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: "2rem", color: "#6b7280", fontSize: "0.92rem" }}>
        Loading profile…
      </div>
    );
  }

  return (
    <>
      <style>{`
        .org-profile-page {
          max-width: 760px;
          margin: 0 auto;
          padding: 2rem;
          font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
        }

        .org-profile-page__eyebrow {
          margin: 0 0 0.35rem;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #185fa5;
        }

        .org-profile-page__title {
          margin: 0 0 0.35rem;
          font-size: 1.6rem;
          font-weight: 700;
          color: #1a3a5c;
          line-height: 1.15;
        }

        .org-profile-page__subtitle {
          margin: 0 0 2rem;
          font-size: 0.9rem;
          color: #6b7280;
        }

        .org-form {
          display: grid;
          gap: 1.1rem;
        }

        .org-form__section {
          margin: 0.5rem 0 0.25rem;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #9ca3af;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e8e6df;
        }

        .org-form__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 600px) {
          .org-form__row { grid-template-columns: 1fr; }
        }

        .org-field {
          display: grid;
          gap: 0.4rem;
        }

        .org-field label {
          font-size: 0.88rem;
          font-weight: 500;
          color: #374151;
        }

        .org-field label span.optional {
          font-weight: 400;
          color: #9ca3af;
          margin-left: 4px;
        }

        .org-field input,
        .org-field select,
        .org-field textarea {
          width: 100%;
          padding: 0.75rem 0.9rem;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          background: #fff;
          color: #1a3a5c;
          font: inherit;
          font-size: 0.92rem;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .org-field input:focus,
        .org-field select:focus,
        .org-field textarea:focus {
          outline: none;
          border-color: #185fa5;
          box-shadow: 0 0 0 3px rgba(24, 95, 165, 0.12);
        }

        .org-field textarea {
          resize: vertical;
          min-height: 90px;
        }

        .org-field select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.9rem center;
          padding-right: 2.2rem;
        }

        .org-form__actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 0.5rem;
          flex-wrap: wrap;
        }

        .org-submit-btn {
          padding: 0.8rem 1.75rem;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          font-size: 0.92rem;
          font-weight: 700;
          background: #1a3a5c;
          color: #fff;
          transition: background 0.15s, transform 0.12s;
          white-space: nowrap;
        }

        .org-submit-btn:hover:not(:disabled) {
          background: #153050;
          transform: translateY(-1px);
        }

        .org-submit-btn:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .org-apply-btn {
          padding: 0.8rem 1.5rem;
          border-radius: 999px;
          border: 1px solid #d1d5db;
          cursor: pointer;
          font-size: 0.92rem;
          font-weight: 600;
          background: #fff;
          color: #374151;
          transition: background 0.15s, transform 0.12s;
        }

        .org-apply-btn:hover {
          background: #f9fafb;
          transform: translateY(-1px);
        }

        .org-success {
          padding: 0.85rem 1.1rem;
          border-radius: 12px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .org-error {
          padding: 0.85rem 1.1rem;
          border-radius: 12px;
          background: #fff5f5;
          border: 1px solid #fecaca;
          color: #991b1b;
          font-size: 0.9rem;
        }
      `}</style>

      <div className="org-profile-page">
        <p className="org-profile-page__eyebrow">Applicant Portal</p>
        <h1 className="org-profile-page__title">Organisation Profile</h1>
        <p className="org-profile-page__subtitle">
          Keep your organisation details up to date. This information is used across all grant applications.
        </p>

        <form className="org-form" onSubmit={handleSubmit}>
          {/* ── Basic Information ── */}
          <div className="org-form__section">Basic Information</div>

          <div className="org-field">
            <label htmlFor="organisationName">
              Organisation Name <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <input
              id="organisationName"
              name="organisationName"
              type="text"
              value={form.organisationName}
              onChange={handleChange}
              placeholder="Greenlight Foundation"
              required
            />
          </div>

          <div className="org-form__row">
            <div className="org-field">
              <label htmlFor="registrationNumber">
                Registration Number <span className="optional">(optional)</span>
              </label>
              <input
                id="registrationNumber"
                name="registrationNumber"
                type="text"
                value={form.registrationNumber}
                onChange={handleChange}
                placeholder="MH/2019/123456"
              />
            </div>

            <div className="org-field">
              <label htmlFor="organisationType">Organisation Type</label>
              <select
                id="organisationType"
                name="organisationType"
                value={form.organisationType}
                onChange={handleChange}
              >
                <option value="">— Select type —</option>
                {ORG_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="org-form__row">
            <div className="org-field">
              <label htmlFor="state">State</label>
              <select
                id="state"
                name="state"
                value={form.state}
                onChange={handleChange}
              >
                <option value="">— Select state —</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="org-field">
              <label htmlFor="annualBudget">
                Annual Budget (INR) <span className="optional">(optional)</span>
              </label>
              <input
                id="annualBudget"
                name="annualBudget"
                type="number"
                min={0}
                value={form.annualBudget}
                onChange={handleChange}
                placeholder="e.g. 5000000"
              />
            </div>
          </div>

          <div className="org-field">
            <label htmlFor="address">
              Address <span className="optional">(optional)</span>
            </label>
            <textarea
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Street, City, State, PIN"
            />
          </div>

          <div className="org-field">
            <label htmlFor="website">
              Website <span className="optional">(optional)</span>
            </label>
            <input
              id="website"
              name="website"
              type="url"
              value={form.website}
              onChange={handleChange}
              placeholder="https://yourorg.org"
            />
          </div>

          {/* ── Contact Person ── */}
          <div className="org-form__section">Contact Person</div>

          <div className="org-form__row">
            <div className="org-field">
              <label htmlFor="contactPersonName">Contact Person Name</label>
              <input
                id="contactPersonName"
                name="contactPersonName"
                type="text"
                value={form.contactPersonName}
                onChange={handleChange}
                placeholder="Priya Sharma"
              />
            </div>

            <div className="org-field">
              <label htmlFor="contactPhone">Contact Phone</label>
              <input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                value={form.contactPhone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="org-field">
            <label htmlFor="contactEmail">Contact Email</label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={handleChange}
              placeholder="contact@yourorg.org"
            />
          </div>

          {/* ── Feedback & Actions ── */}
          {error && <div className="org-error">{error}</div>}
          {successMsg && <div className="org-success">{successMsg}</div>}

          <div className="org-form__actions">
            <button type="submit" className="org-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save profile"}
            </button>

            {successMsg && (
              <button
                type="button"
                className="org-apply-btn"
                onClick={() => navigate("/portal/apply")}
              >
                Go to Apply →
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
