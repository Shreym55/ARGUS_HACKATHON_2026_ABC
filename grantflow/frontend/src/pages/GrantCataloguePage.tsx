import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { fetchJson } from '../services/api';

// ── Types ────────────────────────────────────────────────────────────────────

type GrantProgram = {
  id: string;
  name: string;
  programCode: string | null;
  purposeSummary: string | null;
  description: string | null;
  minAmount: string | null;
  maxAmount: string | null;
  projectDurationMin: number | null;
  projectDurationMax: number | null;
  applicationDeadline: string | null;
  eligibilityHighlights: string[] | null;
  availableBudget: string | null;
  isActive: boolean;
};

type EligibilityResult = {
  programmeId: string;
  programmeName: string;
  programCode: string | null;
  result: 'Likely Eligible' | 'Likely Not Eligible';
  reasons: string[];
};

type PersonalisedResponse = {
  hasProfile: boolean;
  orgType?: string;
  results?: EligibilityResult[];
};

// ── Pre-check modal ───────────────────────────────────────────────────────────

const ORG_TYPES = [
  'NGO',
  'Trust',
  'Registered Society',
  'Section 8 Company',
  'EdTech Non-Profit',
  'Research Institution',
  'University',
  'Farmer Producer Organisation',
  'Panchayat Body',
  'Government Body',
  'Other',
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh', 'Delhi', 'Jammu & Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

function EligibilityModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [orgType, setOrgType] = useState('');
  const [district, setDistrict] = useState('');
  const [amount, setAmount] = useState('');
  const [results, setResults] = useState<EligibilityResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCheck() {
    if (!orgType || !district || !amount) {
      setError('Please fill in all fields.');
      return;
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid funding amount.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await fetchJson<EligibilityResult[]>('/grant-programs/eligibility-check', {
        method: 'POST',
        body: JSON.stringify({ orgType, district, amountRequested: amt }),
      });
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 400;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
        }
        .modal-card {
          background: #162431;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 24px;
          padding: 2rem;
          width: min(100%, 560px);
          max-height: 90vh;
          overflow-y: auto;
          color: #f3f1ea;
        }
        .modal-title { margin: 0 0 0.25rem; font-size: 1.25rem; font-weight: 700; }
        .modal-sub { margin: 0 0 1.5rem; color: rgba(243,241,234,0.65); font-size: 0.9rem; }
        .modal-field { display: grid; gap: 0.4rem; margin-bottom: 1rem; }
        .modal-field label { font-size: 0.82rem; color: rgba(243,241,234,0.7); }
        .modal-field select, .modal-field input {
          width: 100%; padding: 0.85rem 1rem; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06); color: #f3f1ea; font: inherit;
        }
        .modal-field select option { background: #162431; }
        .modal-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
        .result-list { display: grid; gap: 0.75rem; margin-top: 1.5rem; }
        .result-item {
          padding: 1rem 1.25rem; border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .result-item.eligible { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3); }
        .result-item.ineligible { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.25); }
        .result-badge {
          display: inline-block; padding: 0.2rem 0.65rem; border-radius: 999px;
          font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem;
        }
        .result-badge.eligible { background: rgba(34,197,94,0.2); color: #4ade80; }
        .result-badge.ineligible { background: rgba(239,68,68,0.2); color: #f87171; }
        .result-name { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem; }
        .result-reasons { margin: 0.5rem 0 0; padding-left: 1.1rem; }
        .result-reasons li { font-size: 0.83rem; color: rgba(243,241,234,0.75); margin-bottom: 0.25rem; }
      `}</style>
      <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-card">
          <p className="eyebrow">Grant Catalogue</p>
          <h2 className="modal-title">Eligibility Pre-Check</h2>
          <p className="modal-sub">
            Answer three quick questions to see which programmes you may qualify for.
            No account required.
          </p>

          {!results ? (
            <>
              <div className="modal-field">
                <label>Organisation Type</label>
                <select value={orgType} onChange={(e) => setOrgType(e.target.value)}>
                  <option value="">Select type…</option>
                  {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="modal-field">
                <label>Project State / District</label>
                <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                  <option value="">Select state…</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="modal-field">
                <label>Funding Amount Requested (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className="modal-actions">
                <button
                  className="primary-button"
                  style={{ flex: 1 }}
                  onClick={handleCheck}
                  disabled={loading}
                >
                  {loading ? 'Checking…' : 'Check Eligibility'}
                </button>
                <button className="secondary-button" onClick={onClose}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ color: 'rgba(243,241,234,0.65)', fontSize: '0.88rem', marginBottom: '0.5rem' }}>
                Results for <strong style={{ color: '#f1c96b' }}>{orgType}</strong> in{' '}
                <strong style={{ color: '#f1c96b' }}>{district}</strong>, requesting{' '}
                <strong style={{ color: '#f1c96b' }}>₹{Number(amount).toLocaleString('en-IN')}</strong>
              </p>

              <div className="result-list">
                {results.map((r) => {
                  const isEligible = r.result === 'Likely Eligible';
                  return (
                    <div key={r.programmeId} className={`result-item ${isEligible ? 'eligible' : 'ineligible'}`}>
                      <span className={`result-badge ${isEligible ? 'eligible' : 'ineligible'}`}>
                        {r.result}
                      </span>
                      <p className="result-name">{r.programmeName}</p>
                      {!isEligible && r.reasons.length > 0 && (
                        <ul className="result-reasons">
                          {r.reasons.map((reason, i) => <li key={i}>{reason}</li>)}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button className="secondary-button" onClick={() => setResults(null)} style={{ flex: 1 }}>
                  Check Again
                </button>
                <button className="secondary-button" onClick={onClose}>Close</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Personalised eligibility banner ──────────────────────────────────────────

function EligibilityBanner({ token }: { token: string }) {
  const [data, setData] = useState<PersonalisedResponse | null>(null);

  useEffect(() => {
    fetchJson<PersonalisedResponse>('/grant-programs/my-eligibility', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setData)
      .catch(() => {/* silently ignore */});
  }, [token]);

  if (!data || !data.hasProfile || !data.results) return null;

  const eligible = data.results.filter((r) => r.result === 'Likely Eligible');
  const ineligible = data.results.filter((r) => r.result === 'Likely Not Eligible');

  return (
    <div style={{
      background: 'rgba(241,201,107,0.08)',
      border: '1px solid rgba(241,201,107,0.25)',
      borderRadius: '16px',
      padding: '1rem 1.25rem',
      marginBottom: '2rem',
      display: 'flex',
      gap: '1rem',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: '220px' }}>
        <p className="eyebrow" style={{ marginBottom: '0.25rem' }}>Your Eligibility</p>
        <p style={{ margin: 0, color: 'rgba(243,241,234,0.85)', fontSize: '0.9rem' }}>
          Based on your saved organisation profile ({' '}
          <strong style={{ color: '#f1c96b' }}>{data.orgType}</strong>):
          {' '}<strong style={{ color: '#4ade80' }}>{eligible.length} programme{eligible.length !== 1 ? 's' : ''}</strong> likely eligible,
          {' '}<strong style={{ color: '#f87171' }}>{ineligible.length}</strong> likely not eligible.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignSelf: 'center' }}>
        {eligible.map((r) => (
          <span key={r.programmeId} style={{
            background: 'rgba(34,197,94,0.15)', color: '#4ade80',
            borderRadius: '999px', padding: '0.25rem 0.75rem', fontSize: '0.8rem', fontWeight: 700,
          }}>
            {r.programCode ?? r.programmeName}
          </span>
        ))}
        {ineligible.map((r) => (
          <span key={r.programmeId} style={{
            background: 'rgba(239,68,68,0.12)', color: '#f87171',
            borderRadius: '999px', padding: '0.25rem 0.75rem', fontSize: '0.8rem', fontWeight: 700,
          }}>
            {r.programCode ?? r.programmeName}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Programme card ────────────────────────────────────────────────────────────

function ProgrammeCard({ programme }: { programme: GrantProgram }) {
  const formatAmount = (val: string | null) =>
    val ? `₹${(Number(val) / 100000).toFixed(0)} L` : '—';

  const formatDuration = (min: number | null, max: number | null) => {
    if (!min && !max) return '—';
    if (min === max) return `${min} months`;
    return `${min ?? '?'}–${max ?? '?'} months`;
  };

  const formatDeadline = (d: string | null) => {
    if (!d) return 'Rolling (no fixed deadline)';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const codeColour: Record<string, string> = {
    CDG: '#60a5fa',
    EIG: '#a78bfa',
    ECAG: '#34d399',
  };
  const colour = programme.programCode ? (codeColour[programme.programCode] ?? '#f1c96b') : '#f1c96b';

  return (
    <div style={{
      background: 'rgba(10,17,24,0.6)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      backdropFilter: 'blur(12px)',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = colour + '55')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
    >
      {/* Header */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        {programme.programCode && (
          <span style={{
            background: colour + '22', color: colour,
            borderRadius: '8px', padding: '0.3rem 0.65rem',
            fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.06em',
            flexShrink: 0, marginTop: '2px',
          }}>
            {programme.programCode}
          </span>
        )}
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.3, color: '#f3f1ea' }}>
          {programme.name}
        </h2>
      </div>

      {/* Purpose */}
      {programme.purposeSummary && (
        <p style={{ margin: 0, color: 'rgba(243,241,234,0.75)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {programme.purposeSummary}
        </p>
      )}

      {/* Key facts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {[
          { label: 'Funding Range', value: `${formatAmount(programme.minAmount)} – ${formatAmount(programme.maxAmount)}` },
          { label: 'Project Duration', value: formatDuration(programme.projectDurationMin, programme.projectDurationMax) },
          { label: 'Application Deadline', value: formatDeadline(programme.applicationDeadline) },
          { label: 'Available Budget', value: programme.availableBudget ? `₹${(Number(programme.availableBudget) / 10000000).toFixed(1)} Cr` : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.65rem 0.85rem',
          }}>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(243,241,234,0.5)', marginBottom: '0.2rem' }}>{label}</p>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#f3f1ea' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Eligibility highlights */}
      {programme.eligibilityHighlights && programme.eligibilityHighlights.length > 0 && (
        <div>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'rgba(243,241,234,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Eligibility Highlights
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.3rem' }}>
            {programme.eligibilityHighlights.map((h, i) => (
              <li key={i} style={{ fontSize: '0.85rem', color: 'rgba(243,241,234,0.78)' }}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
        <Link
          to={`/grants/${programme.id}`}
          style={{
            flex: 1, textAlign: 'center', padding: '0.75rem',
            borderRadius: '10px', background: colour + '22', color: colour,
            textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
            border: `1px solid ${colour}44`,
            transition: 'background 0.15s',
          }}
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GrantCataloguePage() {
  const { token, user, isReady } = useAuth();
  const navigate = useNavigate();
  const [programmes, setProgrammes] = useState<GrantProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchJson<GrantProgram[]>('/grant-programs')
      .then(setProgrammes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load programmes.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <style>{`
        .catalogue-page {
          min-height: 100vh;
          color: #f3f1ea;
        }
        .catalogue-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(10,17,24,0.5);
          backdrop-filter: blur(12px);
          position: sticky; top: 0; z-index: 100;
        }
        .catalogue-brand {
          display: flex; align-items: center; gap: 8px;
          font-size: 1rem; font-weight: 700; color: #f3f1ea; text-decoration: none;
        }
        .catalogue-brand-mark {
          width: 26px; height: 26px; border-radius: 6px;
          background: linear-gradient(135deg, #f1c96b, #d89b35);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
        }
        .catalogue-nav-actions { display: flex; gap: 0.75rem; align-items: center; }
        .catalogue-content {
          max-width: 1100px;
          margin: 0 auto;
          padding: 3rem 1.5rem;
        }
        .catalogue-hero { margin-bottom: 2.5rem; }
        .catalogue-hero h1 {
          margin: 0.5rem 0 1rem;
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1.1;
        }
        .catalogue-hero p {
          margin: 0;
          color: rgba(243,241,234,0.72);
          max-width: 52ch;
          font-size: 1rem;
          line-height: 1.65;
        }
        .catalogue-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.25rem;
        }
        @media (max-width: 700px) {
          .catalogue-topbar { padding: 0.75rem 1rem; }
          .catalogue-content { padding: 2rem 1rem; }
        }
      `}</style>

      <div className="catalogue-page">
        {/* Top bar */}
        <header className="catalogue-topbar">
          <a href="/grants" className="catalogue-brand">
            <div className="catalogue-brand-mark">◈</div>
            GrantFlow
          </a>
          <div className="catalogue-nav-actions">
            {isReady && user ? (
              <>
                <span style={{ fontSize: '0.85rem', color: 'rgba(243,241,234,0.65)' }}>
                  {user.fullName}
                </span>
                <button className="secondary-button" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </button>
              </>
            ) : (
              <button className="primary-button" onClick={() => navigate('/login')}>
                Sign In
              </button>
            )}
          </div>
        </header>

        <div className="catalogue-content">
          {/* Hero */}
          <div className="catalogue-hero">
            <p className="eyebrow">Grant Programmes</p>
            <h1>Find the right grant<br />for your organisation.</h1>
            <p>
              Argusoft Foundation offers three active grant programmes. Browse the listings below,
              check your eligibility in under a minute, and apply directly through the portal.
            </p>
          </div>

          {/* CTA — eligibility pre-check */}
          <div style={{
            display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap', alignItems: 'center',
          }}>
            <button className="primary-button" onClick={() => setShowModal(true)}>
              Check My Eligibility (No Login Required)
            </button>
            {!user && (
              <span style={{ fontSize: '0.85rem', color: 'rgba(243,241,234,0.55)' }}>
                or <a href="/login" style={{ color: '#f1c96b' }}>sign in</a> for a personalised eligibility view.
              </span>
            )}
          </div>

          {/* Personalised banner (logged-in applicants) */}
          {token && <EligibilityBanner token={token} />}

          {/* Programme listing */}
          {loading && (
            <p style={{ color: 'rgba(243,241,234,0.55)', textAlign: 'center', padding: '3rem 0' }}>
              Loading programmes…
            </p>
          )}
          {error && <p className="form-error">{error}</p>}
          {!loading && !error && (
            <div className="catalogue-grid">
              {programmes.map((p) => <ProgrammeCard key={p.id} programme={p} />)}
            </div>
          )}
        </div>
      </div>

      {showModal && <EligibilityModal onClose={() => setShowModal(false)} />}
    </>
  );
}
